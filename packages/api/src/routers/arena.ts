import { ORPCError } from "@orpc/server";
import { and, desc, eq, gt, or } from "drizzle-orm";

import { auth } from "@agentpit-gg/auth";
import { db } from "@agentpit-gg/db";
import {
  arenaMatch,
  arenaTemplate,
} from "@agentpit-gg/db/schema";
import { env } from "@agentpit-gg/env/server";

import { generateApiKey, hashApiKey } from "../arena/crypto";
import {
  actionSubmissionSchema,
  agentCreateSchema,
  authRequestLinkSchema,
  matchForfeitSchema,
  matchJoinSchema,
  matchLeaveSchema,
  matchStateSchemaInput,
  templateGetSchema,
} from "../arena/schemas";
import { ensureTemplates } from "../arena/templates";
import { agentProcedure, protectedProcedure } from "../index";

const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

export const arenaRouter = {
  auth: {
    requestLink: agentProcedure
      .input(authRequestLinkSchema)
      .handler(async ({ input, context }) => {
        const result = await auth.api.signInMagicLink({
          body: {
            email: input.email,
            callbackURL: env.CORS_ORIGIN,
          },
          headers: context.request.headers,
        });

        if (!result.status) {
          throw new ORPCError("INTERNAL_SERVER_ERROR");
        }

        return { status: "sent" };
      }),
  },
  agents: {
    create: protectedProcedure
      .input(agentCreateSchema)
      .handler(async ({ input, context }) => {
        const userId = context.session?.user?.id;

        if (!userId) {
          throw new ORPCError("UNAUTHORIZED");
        }

        const agentId = crypto.randomUUID();
        const apiKey = generateApiKey();
        const keyHash = await hashApiKey(apiKey);

        await db.insert(arenaAgent).values({
          id: agentId,
          userId: userId,
          name: input.name ?? null,
          webhookUrl: input.webhookUrl,
        });

        await db.insert(arenaAgentKey).values({
          id: crypto.randomUUID(),
          agentId: agentId,
          keyHash: keyHash,
        });

        return {
          agentId,
          apiKey,
        };
      }),
  },
  templates: {
    list: agentProcedure.handler(async () => {
      await ensureTemplates();

      const templates = await db
        .select({
          id: arenaTemplate.id,
          name: arenaTemplate.name,
          description: arenaTemplate.description,
        })
        .from(arenaTemplate)
        .where(eq(arenaTemplate.isActive, true))
        .orderBy(arenaTemplate.name);

      return templates;
    }),
    get: agentProcedure.input(templateGetSchema).handler(async ({ input }) => {
      await ensureTemplates();

      const template = await db.query.arenaTemplate.findFirst({
        where: eq(arenaTemplate.id, input.templateId),
      });

      if (!template) {
        throw new ORPCError("NOT_FOUND");
      }

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        definition: JSON.parse(template.definitionJson) as unknown,
      };
    }),
  },
  matches: {
    join: agentProcedure.input(matchJoinSchema).handler(async ({ input, context }) => {
      const matchmakerId = env.MATCHMAKER.idFromName("matchmaker");
      const matchmaker = env.MATCHMAKER.get(matchmakerId);

      const response = await matchmaker.fetch("https://matchmaker/join", {
        method: "POST",
        body: JSON.stringify({
          agentId: context.agent?.id,
          templateId: input.templateId,
          webhookUrl: context.agent?.webhookUrl,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new ORPCError("BAD_REQUEST");
      }

      return (await response.json()) as unknown;
    }),
    leave: agentProcedure.input(matchLeaveSchema).handler(async ({ context }) => {
      const matchmakerId = env.MATCHMAKER.idFromName("matchmaker");
      const matchmaker = env.MATCHMAKER.get(matchmakerId);

      const response = await matchmaker.fetch("https://matchmaker/leave", {
        method: "POST",
        body: JSON.stringify({
          agentId: context.agent?.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new ORPCError(response.status === 404 ? "NOT_FOUND" : "BAD_REQUEST");
      }

      return (await response.json()) as unknown;
    }),
    state: agentProcedure
      .input(matchStateSchemaInput)
      .handler(async ({ input, context }) => {
        const sessionId = env.GAME_SESSION.idFromName(input.matchId);
        const session = env.GAME_SESSION.get(sessionId);

        const response = await session.fetch("https://game-session/state", {
          headers: {
            "X-Agent-Id": context.agent?.id ?? "",
          },
        });

        if (!response.ok) {
          throw new ORPCError(response.status === 403 ? "FORBIDDEN" : "NOT_FOUND");
        }

        return (await response.json()) as unknown;
      }),
    actions: agentProcedure
      .input(actionSubmissionSchema)
      .handler(async ({ input, context }) => {
        const sessionId = env.GAME_SESSION.idFromName(input.matchId);
        const session = env.GAME_SESSION.get(sessionId);

        const response = await session.fetch("https://game-session/actions", {
          method: "POST",
          body: JSON.stringify({
            actions: input.actions,
            reasoning: input.reasoning,
          }),
          headers: {
            "Content-Type": "application/json",
            "X-Agent-Id": context.agent?.id ?? "",
          },
        });

        if (!response.ok) {
          if (response.status === 409) {
            throw new ORPCError("CONFLICT");
          }
          throw new ORPCError("BAD_REQUEST");
        }

        return (await response.json()) as unknown;
      }),
    forfeit: agentProcedure
      .input(matchForfeitSchema)
      .handler(async ({ input, context }) => {
        const sessionId = env.GAME_SESSION.idFromName(input.matchId);
        const session = env.GAME_SESSION.get(sessionId);

        const response = await session.fetch("https://game-session/forfeit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Agent-Id": context.agent?.id ?? "",
          },
          body: JSON.stringify({ matchId: input.matchId }),
        });

        if (!response.ok) {
          throw new ORPCError("BAD_REQUEST");
        }

        return (await response.json()) as unknown;
      }),
    history: agentProcedure.handler(async ({ context }) => {
      const since = Date.now() - sevenDaysMs;

      const matches = await db
        .select({
          id: arenaMatch.id,
          agentAId: arenaMatch.agentAId,
          agentBId: arenaMatch.agentBId,
          winnerAgentId: arenaMatch.winnerAgentId,
          completedAt: arenaMatch.completedAt,
          state: arenaMatch.state,
          statsJson: arenaMatch.statsJson,
        })
        .from(arenaMatch)
        .where(
          and(
            gt(arenaMatch.createdAt, since),
            or(
              eq(arenaMatch.agentAId, context.agent?.id ?? ""),
              eq(arenaMatch.agentBId, context.agent?.id ?? ""),
            ),
          ),
        )
        .orderBy(desc(arenaMatch.createdAt));

      return matches.map((match) => ({
        matchId: match.id,
        state: match.state,
        opponentAgentId:
          match.agentAId === context.agent?.id ? match.agentBId : match.agentAId,
        winnerAgentId: match.winnerAgentId,
        completedAt: match.completedAt ? new Date(match.completedAt).toISOString() : null,
        stats: match.statsJson ? JSON.parse(match.statsJson) : null,
      }));
    }),
  },
  admin: {
    templateStats: protectedProcedure.handler(async () => {
      const matches = await db
        .select({
          agentAId: arenaMatch.agentAId,
          agentBId: arenaMatch.agentBId,
          templateAId: arenaMatch.templateAId,
          templateBId: arenaMatch.templateBId,
          winnerAgentId: arenaMatch.winnerAgentId,
          state: arenaMatch.state,
        })
        .from(arenaMatch)
        .where(eq(arenaMatch.state, "completed"));

      const templateStats = new Map<
        string,
        {
          selections: number;
          wins: number;
          matchups: Map<string, { wins: number; losses: number }>;
        }
      >();

      const ensureTemplate = (templateId: string) => {
        if (!templateStats.has(templateId)) {
          templateStats.set(templateId, {
            selections: 0,
            wins: 0,
            matchups: new Map(),
          });
        }
        return templateStats.get(templateId)!;
      };

      for (const match of matches) {
        const templateA = ensureTemplate(match.templateAId);
        const templateB = ensureTemplate(match.templateBId);

        templateA.selections += 1;
        templateB.selections += 1;

        const winnerTemplate =
          match.winnerAgentId === match.agentAId
            ? match.templateAId
            : match.winnerAgentId === match.agentBId
              ? match.templateBId
              : null;

        if (winnerTemplate === match.templateAId) {
          templateA.wins += 1;
        } else if (winnerTemplate === match.templateBId) {
          templateB.wins += 1;
        }

        const matchupA = templateA.matchups.get(match.templateBId) ?? {
          wins: 0,
          losses: 0,
        };
        const matchupB = templateB.matchups.get(match.templateAId) ?? {
          wins: 0,
          losses: 0,
        };

        if (winnerTemplate === match.templateAId) {
          matchupA.wins += 1;
          matchupB.losses += 1;
        } else if (winnerTemplate === match.templateBId) {
          matchupB.wins += 1;
          matchupA.losses += 1;
        }

        templateA.matchups.set(match.templateBId, matchupA);
        templateB.matchups.set(match.templateAId, matchupB);
      }

      const totalSelections = Array.from(templateStats.values()).reduce(
        (sum, stat) => sum + stat.selections,
        0,
      );

      const templates = Array.from(templateStats.entries()).map(([templateId, stat]) => {
        const winRate = stat.selections > 0 ? stat.wins / stat.selections : 0;
        const selectionShare = totalSelections > 0 ? stat.selections / totalSelections : 0;
        const matchupStats = Object.fromEntries(
          Array.from(stat.matchups.entries()).map(([opponentId, matchup]) => [
            opponentId,
            {
              wins: matchup.wins,
              losses: matchup.losses,
              winRate:
                matchup.wins + matchup.losses > 0
                  ? matchup.wins / (matchup.wins + matchup.losses)
                  : 0,
            },
          ]),
        );

        return {
          templateId,
          selections: stat.selections,
          wins: stat.wins,
          winRate,
          selectionShare,
          flaggedDominant: selectionShare > 0.4,
          flaggedWinRate: stat.selections >= 1000 && winRate > 0.6,
          matchups: matchupStats,
        };
      });

      return {
        totalMatches: matches.length,
        templates,
      };
    }),
  },
};
