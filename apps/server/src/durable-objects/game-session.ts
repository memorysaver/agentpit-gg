import type { DurableObjectState } from "cloudflare:workers";
import { eq } from "drizzle-orm";

import { db } from "@agentpit-gg/db";
import { arenaAgent, arenaMatch, arenaTemplate } from "@agentpit-gg/db/schema";

import {
  applyPartyActions,
  createInitialStats,
  createPartyFromTemplate,
  deserializeInternalState,
  isPartyDefeated,
  serializeGameState,
  serializeSpectatorState,
  serializeInternalState,
  updateMatchState,
  type InternalGameState,
  type StoredGameState,
} from "../game";
import { sendWebhookWithRetries } from "../api/webhooks";

type InitializePayload = {
  matchId: string;
  agentAId: string;
  agentBId: string;
  templateAId: string;
  templateBId: string;
};

type ActionsPayload = {
  actions: {
    characterId: string;
    actionType: "attack" | "cast_spell" | "defend" | "use_item" | "inspect";
    targetId?: string;
  }[];
  reasoning?: string;
};

export class GameSession {
  constructor(private readonly state: DurableObjectState, private readonly env: Env) {
    void this.env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/spectate":
        return this.handleSpectator(request);
      case "/initialize":
        return this.initialize(request);
      case "/state":
        return this.getState(request);
      case "/actions":
        return this.submitActions(request);
      case "/forfeit":
        return this.forfeit(request);
      default:
        return new Response("Not found", { status: 404 });
    }
  }

  async alarm(): Promise<void> {
    const state = await this.loadState();
    if (!state || state.state === "completed") {
      return;
    }

    if (state.turnExpiresAt && Date.now() < state.turnExpiresAt) {
      await this.scheduleTurnTimeout(state);
      return;
    }

    state.log.push({
      turn: state.round,
      message: "Turn timed out. Default Defend actions applied.",
    });

    applyPartyActions(state, state.activePartyId, []);
    updateMatchState(state);

    if (state.state === "completed") {
      await this.recordMatchCompletion(state);
      await this.state.storage.put("state", serializeInternalState(state));
      await this.broadcastState(state);
      return;
    }

    state.activePartyId = state.parties.find((party) => party.id !== state.activePartyId)?.id ?? state.activePartyId;
    state.round += 1;
    await this.scheduleTurnTimeout(state);
    await this.state.storage.put("state", serializeInternalState(state));

    await this.notifyYourTurn(state);
    await this.broadcastState(state);
  }

  private async initialize(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const payload = (await request.json()) as InitializePayload;
    const templateA = await db.query.arenaTemplate.findFirst({
      where: eq(arenaTemplate.id, payload.templateAId),
    });
    const templateB = await db.query.arenaTemplate.findFirst({
      where: eq(arenaTemplate.id, payload.templateBId),
    });

    if (!templateA || !templateB) {
      return new Response("Template not found", { status: 400 });
    }

    const partyAId = `${payload.matchId}:A`;
    const partyBId = `${payload.matchId}:B`;

    const partyA = {
      ...createPartyFromTemplate(JSON.parse(templateA.definitionJson), {
        partyId: partyAId,
        characterIdPrefix: `${partyAId}:`,
      }),
      agentId: payload.agentAId,
    };

    const partyB = {
      ...createPartyFromTemplate(JSON.parse(templateB.definitionJson), {
        partyId: partyBId,
        characterIdPrefix: `${partyBId}:`,
      }),
      agentId: payload.agentBId,
    };

    const seedArray = new Uint32Array(1);
    crypto.getRandomValues(seedArray);
    const rngSeed = seedArray[0] ?? 1;
    const activePartyId = rngSeed % 2 === 0 ? partyAId : partyBId;

    const state: InternalGameState = {
      matchId: payload.matchId,
      state: "in_progress",
      round: 1,
      activePartyId,
      rngSeed,
      turnExpiresAt: null,
      parties: [partyA, partyB],
      defending: new Set<string>(),
      inspectedByParty: {
        [partyAId]: new Set<string>(),
        [partyBId]: new Set<string>(),
      },
      log: [
        {
          turn: 1,
          message: "Match started.",
        },
      ],
      stats: createInitialStats(),
      partyByAgent: {
        [payload.agentAId]: partyAId,
        [payload.agentBId]: partyBId,
      },
      lastReasoningByParty: {
        [partyAId]: null,
        [partyBId]: null,
      },
    };

    await this.scheduleTurnTimeout(state);
    await this.state.storage.put("state", serializeInternalState(state));
    await this.notifyYourTurn(state);
    await this.broadcastState(state);

    return new Response(JSON.stringify({ status: "initialized" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async getState(request: Request): Promise<Response> {
    const agentId = request.headers.get("X-Agent-Id");
    if (!agentId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const state = await this.loadState();
    if (!state) {
      return new Response("Match not found", { status: 404 });
    }

    const partyId = state.partyByAgent[agentId];
    if (!partyId) {
      return new Response("Forbidden", { status: 403 });
    }

    return new Response(JSON.stringify(serializeGameState(state, partyId)), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async submitActions(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const agentId = request.headers.get("X-Agent-Id");
    if (!agentId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const state = await this.loadState();
    if (!state) {
      return new Response("Match not found", { status: 404 });
    }

    const partyId = state.partyByAgent[agentId];
    if (!partyId) {
      return new Response("Forbidden", { status: 403 });
    }

    if (state.activePartyId !== partyId) {
      return new Response("Not your turn", { status: 409 });
    }

    const payload = (await request.json()) as ActionsPayload;

    const validationError = this.validateActions(state, partyId, payload.actions);
    if (validationError) {
      return new Response(validationError, { status: 400 });
    }

    state.lastReasoningByParty[partyId] = payload.reasoning ?? null;

    applyPartyActions(state, partyId, payload.actions);
    updateMatchState(state);

    if (state.state === "completed") {
      await this.recordMatchCompletion(state);
    } else {
      state.activePartyId = state.parties.find((party) => party.id !== partyId)?.id ?? partyId;
      state.round += 1;
      await this.scheduleTurnTimeout(state);
      await this.notifyYourTurn(state);
    }

    await this.state.storage.put("state", serializeInternalState(state));
    await this.broadcastState(state);

    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async forfeit(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const agentId = request.headers.get("X-Agent-Id");
    if (!agentId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const state = await this.loadState();
    if (!state) {
      return new Response("Match not found", { status: 404 });
    }

    const partyId = state.partyByAgent[agentId];
    if (!partyId) {
      return new Response("Forbidden", { status: 403 });
    }

    for (const party of state.parties) {
      if (party.id === partyId) {
        for (const character of party.characters) {
          character.defeated = true;
          character.stats.currentHp = 0;
        }
      }
    }

    updateMatchState(state);
    await this.recordMatchCompletion(state);

    await this.state.storage.put("state", serializeInternalState(state));
    await this.broadcastState(state);

    return new Response(JSON.stringify({ status: "forfeited" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async loadState(): Promise<InternalGameState | null> {
    const stored = await this.state.storage.get<StoredGameState>("state");
    return stored ? deserializeInternalState(stored) : null;
  }

  private async handleSpectator(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.state.acceptWebSocket(server);

    const state = await this.loadState();
    if (state) {
      const payload = {
        type: "state",
        state: serializeSpectatorState(state),
        log: state.log,
        stats: state.stats,
        reasoningByParty: state.lastReasoningByParty,
      };
      server.send(JSON.stringify(payload));
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async broadcastState(state: InternalGameState): Promise<void> {
    const sockets = this.state.getWebSockets();
    if (sockets.length === 0) {
      return;
    }

    const payload = {
      type: "state",
      state: serializeSpectatorState(state),
      log: state.log,
      stats: state.stats,
      reasoningByParty: state.lastReasoningByParty,
    };
    const message = JSON.stringify(payload);

    for (const socket of sockets) {
      socket.send(message);
    }
  }

  private validateActions(
    state: InternalGameState,
    partyId: string,
    actions: ActionsPayload["actions"],
  ): string | null {
    const party = state.parties.find((member) => member.id === partyId);
    if (!party) {
      return "Invalid party";
    }

    const enemyParty = state.parties.find((member) => member.id !== partyId);
    if (!enemyParty) {
      return "Invalid enemy party";
    }

    for (const action of actions) {
      const actor = party.characters.find((character) => character.id === action.characterId);
      if (!actor) {
        return "Invalid character";
      }

      if (actor.defeated) {
        return "Defeated character cannot act";
      }

      if (action.actionType === "cast_spell") {
        const slotLevel = 1;
        const slots = actor.spellSlots[slotLevel] ?? 0;
        if (slots <= 0) {
          return "No spell slots available";
        }
      }

      if (action.targetId) {
        const targetInParty = party.characters.some(
          (character) => character.id === action.targetId,
        );
        const targetInEnemy = enemyParty.characters.some(
          (character) => character.id === action.targetId,
        );

        if (action.actionType === "use_item" && !targetInParty) {
          return "Invalid item target";
        }

        if (
          (action.actionType === "attack" ||
            action.actionType === "cast_spell" ||
            action.actionType === "inspect") &&
          !targetInEnemy
        ) {
          return "Invalid target";
        }
      }
    }

    return null;
  }

  private async recordMatchCompletion(state: InternalGameState): Promise<void> {
    const [partyA, partyB] = state.parties;
    if (!partyA || !partyB) {
      return;
    }

    const winnerParty =
      isPartyDefeated(state, partyA.id) && !isPartyDefeated(state, partyB.id)
        ? partyB
        : isPartyDefeated(state, partyB.id) && !isPartyDefeated(state, partyA.id)
          ? partyA
          : null;

    await db
      .update(arenaMatch)
      .set({
        state: "completed",
        winnerAgentId: winnerParty?.agentId ?? null,
        statsJson: JSON.stringify(state.stats),
        logJson: JSON.stringify(state.log),
        completedAt: new Date(),
      })
      .where(eq(arenaMatch.id, state.matchId));

    await this.state.storage.deleteAlarm();

    await this.notifyMatchEnd(state);
  }

  private async getWebhookUrl(agentId: string): Promise<string | null> {
    const agent = await db.query.arenaAgent.findFirst({
      where: eq(arenaAgent.id, agentId),
    });
    return agent?.webhookUrl ?? null;
  }

  private async notifyYourTurn(state: InternalGameState): Promise<void> {
    const activeParty = state.parties.find((party) => party.id === state.activePartyId);
    if (!activeParty) {
      return;
    }

    const webhookUrl = await this.getWebhookUrl(activeParty.agentId);
    if (!webhookUrl) {
      return;
    }

    await sendWebhookWithRetries({
      agentId: activeParty.agentId,
      url: webhookUrl,
      eventType: "your_turn",
      payload: {
        matchId: state.matchId,
        state: serializeGameState(state, activeParty.id),
      },
    });
  }

  private async notifyMatchEnd(state: InternalGameState): Promise<void> {
    const payload = {
      matchId: state.matchId,
      winnerAgentId: state.parties.find((party) =>
        isPartyDefeated(state, party.id),
      )
        ? state.parties.find((party) => !isPartyDefeated(state, party.id))?.agentId ?? null
        : null,
      stats: state.stats,
    };

    await Promise.all(
      state.parties.map(async (party) => {
        const webhookUrl = await this.getWebhookUrl(party.agentId);
        if (!webhookUrl) {
          return;
        }
        await sendWebhookWithRetries({
          agentId: party.agentId,
          url: webhookUrl,
          eventType: "match_end",
          payload,
        });
      }),
    );
  }

  private async scheduleTurnTimeout(state: InternalGameState): Promise<void> {
    const timeoutMs = 120_000;
    state.turnExpiresAt = Date.now() + timeoutMs;
    await this.state.storage.setAlarm(state.turnExpiresAt);
  }
}
