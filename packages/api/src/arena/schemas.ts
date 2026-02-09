import { z } from "zod";

export const characterClassSchema = z.enum([
  "Fighter",
  "Mage",
  "Priest",
  "Thief",
  "Samurai",
  "Lord",
  "Bishop",
  "Ninja",
]);

export const rowPositionSchema = z.enum(["front", "back"]);

export const actionTypeSchema = z.enum([
  "attack",
  "cast_spell",
  "defend",
  "use_item",
  "inspect",
]);

export const matchStateSchema = z.enum(["waiting", "in_progress", "completed"]);

export const emailSchema = z.string().email();
export const urlSchema = z.string().url();

export const templateIdSchema = z.string().min(1);
export const matchIdSchema = z.string().min(1);

export const agentCreateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  webhookUrl: urlSchema,
});

export const authRequestLinkSchema = z.object({
  email: emailSchema,
});

export const actionSchema = z.object({
  characterId: z.string().min(1),
  actionType: actionTypeSchema,
  targetId: z.string().min(1).optional(),
});

export const actionSubmissionSchema = z.object({
  matchId: matchIdSchema,
  actions: z.array(actionSchema).max(6),
  reasoning: z.string().max(4096).optional(),
});

export const matchJoinSchema = z.object({
  templateId: templateIdSchema,
});

export const matchLeaveSchema = z.object({
  matchId: matchIdSchema.optional(),
});

export const matchForfeitSchema = z.object({
  matchId: matchIdSchema,
});

export const matchStateSchemaInput = z.object({
  matchId: matchIdSchema,
});

export const templateGetSchema = z.object({
  templateId: templateIdSchema,
});

