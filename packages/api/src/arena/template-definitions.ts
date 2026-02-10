import type { CharacterAttributes, CharacterClass, PartyTemplateDefinition } from "./types";

const classAttributes: Record<CharacterClass, CharacterAttributes> = {
  Fighter: {
    strength: 10,
    constitution: 9,
    intelligence: 2,
    wisdom: 3,
    speed: 5,
  },
  Mage: {
    strength: 2,
    constitution: 4,
    intelligence: 10,
    wisdom: 7,
    speed: 5,
  },
  Priest: {
    strength: 3,
    constitution: 6,
    intelligence: 6,
    wisdom: 9,
    speed: 4,
  },
  Thief: {
    strength: 6,
    constitution: 5,
    intelligence: 4,
    wisdom: 4,
    speed: 9,
  },
  Samurai: {
    strength: 8,
    constitution: 7,
    intelligence: 6,
    wisdom: 5,
    speed: 6,
  },
  Lord: {
    strength: 7,
    constitution: 8,
    intelligence: 5,
    wisdom: 7,
    speed: 5,
  },
  Bishop: {
    strength: 3,
    constitution: 5,
    intelligence: 8,
    wisdom: 8,
    speed: 4,
  },
  Ninja: {
    strength: 8,
    constitution: 6,
    intelligence: 5,
    wisdom: 4,
    speed: 8,
  },
};

const makeMember = (
  id: string,
  name: string,
  characterClass: CharacterClass,
  row: "front" | "back",
) => ({
  id,
  name,
  class: characterClass,
  row,
  attributes: classAttributes[characterClass],
});

export const defaultTemplates: PartyTemplateDefinition[] = [
  {
    id: "balanced",
    name: "Balanced",
    description: "Versatile mix of offense, defense, and support.",
    members: [
      makeMember("balanced-f1", "Fighter Alpha", "Fighter", "front"),
      makeMember("balanced-f2", "Fighter Beta", "Fighter", "front"),
      makeMember("balanced-m1", "Mage", "Mage", "back"),
      makeMember("balanced-p1", "Priest", "Priest", "back"),
      makeMember("balanced-t1", "Thief", "Thief", "front"),
      makeMember("balanced-l1", "Lord", "Lord", "front"),
    ],
  },
  {
    id: "glass-cannon",
    name: "Glass Cannon",
    description: "High magic damage with low survivability.",
    members: [
      makeMember("glass-f1", "Fighter", "Fighter", "front"),
      makeMember("glass-m1", "Mage Alpha", "Mage", "back"),
      makeMember("glass-m2", "Mage Beta", "Mage", "back"),
      makeMember("glass-b1", "Bishop", "Bishop", "back"),
      makeMember("glass-s1", "Samurai", "Samurai", "front"),
      makeMember("glass-n1", "Ninja", "Ninja", "front"),
    ],
  },
  {
    id: "tank-wall",
    name: "Tank Wall",
    description: "High defense and sustain with low offensive output.",
    members: [
      makeMember("tank-f1", "Fighter Alpha", "Fighter", "front"),
      makeMember("tank-f2", "Fighter Beta", "Fighter", "front"),
      makeMember("tank-f3", "Fighter Gamma", "Fighter", "front"),
      makeMember("tank-l1", "Lord", "Lord", "front"),
      makeMember("tank-p1", "Priest", "Priest", "back"),
      makeMember("tank-b1", "Bishop", "Bishop", "back"),
    ],
  },
  {
    id: "speed-blitz",
    name: "Speed Blitz",
    description: "High initiative with burst damage and tempo control.",
    members: [
      makeMember("speed-t1", "Thief Alpha", "Thief", "front"),
      makeMember("speed-t2", "Thief Beta", "Thief", "front"),
      makeMember("speed-n1", "Ninja Alpha", "Ninja", "front"),
      makeMember("speed-n2", "Ninja Beta", "Ninja", "front"),
      makeMember("speed-s1", "Samurai", "Samurai", "back"),
      makeMember("speed-m1", "Mage", "Mage", "back"),
    ],
  },
  {
    id: "control",
    name: "Control",
    description: "Debuffs and status effects with resilient frontline.",
    members: [
      makeMember("control-f1", "Fighter", "Fighter", "front"),
      makeMember("control-m1", "Mage Alpha", "Mage", "back"),
      makeMember("control-m2", "Mage Beta", "Mage", "back"),
      makeMember("control-p1", "Priest", "Priest", "back"),
      makeMember("control-b1", "Bishop", "Bishop", "back"),
      makeMember("control-l1", "Lord", "Lord", "front"),
    ],
  },
];
