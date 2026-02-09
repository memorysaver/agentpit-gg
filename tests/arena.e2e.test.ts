import { expect, test } from "bun:test";
import type { AppRouter } from "@agentpit-gg/api/routers/index";
import type { RouterClient } from "@orpc/server";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

const baseUrl = process.env.VITE_SERVER_URL;
const agentAKey = process.env.E2E_AGENT_A_KEY;
const agentBKey = process.env.E2E_AGENT_B_KEY;
const agentAId = process.env.E2E_AGENT_A_ID;
const agentBId = process.env.E2E_AGENT_B_ID;
const templateId = process.env.E2E_TEMPLATE_ID ?? "balanced";

const shouldRun = Boolean(baseUrl && agentAKey && agentBKey && agentAId && agentBId);
const run = shouldRun ? test : test.skip;

const makeClient = (apiKey: string): RouterClient<AppRouter> => {
  const link = new RPCLink({
    url: `${baseUrl}/rpc`,
    fetch(url, options) {
      return fetch(url, {
        ...options,
        headers: {
          ...(options?.headers ?? {}),
          "X-Agent-Key": apiKey,
        },
      });
    },
  });

  return createORPCClient(link) as RouterClient<AppRouter>;
};

run("two agents can complete a match", async () => {
  const clientA = makeClient(agentAKey!);
  const clientB = makeClient(agentBKey!);

  await clientA.arena.matches.join({ templateId });
  const matchResponse = await clientB.arena.matches.join({ templateId });

  const matchId = (matchResponse as { matchId?: string }).matchId;
  expect(matchId).toBeTruthy();

  let turns = 0;
  while (turns < 20) {
    let state = await clientA.arena.matches.state({ matchId: matchId! });
    if (state.state === "completed") {
      break;
    }

    const activeClient =
      state.activeAgentId === agentAId ? clientA : state.activeAgentId === agentBId ? clientB : clientA;

    if (activeClient === clientB) {
      state = await clientB.arena.matches.state({ matchId: matchId! });
    }
    const ownParty = state.parties.find((party) =>
      party.characters.some((character) => character.resistances !== "unknown"),
    );
    const enemyParty = state.parties.find((party) => party !== ownParty);

    if (!ownParty || !enemyParty) {
      break;
    }

    const target = enemyParty.characters.find((character) => !character.defeated);
    if (!target) {
      break;
    }

    const actions = ownParty.characters.map((character) => ({
      characterId: character.id,
      actionType: "attack" as const,
      targetId: target.id,
    }));

    await activeClient.arena.matches.actions({
      matchId: matchId!,
      actions,
      reasoning: "Press the attack.",
    });

    turns += 1;
  }

  const finalState = await clientA.arena.matches.state({ matchId: matchId! });
  expect(finalState.state).toBe("completed");
});
