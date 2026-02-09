import type { GameState, MatchStats, MatchState, Party } from "@agentpit-gg/api/arena";

export type InternalParty = Party & {
  agentId: string;
};

export type BattleLogEntry = {
  turn: number;
  message: string;
};

export type InternalGameState = {
  matchId: string;
  state: MatchState;
  round: number;
  activePartyId: string;
  rngSeed: number;
  turnExpiresAt: number | null;
  parties: InternalParty[];
  defending: Set<string>;
  inspectedByParty: Record<string, Set<string>>;
  log: BattleLogEntry[];
  stats: MatchStats;
  partyByAgent: Record<string, string>;
  lastReasoningByParty: Record<string, string | null>;
};

export type StoredGameState = Omit<
  InternalGameState,
  "defending" | "inspectedByParty"
> & {
  defending: string[];
  inspectedByParty: Record<string, string[]>;
};

export const createInitialStats = (): MatchStats => ({
  turnsTaken: {
    partyA: 0,
    partyB: 0,
  },
  damageDealt: {
    partyA: 0,
    partyB: 0,
  },
  spellsCast: {
    partyA: 0,
    partyB: 0,
  },
});

export const serializeGameState = (
  state: InternalGameState,
  viewerPartyId: string,
): GameState => {
  const inspected = state.inspectedByParty[viewerPartyId] ?? new Set<string>();

  return {
    matchId: state.matchId,
    state: state.state,
    round: state.round,
    activeAgentId: state.parties.find((party) => party.id === state.activePartyId)?.agentId ?? null,
    turnExpiresAt: state.turnExpiresAt
      ? new Date(state.turnExpiresAt).toISOString()
      : null,
    parties: state.parties.map((party) => ({
      id: party.id,
      name: party.name,
      characters: party.characters.map((character) => ({
        ...character,
        resistances:
          party.id === viewerPartyId || inspected.has(character.id)
            ? character.resistances
            : "unknown",
      })),
    })),
  };
};

export const serializeSpectatorState = (state: InternalGameState): GameState => {
  const inspected = new Set<string>();

  for (const inspectedSet of Object.values(state.inspectedByParty)) {
    for (const characterId of inspectedSet) {
      inspected.add(characterId);
    }
  }

  return {
    matchId: state.matchId,
    state: state.state,
    round: state.round,
    activeAgentId: state.parties.find((party) => party.id === state.activePartyId)?.agentId ?? null,
    turnExpiresAt: state.turnExpiresAt
      ? new Date(state.turnExpiresAt).toISOString()
      : null,
    parties: state.parties.map((party) => ({
      id: party.id,
      name: party.name,
      characters: party.characters.map((character) => ({
        ...character,
        resistances: inspected.has(character.id) ? character.resistances : "unknown",
      })),
    })),
  };
};

export const serializeInternalState = (state: InternalGameState): StoredGameState => ({
  ...state,
  defending: Array.from(state.defending),
  inspectedByParty: Object.fromEntries(
    Object.entries(state.inspectedByParty).map(([partyId, inspected]) => [
      partyId,
      Array.from(inspected),
    ]),
  ),
});

export const deserializeInternalState = (stored: StoredGameState): InternalGameState => ({
  ...stored,
  defending: new Set(stored.defending),
  inspectedByParty: Object.fromEntries(
    Object.entries(stored.inspectedByParty).map(([partyId, inspected]) => [
      partyId,
      new Set(inspected),
    ]),
  ),
});
