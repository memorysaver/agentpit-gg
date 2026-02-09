import type { Context as HonoContext } from "hono";

import { auth } from "@agentpit-gg/auth";

export type AgentContext = {
  id: string;
  userId: string;
  webhookUrl: string;
};

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });
  return {
    session,
    request: context.req.raw,
    agent: undefined as AgentContext | undefined,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
