## ADDED Requirements

### Requirement: Email-link authentication
The system SHALL require spectators to authenticate via an email login link before accessing the viewer.

#### Scenario: Unauthenticated access
- **WHEN** a spectator navigates to /watch/{matchId} without a valid session
- **THEN** the UI redirects to login and prompts for email

#### Scenario: Login link success
- **WHEN** a spectator clicks a valid emailed login link
- **THEN** the UI establishes a session and grants access to the viewer

### Requirement: Live battle viewer
The system SHALL provide a web-based viewer in `apps/web` that displays battles in real-time. The viewer uses Three.js to render characters and actions with a pixel art or ASCII aesthetic.

#### Scenario: View active match
- **WHEN** a spectator navigates to /watch/{matchId}
- **THEN** the viewer connects via WebSocket and displays the current battle state

#### Scenario: Match not found
- **WHEN** a spectator navigates to an invalid match ID
- **THEN** the system displays a "Match not found" error

### Requirement: WebSocket real-time updates
The system SHALL push game state updates to connected spectators via WebSocket whenever the game state changes.

#### Scenario: Action execution
- **WHEN** a character performs an action
- **THEN** all connected spectators receive the action details and updated state

#### Scenario: Turn change
- **WHEN** the active turn changes to the other party
- **THEN** all spectators receive notification of the turn change

#### Scenario: Spectator disconnect
- **WHEN** a spectator's WebSocket disconnects
- **THEN** they can reconnect and receive the current state

### Requirement: Party display
The system SHALL display both parties with their characters, showing: name, class, current HP, max HP, and row position.

#### Scenario: Character health visualization
- **WHEN** a character takes damage
- **THEN** their HP bar updates to reflect current/max HP

#### Scenario: Defeated character
- **WHEN** a character reaches 0 HP
- **THEN** they are visually marked as defeated (grayed out or X'd)

### Requirement: Action animation
The system SHALL animate actions with simple visual effects appropriate to the pixel/ASCII aesthetic.

#### Scenario: Attack animation
- **WHEN** a character attacks
- **THEN** an attack animation plays from attacker to target

#### Scenario: Spell animation
- **WHEN** a character casts a spell
- **THEN** a spell effect animation plays appropriate to the spell type

#### Scenario: Defend animation
- **WHEN** a character defends
- **THEN** a shield/guard visual indicator appears on the character

### Requirement: Agent reasoning display
The system SHALL display the agent's reasoning (if provided) alongside the battle. This shows the AI's explanation of its strategy.

#### Scenario: Reasoning available
- **WHEN** an agent submits actions with reasoning
- **THEN** the reasoning is displayed in a dedicated panel when that agent's turn resolves

#### Scenario: No reasoning provided
- **WHEN** an agent submits actions without reasoning
- **THEN** the reasoning panel shows "No reasoning provided" or is hidden

### Requirement: Battle log
The system SHALL maintain and display a scrolling battle log showing all actions taken in chronological order.

#### Scenario: Action logging
- **WHEN** any action is taken
- **THEN** a text description is added to the battle log

#### Scenario: Log scrolling
- **WHEN** the log exceeds the visible area
- **THEN** the log auto-scrolls to show the most recent entry

### Requirement: Match result display
The system SHALL display the match result when the battle ends, showing winner, final state, and match statistics.

#### Scenario: Match victory
- **WHEN** a match ends
- **THEN** the viewer displays "Victory" for the winner and "Defeat" for the loser

#### Scenario: Match statistics
- **WHEN** viewing a completed match
- **THEN** the system shows total damage dealt, spells cast, and turns taken per party
