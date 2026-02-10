import type { Action, Character, DamageType, MatchState } from "@agentpit-gg/api/arena";

import { computeInitiativeOrder } from "./initiative";
import { createSeededRng } from "./random";
import type { InternalGameState } from "./state";

type ActionMap = Map<string, Action>;

const critChance = 0.1;
const critMultiplier = 2;
const defendReduction = 0.5;
const itemHealRatio = 0.2;

const getCharacterById = (state: InternalGameState, characterId: string): Character | null => {
  for (const party of state.parties) {
    const character = party.characters.find((member) => member.id === characterId);
    if (character) {
      return character;
    }
  }
  return null;
};

const getPartyForCharacter = (
  state: InternalGameState,
  characterId: string,
): InternalGameState["parties"][number] | null => {
  return (
    state.parties.find((party) =>
      party.characters.some((character) => character.id === characterId),
    ) ?? null
  );
};

const getEnemyParty = (
  state: InternalGameState,
  partyId: string,
): InternalGameState["parties"][number] => {
  const enemy = state.parties.find((party) => party.id !== partyId);
  if (!enemy) {
    throw new Error("Enemy party not found.");
  }
  return enemy;
};

const buildActionMap = (actions: Action[]): ActionMap => {
  const map = new Map<string, Action>();
  for (const action of actions) {
    map.set(action.characterId, action);
  }
  return map;
};

const selectTarget = (
  candidates: Character[],
  rng: () => number,
): Character | null => {
  if (candidates.length === 0) {
    return null;
  }
  const index = Math.floor(rng() * candidates.length);
  return candidates[index] ?? null;
};

const resolveTarget = (
  state: InternalGameState,
  action: Action,
  actor: Character,
  partyId: string,
  rng: () => number,
): Character | null => {
  const enemy = getEnemyParty(state, partyId);
  const explicitTarget = action.targetId ? getCharacterById(state, action.targetId) : null;
  const isMelee = action.actionType === "attack";

  const aliveEnemies = enemy.characters.filter((character) => !character.defeated);
  if (aliveEnemies.length === 0) {
    return null;
  }

  const frontRowEnemies = aliveEnemies.filter((character) => character.row === "front");
  const backRowEnemies = aliveEnemies.filter((character) => character.row === "back");

  const preferredRow =
    explicitTarget?.row ?? (frontRowEnemies.length > 0 ? "front" : "back");

  if (explicitTarget && !explicitTarget.defeated) {
    if (!isMelee) {
      return explicitTarget;
    }

    if (explicitTarget.row === "front" || frontRowEnemies.length === 0) {
      return explicitTarget;
    }
  }

  const preferredCandidates =
    preferredRow === "front" ? frontRowEnemies : backRowEnemies;
  const fallbackCandidates =
    preferredRow === "front" ? backRowEnemies : frontRowEnemies;

  return selectTarget(preferredCandidates, rng) ?? selectTarget(fallbackCandidates, rng);
};

const calculateDamage = (
  rng: () => number,
  attackStat: number,
  defenseStat: number,
  damageType: DamageType,
  target: Character,
  isDefending: boolean,
  bonusMultiplier: number,
): number => {
  const base = Math.max(1, attackStat - defenseStat);
  const isCritical = rng() < critChance;
  let damage = isCritical ? base * critMultiplier : base;
  damage *= bonusMultiplier;

  const cap = base * 2;
  damage = Math.min(damage, cap);
  damage = Math.floor(damage);

  const resistance = target.resistances === "unknown" ? 0 : target.resistances[damageType];
  damage = Math.floor(damage * (1 - resistance));

  if (isDefending) {
    damage = Math.floor(damage * (1 - defendReduction));
  }

  return Math.max(1, damage);
};

const applyDamage = (target: Character, damage: number): void => {
  target.stats.currentHp = Math.max(0, target.stats.currentHp - damage);
  if (target.stats.currentHp === 0) {
    target.defeated = true;
  }
};

export const applyPartyActions = (
  state: InternalGameState,
  partyId: string,
  actions: Action[],
): InternalGameState => {
  const party = state.parties.find((member) => member.id === partyId);
  if (!party) {
    throw new Error("Active party not found.");
  }

  state.stats.turnsTaken[partyId === state.parties[0]?.id ? "partyA" : "partyB"] += 1;

  for (const character of party.characters) {
    state.defending.delete(character.id);
  }

  const rng = createSeededRng(state.rngSeed + state.round);
  const actionMap = buildActionMap(actions);
  const initiative = computeInitiativeOrder(party.characters, state.rngSeed + state.round);
  const damageBonusMultiplier =
    state.round > 30 ? Math.min(2, 1 + (state.round - 30) * 0.05) : 1;

  for (const entry of initiative) {
    const actor = party.characters.find((member) => member.id === entry.characterId);
    if (!actor || actor.defeated) {
      continue;
    }

    const action = actionMap.get(actor.id) ?? {
      characterId: actor.id,
      actionType: "defend",
    };

    switch (action.actionType) {
      case "defend": {
        state.defending.add(actor.id);
        state.log.push({
          turn: state.round,
          message: `${actor.name} braces for impact.`,
        });
        break;
      }
      case "attack": {
        const target = resolveTarget(state, action, actor, partyId, rng);
        if (!target) {
          state.log.push({
            turn: state.round,
            message: `${actor.name} finds no target.`,
          });
          break;
        }

        const damage = calculateDamage(
          rng,
          actor.stats.attack,
          target.stats.defense,
          "physical",
          target,
          state.defending.has(target.id),
          damageBonusMultiplier,
        );
        applyDamage(target, damage);

        state.stats.damageDealt[partyId === state.parties[0]?.id ? "partyA" : "partyB"] +=
          damage;

        state.log.push({
          turn: state.round,
          message: `${actor.name} attacks ${target.name} for ${damage} damage.`,
        });
        break;
      }
      case "cast_spell": {
        const slotLevel = 1;
        const currentSlots = actor.spellSlots[slotLevel] ?? 0;
        if (currentSlots <= 0) {
          state.log.push({
            turn: state.round,
            message: `${actor.name} tries to cast but lacks spell slots.`,
          });
          break;
        }

        actor.spellSlots[slotLevel] = currentSlots - 1;
        state.stats.spellsCast[partyId === state.parties[0]?.id ? "partyA" : "partyB"] += 1;

        const target = resolveTarget(state, action, actor, partyId, rng);
        if (!target) {
          state.log.push({
            turn: state.round,
            message: `${actor.name} casts a spell, but no targets remain.`,
          });
          break;
        }

        const damage = calculateDamage(
          rng,
          actor.stats.magic,
          target.stats.defense,
          "magic",
          target,
          state.defending.has(target.id),
          damageBonusMultiplier,
        );
        applyDamage(target, damage);

        state.stats.damageDealt[partyId === state.parties[0]?.id ? "partyA" : "partyB"] +=
          damage;

        state.log.push({
          turn: state.round,
          message: `${actor.name} casts a spell at ${target.name} for ${damage} damage.`,
        });
        break;
      }
      case "use_item": {
        const healAmount = Math.ceil(actor.stats.maxHp * itemHealRatio);
        actor.stats.currentHp = Math.min(actor.stats.maxHp, actor.stats.currentHp + healAmount);
        state.log.push({
          turn: state.round,
          message: `${actor.name} uses an item and heals ${healAmount} HP.`,
        });
        break;
      }
      case "inspect": {
        const target = resolveTarget(state, action, actor, partyId, rng);
        if (!target) {
          state.log.push({
            turn: state.round,
            message: `${actor.name} finds nothing to inspect.`,
          });
          break;
        }

        if (!state.inspectedByParty[partyId]) {
          state.inspectedByParty[partyId] = new Set<string>();
        }

        state.inspectedByParty[partyId].add(target.id);
        state.log.push({
          turn: state.round,
          message: `${actor.name} inspects ${target.name}.`,
        });
        break;
      }
      default: {
        state.log.push({
          turn: state.round,
          message: `${actor.name} hesitates.`,
        });
        break;
      }
    }
  }

  return state;
};

export const isPartyDefeated = (
  state: InternalGameState,
  partyId: string,
): boolean => {
  const party = state.parties.find((member) => member.id === partyId);
  if (!party) {
    return false;
  }

  return party.characters.every((character) => character.defeated);
};

export const updateMatchState = (state: InternalGameState): MatchState => {
  const [partyA, partyB] = state.parties;
  if (!partyA || !partyB) {
    return state.state;
  }

  if (isPartyDefeated(state, partyA.id) || isPartyDefeated(state, partyB.id)) {
    state.state = "completed";
  }

  return state.state;
};
