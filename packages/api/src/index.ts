import { ORPCError, os } from "@orpc/server";
import { eq, sql } from "drizzle-orm";

import { db } from "@agentpit-gg/db";
import { arenaAgent, arenaAgentKey, arenaRateLimit } from "@agentpit-gg/db/schema";

import type { Context } from "./context";
import { hashApiKey } from "./arena/crypto";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

const requireAgent = o.middleware(async ({ context, next }) => {
  const apiKey = context.request.headers.get("X-Agent-Key");

  if (!apiKey) {
    throw new ORPCError("UNAUTHORIZED");
  }

  const keyHash = await hashApiKey(apiKey);
  const agentKeyRecord = await db
    .select({
      keyId: arenaAgentKey.id,
      agentId: arenaAgent.id,
      userId: arenaAgent.userId,
      webhookUrl: arenaAgent.webhookUrl,
    })
    .from(arenaAgentKey)
    .innerJoin(arenaAgent, eq(arenaAgentKey.agentId, arenaAgent.id))
    .where(eq(arenaAgentKey.keyHash, keyHash))
    .get();

  if (!agentKeyRecord) {
    throw new ORPCError("UNAUTHORIZED");
  }

  await db
    .update(arenaAgentKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(arenaAgentKey.id, agentKeyRecord.keyId));

  return next({
    context: {
      ...context,
      agent: {
        id: agentKeyRecord.agentId,
        userId: agentKeyRecord.userId,
        webhookUrl: agentKeyRecord.webhookUrl,
      },
    },
  });
});

const rateLimitAgent = o.middleware(async ({ context, next }) => {
  if (!context.agent) {
    throw new ORPCError("UNAUTHORIZED");
  }

  const now = Date.now();
  const windowMs = 60_000;
  const limit = 100;

  const existing = await db.query.arenaRateLimit.findFirst({
    where: eq(arenaRateLimit.agentId, context.agent.id),
  });

  if (!existing || now - existing.windowStart >= windowMs) {
    await db
      .insert(arenaRateLimit)
      .values({
        agentId: context.agent.id,
        windowStart: now,
        count: 1,
      })
      .onConflictDoUpdate({
        target: arenaRateLimit.agentId,
        set: {
          windowStart: now,
          count: 1,
        },
      });

    return next();
  }

  if (existing.count >= limit) {
    throw new ORPCError("TOO_MANY_REQUESTS");
  }

  await db
    .update(arenaRateLimit)
    .set({
      count: sql`${arenaRateLimit.count} + 1`,
    })
    .where(eq(arenaRateLimit.agentId, context.agent.id));

  return next();
});

export const agentProcedure = publicProcedure.use(requireAgent).use(rateLimitAgent);
