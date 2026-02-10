import type {
  CharacterAttributes,
  CharacterClass,
  Resistances,
  SpellSlotState,
} from "@agentpit-gg/api/arena";

export type ClassTemplate = {
  class: CharacterClass;
  baseAttributes: CharacterAttributes;
  spellSlots: SpellSlotState;
  resistances: Resistances;
};

const emptySlots: SpellSlotState = {};

const classTemplates: Record<CharacterClass, ClassTemplate> = {
  Fighter: {
    class: "Fighter",
    baseAttributes: {
      strength: 10,
      constitution: 9,
      intelligence: 2,
      wisdom: 3,
      speed: 5,
    },
    spellSlots: emptySlots,
    resistances: {
      physical: 0.1,
      magic: 0.05,
    },
  },
  Mage: {
    class: "Mage",
    baseAttributes: {
      strength: 2,
      constitution: 4,
      intelligence: 10,
      wisdom: 7,
      speed: 5,
    },
    spellSlots: {
      1: 2,
      2: 2,
      3: 1,
      4: 1,
    },
    resistances: {
      physical: 0,
      magic: 0.15,
    },
  },
  Priest: {
    class: "Priest",
    baseAttributes: {
      strength: 3,
      constitution: 6,
      intelligence: 6,
      wisdom: 9,
      speed: 4,
    },
    spellSlots: {
      1: 2,
      2: 1,
      3: 1,
      4: 1,
    },
    resistances: {
      physical: 0.05,
      magic: 0.1,
    },
  },
  Thief: {
    class: "Thief",
    baseAttributes: {
      strength: 6,
      constitution: 5,
      intelligence: 4,
      wisdom: 4,
      speed: 9,
    },
    spellSlots: emptySlots,
    resistances: {
      physical: 0.05,
      magic: 0.05,
    },
  },
  Samurai: {
    class: "Samurai",
    baseAttributes: {
      strength: 8,
      constitution: 7,
      intelligence: 6,
      wisdom: 5,
      speed: 6,
    },
    spellSlots: {
      1: 1,
      2: 1,
    },
    resistances: {
      physical: 0.08,
      magic: 0.08,
    },
  },
  Lord: {
    class: "Lord",
    baseAttributes: {
      strength: 7,
      constitution: 8,
      intelligence: 5,
      wisdom: 7,
      speed: 5,
    },
    spellSlots: {
      1: 1,
      2: 1,
    },
    resistances: {
      physical: 0.12,
      magic: 0.08,
    },
  },
  Bishop: {
    class: "Bishop",
    baseAttributes: {
      strength: 3,
      constitution: 5,
      intelligence: 8,
      wisdom: 8,
      speed: 4,
    },
    spellSlots: {
      1: 2,
      2: 2,
      3: 1,
      4: 1,
    },
    resistances: {
      physical: 0.04,
      magic: 0.12,
    },
  },
  Ninja: {
    class: "Ninja",
    baseAttributes: {
      strength: 8,
      constitution: 6,
      intelligence: 5,
      wisdom: 4,
      speed: 8,
    },
    spellSlots: {
      1: 1,
    },
    resistances: {
      physical: 0.15,
      magic: 0.05,
    },
  },
};

export const getClassTemplate = (characterClass: CharacterClass): ClassTemplate => {
  return classTemplates[characterClass];
};
