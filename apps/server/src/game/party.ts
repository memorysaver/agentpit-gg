import type { Character, Party, PartyTemplateDefinition, SpellSlotState, TemplateCharacter } from "@agentpit-gg/api/arena";

import { getClassTemplate } from "./classes";
import { calculateStats } from "./stats";

const cloneSpellSlots = (slots: SpellSlotState): SpellSlotState => {
  return Object.fromEntries(Object.entries(slots).map(([level, count]) => [Number(level), count]));
};

export const createCharacterFromTemplate = (template: TemplateCharacter): Character => {
  const classTemplate = getClassTemplate(template.class);
  const stats = calculateStats(template.attributes);

  return {
    id: template.id,
    name: template.name,
    class: template.class,
    row: template.row,
    stats,
    spellSlots: cloneSpellSlots(classTemplate.spellSlots),
    resistances: classTemplate.resistances,
    defeated: false,
  };
};

export const createPartyFromTemplate = (
  template: PartyTemplateDefinition,
  options?: {
    partyId?: string;
    characterIdPrefix?: string;
  },
): Party => {
  if (template.members.length !== 6) {
    throw new Error("Party templates must include exactly 6 characters.");
  }

  const partyId = options?.partyId ?? template.id;
  const prefix = options?.characterIdPrefix ?? "";

  return {
    id: partyId,
    name: template.name,
    characters: template.members.map((member) =>
      createCharacterFromTemplate({
        ...member,
        id: `${prefix}${member.id}`,
      }),
    ),
  };
};
