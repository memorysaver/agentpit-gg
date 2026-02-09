import type { CharacterAttributes, CharacterStats } from "@agentpit-gg/api/arena";

const hpBase = 50;
const hpPerConstitution = 5;
const attackPerStrength = 2;
const defensePerConstitution = 2;
const magicPerIntelligence = 2;

export const calculateStats = (attributes: CharacterAttributes): CharacterStats => {
  const maxHp = hpBase + attributes.constitution * hpPerConstitution;

  return {
    maxHp,
    currentHp: maxHp,
    attack: attributes.strength * attackPerStrength,
    defense: attributes.constitution * defensePerConstitution,
    magic: attributes.intelligence * magicPerIntelligence,
    speed: attributes.speed,
  };
};
