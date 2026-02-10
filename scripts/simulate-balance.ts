import { mkdir, writeFile } from "node:fs/promises";

import type { PartyTemplateDefinition } from "@agentpit-gg/api/arena";
import { defaultTemplates } from "@agentpit-gg/api/arena";

import { applyPartyActions, createPartyFromTemplate, createInitialStats, updateMatchState } from "../apps/server/src/game";
import type { InternalGameState, InternalParty } from "../apps/server/src/game/state";

type MatchResult = {
  winnerTemplateId: string | null;
  turns: number;
  stalemate: boolean;
};

const maxTurns = Number(process.env.SIM_MAX_TURNS ?? "60");
const matchesPerPair = Number(process.env.SIM_MATCHES_PER_PAIR ?? "1000");

const makeParty = (template: PartyTemplateDefinition, matchId: string, suffix: "A" | "B"): InternalParty => {
  const partyId = `${matchId}:${suffix}`;
  return {
    ...createPartyFromTemplate(template, {
      partyId,
      characterIdPrefix: `${partyId}:`,
    }),
    agentId: `${template.id}-${suffix}`,
  };
};

const randomChoice = <T>(items: T[]): T | null => {
  if (items.length === 0) {
    return null;
  }
  const index = Math.floor(Math.random() * items.length);
  return items[index] ?? null;
};

const simulateMatch = (
  templateA: PartyTemplateDefinition,
  templateB: PartyTemplateDefinition,
  matchIndex: number,
): MatchResult => {
  const matchId = `sim-${templateA.id}-${templateB.id}-${matchIndex}`;
  const partyA = makeParty(templateA, matchId, "A");
  const partyB = makeParty(templateB, matchId, "B");

  const state: InternalGameState = {
    matchId,
    state: "in_progress",
    round: 1,
    activePartyId: partyA.id,
    rngSeed: Math.floor(Math.random() * 100_000),
    turnExpiresAt: null,
    parties: [partyA, partyB],
    defending: new Set(),
    inspectedByParty: {
      [partyA.id]: new Set(),
      [partyB.id]: new Set(),
    },
    log: [],
    stats: createInitialStats(),
    partyByAgent: {
      [partyA.agentId]: partyA.id,
      [partyB.agentId]: partyB.id,
    },
    lastReasoningByParty: {
      [partyA.id]: null,
      [partyB.id]: null,
    },
  };

  let turns = 0;
  while (turns < maxTurns && state.state !== "completed") {
    const activeParty = state.parties.find((party) => party.id === state.activePartyId);
    const enemyParty = state.parties.find((party) => party.id !== state.activePartyId);

    if (!activeParty || !enemyParty) {
      break;
    }

    const enemyTargets = enemyParty.characters.filter((character) => !character.defeated);
    const target = randomChoice(enemyTargets);

    const actions = activeParty.characters
      .filter((character) => !character.defeated)
      .map((character) => ({
        characterId: character.id,
        actionType: "attack" as const,
        targetId: target?.id,
      }));

    applyPartyActions(state, activeParty.id, actions);
    updateMatchState(state);

    if (state.state !== "completed") {
      state.activePartyId = enemyParty.id;
      state.round += 1;
    }

    turns += 1;
  }

  const winnerParty = state.parties.find((party) =>
    party.characters.every((character) => character.defeated),
  )
    ? state.parties.find((party) =>
        party.characters.some((character) => !character.defeated),
      )
    : null;

  return {
    winnerTemplateId: winnerParty?.id.includes(":A") ? templateA.id : winnerParty?.id.includes(":B") ? templateB.id : null,
    turns,
    stalemate: state.state !== "completed",
  };
};

const run = async () => {
  const summary: Record<
    string,
    {
      wins: number;
      losses: number;
      totalTurns: number;
      stalemates: number;
    }
  > = {};

  for (const template of defaultTemplates) {
    summary[template.id] = {
      wins: 0,
      losses: 0,
      totalTurns: 0,
      stalemates: 0,
    };
  }

  for (const templateA of defaultTemplates) {
    for (const templateB of defaultTemplates) {
      if (templateA.id === templateB.id) {
        continue;
      }

      for (let index = 0; index < matchesPerPair; index += 1) {
        const result = simulateMatch(templateA, templateB, index);

        summary[templateA.id].totalTurns += result.turns;
        summary[templateB.id].totalTurns += result.turns;

        if (result.stalemate) {
          summary[templateA.id].stalemates += 1;
          summary[templateB.id].stalemates += 1;
        }

        if (result.winnerTemplateId === templateA.id) {
          summary[templateA.id].wins += 1;
          summary[templateB.id].losses += 1;
        } else if (result.winnerTemplateId === templateB.id) {
          summary[templateB.id].wins += 1;
          summary[templateA.id].losses += 1;
        }
      }
    }
  }

  const report = Object.entries(summary).map(([templateId, stats]) => ({
    templateId,
    wins: stats.wins,
    losses: stats.losses,
    winRate: stats.wins + stats.losses > 0 ? stats.wins / (stats.wins + stats.losses) : 0,
    averageTurns:
      stats.wins + stats.losses > 0 ? stats.totalTurns / (stats.wins + stats.losses) : 0,
    stalemateRate:
      stats.wins + stats.losses > 0 ? stats.stalemates / (stats.wins + stats.losses) : 0,
  }));

  await mkdir("reports", { recursive: true });
  await writeFile("reports/balance-report.json", JSON.stringify(report, null, 2));
  console.log("Balance report written to reports/balance-report.json");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
