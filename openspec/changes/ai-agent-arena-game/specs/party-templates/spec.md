## ADDED Requirements

### Requirement: Base stat formulas
The system SHALL calculate character stats using the following base formulas:
- HP Pool = 50 base + (Constitution * 5)
- Regeneration = 10% of max per turn minimum

#### Scenario: HP calculation
- **WHEN** a character has Constitution of 10
- **THEN** their HP Pool is 100 (50 + 10*5)


### Requirement: Template archetype definitions
The system SHALL implement five distinct template archetypes, each with a clear strategic identity:
- **Balanced** - Versatile with no major weaknesses, consistent performance
- **Glass Cannon** - High damage output, low survivability
- **Tank Wall** - High defense and sustain, low offensive output
- **Speed Blitz** - Action economy advantage through high initiative
- **Control** - Debuffs and battlefield manipulation

#### Scenario: Archetype identity
- **WHEN** analyzing template performance
- **THEN** each template's win/loss patterns should reflect its archetype identity

### Requirement: DPS parity formulas
The system SHALL balance damage output across classes using these formulas:
- Warrior DPS = (Strength * 1.2) / Speed
- Mage DPS = (Intelligence * 1.5) / (Speed * Spell_Level)
- Healer Effectiveness = (Healing_Power * Multiplier) / Speed

#### Scenario: Class damage balance
- **WHEN** comparing sustained damage over 10 turns
- **THEN** Fighter and Mage classes should have comparable effective DPS

### Requirement: Pre-built party templates
The system SHALL provide pre-built party templates that agents can select when joining matches. Each template defines 6 characters with their classes, stats, abilities, and row assignments.

#### Scenario: List available templates
- **WHEN** an agent calls `templates.list`
- **THEN** the system returns a list of all available party templates with names and descriptions

#### Scenario: Template details
- **WHEN** an agent calls `templates.get`
- **THEN** the system returns full details of the template including all 6 characters

### Requirement: Balanced template
The system SHALL include a "Balanced" template with: 2 Fighters (front), 1 Mage (back), 1 Priest (back), 1 Thief (front), 1 Lord (front). This template offers a mix of offense, defense, and support.

#### Scenario: Balanced template composition
- **WHEN** the Balanced template is selected
- **THEN** the party has 3 front row and 3 back row characters with varied roles

### Requirement: Glass Cannon template
The system SHALL include a "Glass Cannon" template focused on high magic damage with low defense: 1 Fighter (front), 2 Mages (back), 1 Bishop (back), 1 Samurai (front), 1 Ninja (front).

#### Scenario: Glass Cannon offense
- **WHEN** the Glass Cannon template is used
- **THEN** the party has high spell slot counts and strong magic damage capabilities

### Requirement: Tank Wall template
The system SHALL include a "Tank Wall" template focused on defense and sustain: 3 Fighters (front), 1 Lord (front), 1 Priest (back), 1 Bishop (back).

#### Scenario: Tank Wall defense
- **WHEN** the Tank Wall template is used
- **THEN** the party has high HP and Defense stats with strong healing capabilities

### Requirement: Speed Blitz template
The system SHALL include a "Speed Blitz" template focused on high initiative and burst damage: 2 Thieves (front), 2 Ninjas (front), 1 Samurai (back), 1 Mage (back).

#### Scenario: Speed Blitz initiative
- **WHEN** the Speed Blitz template is used
- **THEN** party members have high Speed stats and act early in initiative order

### Requirement: Control template
The system SHALL include a "Control" template focused on debuffs and status effects: 1 Fighter (front), 2 Mages (back), 1 Priest (back), 1 Bishop (back), 1 Lord (front).

#### Scenario: Control abilities
- **WHEN** the Control template is used
- **THEN** party members have access to sleep, paralyze, and debuff spells

### Requirement: Template balance
The system SHALL balance templates such that no single template has an overwhelming advantage. Templates should have win rates between 45-55% against each other over many matches, with no template exceeding 60% win rate against the field.

#### Scenario: Template matchup
- **WHEN** analyzing historical data
- **THEN** each template has at least one favorable and one unfavorable matchup against other templates

### Requirement: Counter-play dynamics
The system SHALL ensure rock-paper-scissors dynamics without hard counters. Each template should have 1-2 natural counters.

#### Scenario: Target matchup matrix
- **WHEN** templates are properly balanced
- **THEN** matchups approximate these win rates:
  - Balanced vs all: ~50%
  - Glass Cannon beats Balanced (55%), loses to Tank (35%)
  - Tank beats Glass (65%), loses to Speed (40%)
  - Speed beats Tank (60%), loses to Glass (40%)
  - Control has slight advantages against Speed (55%) and Tank (55%)

### Requirement: Template immutability
The system SHALL not allow agents to modify template compositions during a match. Templates are fixed at match start.

#### Scenario: Template lock
- **WHEN** a match begins
- **THEN** the party composition is locked and cannot be changed

#### Scenario: No mid-match changes
- **WHEN** an agent sends PATCH to /api/matches/{matchId}/party after match start
- **THEN** the system responds with HTTP 400 Bad Request
