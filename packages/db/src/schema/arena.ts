import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth";

export const arenaAgent = sqliteTable(
  "arena_agent",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name"),
    webhookUrl: text("webhook_url").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("arena_agent_userId_idx").on(table.userId)],
);

export const arenaAgentKey = sqliteTable(
  "arena_agent_key",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => arenaAgent.id, { onDelete: "cascade" }),
    keyHash: text("key_hash").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("arena_agent_key_agentId_idx").on(table.agentId)],
);

export const arenaTemplate = sqliteTable(
  "arena_template",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    definitionJson: text("definition_json").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("arena_template_active_idx").on(table.isActive)],
);

export const arenaMatch = sqliteTable(
  "arena_match",
  {
    id: text("id").primaryKey(),
    agentAId: text("agent_a_id")
      .notNull()
      .references(() => arenaAgent.id, { onDelete: "cascade" }),
    agentBId: text("agent_b_id")
      .notNull()
      .references(() => arenaAgent.id, { onDelete: "cascade" }),
    templateAId: text("template_a_id")
      .notNull()
      .references(() => arenaTemplate.id),
    templateBId: text("template_b_id")
      .notNull()
      .references(() => arenaTemplate.id),
    state: text("state").notNull(),
    winnerAgentId: text("winner_agent_id").references(() => arenaAgent.id),
    statsJson: text("stats_json"),
    logJson: text("log_json"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("arena_match_agentA_idx").on(table.agentAId),
    index("arena_match_agentB_idx").on(table.agentBId),
    index("arena_match_state_idx").on(table.state),
    index("arena_match_completed_idx").on(table.completedAt),
  ],
);

export const arenaWebhookLog = sqliteTable(
  "arena_webhook_log",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => arenaAgent.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    url: text("url").notNull(),
    statusCode: integer("status_code"),
    attempt: integer("attempt").default(1).notNull(),
    payloadJson: text("payload_json").notNull(),
    lastAttemptAt: integer("last_attempt_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("arena_webhook_agent_idx").on(table.agentId),
    index("arena_webhook_event_idx").on(table.eventType),
  ],
);

export const arenaRateLimit = sqliteTable("arena_rate_limit", {
  agentId: text("agent_id")
    .primaryKey()
    .references(() => arenaAgent.id, { onDelete: "cascade" }),
  windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
  count: integer("count").default(0).notNull(),
});

export const arenaAgentRelations = relations(arenaAgent, ({ one, many }) => ({
  user: one(user, {
    fields: [arenaAgent.userId],
    references: [user.id],
  }),
  keys: many(arenaAgentKey),
}));

export const arenaAgentKeyRelations = relations(arenaAgentKey, ({ one }) => ({
  agent: one(arenaAgent, {
    fields: [arenaAgentKey.agentId],
    references: [arenaAgent.id],
  }),
}));

