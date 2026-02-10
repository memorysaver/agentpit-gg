import type { Character } from "@agentpit-gg/api/arena";

import { createSeededRng, randomInt } from "./random";

export type InitiativeEntry = {
  characterId: string;
  initiative: number;
  speed: number;
};

export const computeInitiativeOrder = (
  characters: Character[],
  seed: number,
): InitiativeEntry[] => {
  const rng = createSeededRng(seed);

  return characters
    .map((character) => ({
      characterId: character.id,
      initiative: character.stats.speed + randomInt(rng, 19),
      speed: character.stats.speed,
    }))
    .sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative;
      }

      if (b.speed !== a.speed) {
        return b.speed - a.speed;
      }

      return a.characterId.localeCompare(b.characterId);
    });
};
