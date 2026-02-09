import { db } from "@agentpit-gg/db";
import { arenaTemplate } from "@agentpit-gg/db/schema";

import { defaultTemplates } from "./template-definitions";

export const ensureTemplates = async (): Promise<void> => {
  await db
    .insert(arenaTemplate)
    .values(
      defaultTemplates.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        definitionJson: JSON.stringify(template),
        isActive: true,
      })),
    )
    .onConflictDoNothing();
};
