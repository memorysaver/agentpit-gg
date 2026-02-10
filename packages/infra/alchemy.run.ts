import alchemy from "alchemy";
import { D1Database, DurableObjectNamespace, TanStackStart, Worker } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

const app = await alchemy("agentpit-gg");

const db = await D1Database("database", {
  migrationsDir: "../../packages/db/src/migrations",
});

const gameSession = DurableObjectNamespace("game-session", {
  className: "GameSession",
});

const matchmaker = DurableObjectNamespace("matchmaker", {
  className: "Matchmaker",
});

export const web = await TanStackStart("web", {
  cwd: "../../apps/web",
  dev: {
    port: 3102,
  },
  bindings: {
    VITE_SERVER_URL: alchemy.env.VITE_SERVER_URL!,
    DB: db,
    CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
  },
});

export const server = await Worker("server", {
  cwd: "../../apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  bindings: {
    DB: db,
    CORS_ORIGIN: alchemy.env.CORS_ORIGIN!,
    BETTER_AUTH_SECRET: alchemy.secret.env.BETTER_AUTH_SECRET!,
    BETTER_AUTH_URL: alchemy.env.BETTER_AUTH_URL!,
    GAME_SESSION: gameSession,
    MATCHMAKER: matchmaker,
  },
  dev: {
    port: 3100,
  },
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
