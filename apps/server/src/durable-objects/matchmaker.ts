import type { DurableObjectState } from "cloudflare:workers";
import { desc, eq, or } from "drizzle-orm";

import { db } from "@agentpit-gg/db";
import { arenaMatch } from "@agentpit-gg/db/schema";

import { sendWebhookWithRetries } from "../api/webhooks";

type QueueEntry = {
  agentId: string;
  templateId: string;
  webhookUrl: string;
  joinedAt: number;
};

type JoinPayload = {
  agentId: string;
  templateId: string;
  webhookUrl: string;
};

type LeavePayload = {
  agentId: string;
};

export class Matchmaker {
  constructor(private readonly state: DurableObjectState, private readonly env: Env) {
    void this.env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/join":
        return this.joinQueue(request);
      case "/leave":
        return this.leaveQueue(request);
      default:
        return new Response("Not found", { status: 404 });
    }
  }

  async alarm(): Promise<void> {
    const queue = await this.loadQueue();
    const now = Date.now();
    const timeoutMs = 5 * 60 * 1000;

    const expired = queue.filter((entry) => now - entry.joinedAt >= timeoutMs);
    const remaining = queue.filter((entry) => now - entry.joinedAt < timeoutMs);

    for (const entry of expired) {
      await sendWebhookWithRetries({
        agentId: entry.agentId,
        url: entry.webhookUrl,
        eventType: "queue_timeout",
        payload: {
          agentId: entry.agentId,
          templateId: entry.templateId,
        },
      });
    }

    await this.saveQueue(remaining);
    await this.scheduleQueueAlarm(remaining);
  }

  private async joinQueue(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const payload = (await request.json()) as JoinPayload;
    if (!payload.agentId || !payload.templateId || !payload.webhookUrl) {
      return new Response("Invalid payload", { status: 400 });
    }

    const queue = await this.loadQueue();
    const filteredQueue = queue.filter((entry) => entry.agentId !== payload.agentId);

    filteredQueue.push({
      agentId: payload.agentId,
      templateId: payload.templateId,
      webhookUrl: payload.webhookUrl,
      joinedAt: Date.now(),
    });

    if (filteredQueue.length < 2) {
      await this.saveQueue(filteredQueue);
      await this.scheduleQueueAlarm(filteredQueue);
      return new Response(JSON.stringify({ status: "queued" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const [agentA, ...remaining] = filteredQueue;

    if (!agentA || remaining.length === 0) {
      await this.saveQueue(remaining);
      return new Response(JSON.stringify({ status: "queued" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const opponentIndex = await this.findOpponentIndex(agentA, remaining);
    const agentB = remaining.splice(opponentIndex, 1)[0];

    if (!agentB) {
      await this.saveQueue(remaining);
      return new Response(JSON.stringify({ status: "queued" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const matchId = crypto.randomUUID();
    await db.insert(arenaMatch).values({
      id: matchId,
      agentAId: agentA.agentId,
      agentBId: agentB.agentId,
      templateAId: agentA.templateId,
      templateBId: agentB.templateId,
      state: "waiting",
    });

    const sessionId = this.env.GAME_SESSION.idFromName(matchId);
    const session = this.env.GAME_SESSION.get(sessionId);

    const initResponse = await session.fetch("https://game-session/initialize", {
      method: "POST",
      body: JSON.stringify({
        matchId,
        agentAId: agentA.agentId,
        agentBId: agentB.agentId,
        templateAId: agentA.templateId,
        templateBId: agentB.templateId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!initResponse.ok) {
      return new Response("Failed to initialize match", { status: 500 });
    }

    await db
      .update(arenaMatch)
      .set({ state: "in_progress" })
      .where(eq(arenaMatch.id, matchId));

    await this.saveQueue(remaining);
    await this.scheduleQueueAlarm(remaining);

    await Promise.all([
      sendWebhookWithRetries({
        agentId: agentA.agentId,
        url: agentA.webhookUrl,
        eventType: "match_start",
        payload: {
          matchId,
          opponentAgentId: agentB.agentId,
          templateId: agentA.templateId,
        },
      }),
      sendWebhookWithRetries({
        agentId: agentB.agentId,
        url: agentB.webhookUrl,
        eventType: "match_start",
        payload: {
          matchId,
          opponentAgentId: agentA.agentId,
          templateId: agentB.templateId,
        },
      }),
    ]);

    return new Response(JSON.stringify({ status: "matched", matchId }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async leaveQueue(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const payload = (await request.json()) as LeavePayload;
    if (!payload.agentId) {
      return new Response("Invalid payload", { status: 400 });
    }

    const queue = await this.loadQueue();
    const nextQueue = queue.filter((entry) => entry.agentId !== payload.agentId);

    if (nextQueue.length === queue.length) {
      return new Response("Not found", { status: 404 });
    }

    await this.saveQueue(nextQueue);
    await this.scheduleQueueAlarm(nextQueue);

    return new Response(JSON.stringify({ status: "left" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async loadQueue(): Promise<QueueEntry[]> {
    return (await this.state.storage.get<QueueEntry[]>("queue")) ?? [];
  }

  private async saveQueue(queue: QueueEntry[]): Promise<void> {
    await this.state.storage.put("queue", queue);
  }

  private async findOpponentIndex(
    agentA: QueueEntry,
    candidates: QueueEntry[],
  ): Promise<number> {
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      if (!candidate) {
        continue;
      }

      const shouldAvoid = await this.isRecentOpponent(agentA.agentId, candidate.agentId);
      if (!shouldAvoid) {
        return index;
      }
    }

    return 0;
  }

  private async isRecentOpponent(agentAId: string, agentBId: string): Promise<boolean> {
    const since = Date.now() - 30 * 60 * 1000;

    const [recentA, recentB] = await Promise.all([
      db
        .select({
          agentAId: arenaMatch.agentAId,
          agentBId: arenaMatch.agentBId,
          createdAt: arenaMatch.createdAt,
        })
        .from(arenaMatch)
        .where(or(eq(arenaMatch.agentAId, agentAId), eq(arenaMatch.agentBId, agentAId)))
        .orderBy(desc(arenaMatch.createdAt))
        .limit(3),
      db
        .select({
          agentAId: arenaMatch.agentAId,
          agentBId: arenaMatch.agentBId,
          createdAt: arenaMatch.createdAt,
        })
        .from(arenaMatch)
        .where(or(eq(arenaMatch.agentAId, agentBId), eq(arenaMatch.agentBId, agentBId)))
        .orderBy(desc(arenaMatch.createdAt))
        .limit(3),
    ]);

    const isOpponentInWindow = (matches: typeof recentA) =>
      matches.some((match) => {
        if (!match.createdAt || match.createdAt < since) {
          return false;
        }

        return (
          (match.agentAId === agentAId && match.agentBId === agentBId) ||
          (match.agentAId === agentBId && match.agentBId === agentAId)
        );
      });

    return isOpponentInWindow(recentA) || isOpponentInWindow(recentB);
  }

  private async scheduleQueueAlarm(queue: QueueEntry[]): Promise<void> {
    if (queue.length === 0) {
      await this.state.storage.deleteAlarm();
      return;
    }

    const timeoutMs = 5 * 60 * 1000;
    const nextExpiry = Math.min(...queue.map((entry) => entry.joinedAt + timeoutMs));
    await this.state.storage.setAlarm(nextExpiry);
  }
}
