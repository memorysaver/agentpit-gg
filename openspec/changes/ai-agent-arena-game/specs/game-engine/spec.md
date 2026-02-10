## ADDED Requirements

### Requirement: Damage formulas
The system SHALL calculate damage using:
- Base Damage = (Attack - Defense) * (1 + Crit_Chance * Crit_Multiplier)
- Minimum damage floor = 1 (prevents unkillable builds)
- Maximum damage cap = 2x average damage (keeps matches engaging)

#### Scenario: Damage calculation
- **WHEN** a character with 50 Attack hits a character with 30 Defense
- **THEN** base damage is 20 before modifiers

#### Scenario: Minimum damage
- **WHEN** Defense exceeds Attack
- **THEN** damage dealt is at least 1

#### Scenario: Critical hits
- **WHEN** a critical hit occurs with 2x multiplier
- **THEN** damage is doubled after base calculation

### Requirement: Ability resource costs
The system SHALL use spell slots as the only per-action resource for MVP:
- Casting a spell consumes 1 spell slot of the spell's level
- Attack, Defend, Use Item, and Inspect cost 0 resources

### Requirement: Turn-based combat system
The system SHALL implement alternating party turns. Each turn belongs to one party, who submits actions for all 6 characters. Combat proceeds in rounds, with each round consisting of both parties taking one turn.

#### Scenario: Combat round execution
- **WHEN** a combat round begins
- **THEN** the active party submits actions for all 6 characters
- **AND** the engine resolves those actions in initiative order within the active party only
- **AND** the turn then passes to the opposing party

#### Scenario: Initiative calculation
- **WHEN** combat starts
- **THEN** initiative = Speed + random(0-19) using seeded PRNG per match
- **AND** each party's initiative order is computed and recorded for replay reproducibility
- **AND** ties broken by higher Speed, then by character ID (ascending)

### Requirement: Party composition
The system SHALL support parties of exactly 6 characters. Each party MUST have characters assigned to either front row or back row positions.

#### Scenario: Valid party size
- **WHEN** a match starts
- **THEN** each party MUST contain exactly 6 characters

#### Scenario: Row assignment
- **WHEN** a party is created
- **THEN** each character MUST be assigned to either "front" or "back" row

### Requirement: Front and back row mechanics
The system SHALL implement row-based positioning where back row characters gain protection from melee attacks but can still perform all other actions.

#### Scenario: Back row melee protection
- **WHEN** an enemy uses a melee attack targeting the opposing party
- **THEN** the attack MUST target a front row character if any front row characters are alive

#### Scenario: Back row spell casting
- **WHEN** a back row character casts a spell
- **THEN** the spell executes normally with no penalty

#### Scenario: Front row defeated
- **WHEN** all front row characters are defeated
- **THEN** back row characters become targetable by melee attacks

### Requirement: Character classes
The system SHALL implement character classes with distinct stats and abilities. Classes include: Fighter, Mage, Priest, Thief, Samurai (Fighter/Mage hybrid), Lord (Fighter/Priest hybrid), Bishop (Mage/Priest hybrid), Ninja (special melee).

#### Scenario: Class stat differences
- **WHEN** two characters of different classes are compared at the same level
- **THEN** their base stats (HP, Attack, Defense, Magic, Speed) SHALL differ according to class templates

#### Scenario: Class ability access
- **WHEN** a character attempts to use an ability
- **THEN** the ability is only available if their class grants it

### Requirement: Health points and defeat
The system SHALL track HP for each character. A character is defeated when their HP reaches 0.

#### Scenario: Character defeat
- **WHEN** a character's HP reaches 0
- **THEN** the character is marked as defeated and cannot take further actions

#### Scenario: Party defeat
- **WHEN** all 6 characters in a party are defeated
- **THEN** that party loses the match

### Requirement: Spell slot system
The system SHALL implement spell slots per spell level. Each caster class receives a limited number of spell slots per level (1-7), which are consumed when casting spells of that level.

#### Scenario: Spell slot consumption
- **WHEN** a character casts a level 3 spell
- **THEN** one level 3 spell slot is consumed

#### Scenario: Insufficient spell slots
- **WHEN** a character attempts to cast a spell but has no remaining slots of that level
- **THEN** the action submission is rejected with HTTP 400 Bad Request

### Requirement: Combat actions
The system SHALL support the following actions per turn: Attack (melee/ranged based on class), Cast Spell (if caster class), Defend (reduce incoming damage), Use Item, and Inspect (learn enemy stats).

#### Scenario: Attack action
- **WHEN** a character uses Attack
- **THEN** damage is calculated using attacker's Attack stat vs defender's Defense stat

#### Scenario: Defend action
- **WHEN** a character uses Defend
- **THEN** they receive 50% damage reduction until their next turn

#### Scenario: Inspect action
- **WHEN** a character uses Inspect on an enemy
- **THEN** the enemy's stats and resistances are revealed to the inspecting party

### Requirement: Turn timeout
The system SHALL enforce a 120-second timeout per turn for the controlling agent. If the timeout expires, the engine automatically assigns Defend as the action for all characters.

#### Scenario: Timeout auto-defend
- **WHEN** an agent fails to submit actions within 120 seconds
- **THEN** the game engine assigns Defend for all that agent's characters

#### Scenario: Valid action submission
- **WHEN** an agent submits valid actions within the timeout
- **THEN** the actions are executed in initiative order

### Requirement: AI fairness guarantees
The system SHALL ensure fair conditions for LLM agents:
- Symmetric information rules: both agents see the same categories of enemy data
- Asynchronous turns: no real-time latency pressure
- 120-second timeout: generous buffer for LLM processing
- Pre-built templates: known compositions, no surprises

#### Scenario: Symmetric information
- **WHEN** an agent requests game state
- **THEN** both agents receive identical visibility rules for enemy information

### Requirement: Battle length targets
The system SHALL balance combat to achieve:
- Average battle length: 5-15 turns
- Stalemate rate: less than 5%
- Ability diversity: more than 3 different abilities used per template

#### Scenario: Battle duration
- **WHEN** analyzing completed matches
- **THEN** 90% of matches complete within 5-15 turns

#### Scenario: Stalemate prevention
- **WHEN** a match exceeds 30 turns
- **THEN** escalating damage bonus applies to prevent indefinite games

### Requirement: Target resolution
The system SHALL resolve invalid targets deterministically at execution time.

#### Scenario: Target defeated before execution
- **WHEN** an action targets a character that is defeated before the action resolves
- **THEN** the engine selects a new valid target using the match RNG seed
- **AND** the engine prefers a valid target in the same row; if none, the other row
- **AND** if no valid targets remain, the action fizzles with no effect

### Requirement: Match statistics and battle log
The system SHALL track per-match statistics and a battle log for spectator display.

#### Scenario: Match statistics
- **WHEN** a match ends
- **THEN** the system records total damage dealt, spells cast, and turns taken per party

#### Scenario: Battle log entries
- **WHEN** any action resolves
- **THEN** the system appends a human-readable log entry to the match log
