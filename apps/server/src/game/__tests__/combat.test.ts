import { describe, expect, test } from "bun:test";

import type { Character, DamageType } from "@agentpit-gg/api/arena";

import { applyPartyActions } from "../actions";
import { calculateStats } from "../stats";
import { createInitialStats, serializeGameState } from "../state";
import type { InternalGameState, InternalParty } from "../state";

const makeCharacter = (overrides: Partial<Character>): Character => ({
  id: crypto.randomUUID(),
  name: "Test",
  class: "Fighter",
  row: "front",
  stats: {
    maxHp: 100,
    currentHp: 100,
    attack: 10,
    defense: 5,
    magic: 4,
    speed: 5,
  },
  spellSlots: {},
  resistances: {
    physical: 0,
    magic: 0,
  } satisfies Record<DamageType, number>,
  defeated: false,
  ...overrides,
});

const makeParty = (id: string, agentId: string, members: Character[]): InternalParty => ({
  id,
  name: id,
  agentId,
  characters: members,
});

const makeState = (partyA: InternalParty, partyB: InternalParty): InternalGameState => ({
  matchId: "match-test",
  state: "in_progress",
  round: 1,
  activePartyId: partyA.id,
  rngSeed: 123,
  turnExpiresAt: null,
  parties: [partyA, partyB],
  defending: new Set(),
  inspectedByParty: {
    [partyA.id]: new Set(),
    [partyB.id]: new Set(),
  },
  log: [],
  stats: createInitialStats(),
  partyByAgent: {
    [partyA.agentId]: partyA.id,
    [partyB.agentId]: partyB.id,
  },
  lastReasoningByParty: {
    [partyA.id]: null,
    [partyB.id]: null,
  },
});

describe("calculateStats", () => {
  test("computes HP from constitution", () => {
    const stats = calculateStats({
      strength: 5,
      constitution: 10,
      intelligence: 4,
      wisdom: 3,
      speed: 6,
    });

    expect(stats.maxHp).toBe(100);
    expect(stats.currentHp).toBe(100);
  });
});

describe("applyPartyActions", () => {
  test("enforces minimum damage of 1", () => {
    const attacker = makeCharacter({
      id: "attacker",
      stats: {
        maxHp: 50,
        currentHp: 50,
        attack: 1,
        defense: 1,
        magic: 1,
        speed: 5,
      },
    });
    const defender = makeCharacter({
      id: "defender",
      stats: {
        maxHp: 50,
        currentHp: 50,
        attack: 1,
        defense: 100,
        magic: 1,
        speed: 4,
      },
    });

    const partyA = makeParty("partyA", "agentA", [attacker, ...Array(5).fill(attacker).map((_, idx) => makeCharacter({ id: `a-${idx}` }))]);
    const partyB = makeParty("partyB", "agentB", [defender, ...Array(5).fill(defender).map((_, idx) => makeCharacter({ id: `b-${idx}` }))]);
    const state = makeState(partyA, partyB);

    applyPartyActions(state, partyA.id, [
      {
        characterId: attacker.id,
        actionType: "attack",
        targetId: defender.id,
      },
    ]);

    expect(defender.stats.currentHp).toBeLessThan(50);
    expect(defender.stats.currentHp).toBeGreaterThanOrEqual(49);
  });
});

describe("serializeGameState", () => {
  test("hides enemy resistances until inspected", () => {
    const partyA = makeParty("partyA", "agentA", [makeCharacter({ id: "a-1" }), makeCharacter({ id: "a-2" }), makeCharacter({ id: "a-3" }), makeCharacter({ id: "a-4" }), makeCharacter({ id: "a-5" }), makeCharacter({ id: "a-6" })]);
    const partyB = makeParty("partyB", "agentB", [makeCharacter({ id: "b-1" }), makeCharacter({ id: "b-2" }), makeCharacter({ id: "b-3" }), makeCharacter({ id: "b-4" }), makeCharacter({ id: "b-5" }), makeCharacter({ id: "b-6" })]);
    const state = makeState(partyA, partyB);

    const serialized = serializeGameState(state, partyA.id);
    const enemy = serialized.parties.find((party) => party.id === partyB.id);

    expect(enemy).toBeTruthy();
    expect(enemy?.characters[0]?.resistances).toBe("unknown");
  });
});
