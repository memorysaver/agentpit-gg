export type CharacterClass =
  | "Fighter"
  | "Mage"
  | "Priest"
  | "Thief"
  | "Samurai"
  | "Lord"
  | "Bishop"
  | "Ninja";

export type RowPosition = "front" | "back";

export type ActionType = "attack" | "cast_spell" | "defend" | "use_item" | "inspect";

export type MatchState = "waiting" | "in_progress" | "completed";

export type DamageType = "physical" | "magic";

export type Resistances = Record<DamageType, number>;

export type CharacterStats = {
  maxHp: number;
  currentHp: number;
  attack: number;
  defense: number;
  magic: number;
  speed: number;
};

export type CharacterAttributes = {
  strength: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  speed: number;
};

export type SpellSlotState = Record<number, number>;

export type Character = {
  id: string;
  name: string;
  class: CharacterClass;
  row: RowPosition;
  stats: CharacterStats;
  spellSlots: SpellSlotState;
  resistances: Resistances | "unknown";
  defeated: boolean;
};

export type Party = {
  id: string;
  name: string;
  characters: Character[];
};

export type TemplateCharacter = {
  id: string;
  name: string;
  class: CharacterClass;
  row: RowPosition;
  attributes: CharacterAttributes;
};

export type PartyTemplateDefinition = {
  id: string;
  name: string;
  description: string;
  members: TemplateCharacter[];
};

export type GameState = {
  matchId: string;
  state: MatchState;
  round: number;
  activeAgentId: string | null;
  turnExpiresAt: string | null;
  parties: Party[];
};

export type Action = {
  characterId: string;
  actionType: ActionType;
  targetId?: string;
};

export type ActionSubmission = {
  matchId: string;
  actions: Action[];
  reasoning?: string;
};

export type MatchStats = {
  turnsTaken: {
    partyA: number;
    partyB: number;
  };
  damageDealt: {
    partyA: number;
    partyB: number;
  };
  spellsCast: {
    partyA: number;
    partyB: number;
  };
};

export type MatchSummary = {
  matchId: string;
  state: MatchState;
  opponentAgentId: string;
  winnerAgentId: string | null;
  completedAt: string | null;
  stats?: MatchStats | null;
};

export type AgentIdentity = {
  id: string;
  userId: string;
  webhookUrl: string;
};
