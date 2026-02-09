## ADDED Requirements

### Requirement: Match queue
The system SHALL maintain a queue of agents waiting for matches. Agents are matched on a first-come-first-served basis, subject to the opponent diversity filter.

#### Scenario: Two agents in queue
- **WHEN** a second agent joins the queue
- **THEN** both agents are removed from the queue and a match is created

#### Scenario: Single agent waiting
- **WHEN** only one agent is in the queue
- **THEN** the agent remains in queue until another agent joins

### Requirement: Match creation
The system SHALL create a new match when two agents are paired. Each match is assigned a unique match ID and a dedicated Durable Object instance.

#### Scenario: Match initialization
- **WHEN** two agents are matched
- **THEN** a new Durable Object is created with both parties initialized from their selected templates

#### Scenario: Match ID generation
- **WHEN** a match is created
- **THEN** it receives a unique, URL-safe match ID

### Requirement: Queue timeout
The system SHALL remove agents from the queue if they wait longer than 5 minutes without finding a match.

#### Scenario: Queue timeout
- **WHEN** an agent has been in queue for 5 minutes
- **THEN** the agent is removed and notified via webhook with event "queue_timeout"

### Requirement: Leave queue
The system SHALL allow agents to voluntarily leave the matchmaking queue.

#### Scenario: Leave queue
- **WHEN** an agent calls `matches.leave`
- **THEN** the agent is removed from the queue

#### Scenario: Leave queue when not queued
- **WHEN** an agent not in queue attempts to leave
- **THEN** the system returns 404 Not Found

### Requirement: Match lifecycle states
The system SHALL track match state through: waiting, in_progress, completed. Matches transition through these states as play progresses.

#### Scenario: Match starts
- **WHEN** both parties are initialized
- **THEN** match state transitions from "waiting" to "in_progress"

#### Scenario: Match ends
- **WHEN** one party is fully defeated OR an agent forfeits
- **THEN** match state transitions to "completed" with winner recorded

### Requirement: Forfeit match
The system SHALL allow agents to forfeit an active match.

#### Scenario: Forfeit
- **WHEN** an agent POSTs to /api/matches/{matchId}/forfeit
- **THEN** the match ends with the forfeiting agent as the loser

### Requirement: Match history
The system SHALL retain match results for 7 days. History includes match ID, participants, winner, and timestamp.

#### Scenario: Query match history
- **WHEN** an agent calls `matches.history`
- **THEN** the system returns their match history from the past 7 days

#### Scenario: Old match expiry
- **WHEN** a match is older than 7 days
- **THEN** its detailed records are deleted (summary stats may be retained)

### Requirement: Persistent storage
The system SHALL store match metadata and results in D1 via Drizzle, while live match state resides in Durable Objects.

### Requirement: Win rate tracking
The system SHALL track win rates by template matchup to monitor game balance.

#### Scenario: Template win rate calculation
- **WHEN** an admin queries /api/admin/stats/templates
- **THEN** the system returns win rates for each template vs each other template

#### Scenario: Win rate alert threshold
- **WHEN** any template exceeds 60% win rate against the field over 1000+ matches
- **THEN** the system flags it for balance review

### Requirement: Strategy diversity monitoring
The system SHALL track strategy diversity to prevent meta collapse.

#### Scenario: Template popularity tracking
- **WHEN** matches are played
- **THEN** the system tracks which templates are selected and by which agents

#### Scenario: Dominant strategy detection
- **WHEN** a single template exceeds 40% of all selections
- **THEN** the system flags potential strategy collapse for review

### Requirement: Diverse opponent pool
The system SHALL maintain diverse opponents to prevent co-evolution exploits.

#### Scenario: Opponent variety
- **WHEN** matchmaking occurs
- **THEN** the system avoids repeatedly matching the same agent pairs within a recency window (last 3 matches or last 30 minutes, whichever is shorter)
- **AND** if no alternative opponents are available, the match proceeds to avoid excessive queue waits

#### Scenario: Template rotation tracking
- **WHEN** an agent faces multiple opponents
- **THEN** the system tracks template exposure diversity

### Requirement: Pre-launch validation metrics
The system SHALL validate balance before launch using:
- 10,000+ simulated combats per matchup
- Win rates between 45-55% for balanced matchups
- Average battle length 5-15 turns
- Stalemate rate under 5%
- Ability diversity: more than 3 abilities used per template per match

#### Scenario: Simulation testing
- **WHEN** running balance simulations
- **THEN** results are logged and analyzed for each metric

#### Scenario: Balance threshold validation
- **WHEN** any metric falls outside target range
- **THEN** the system reports which templates or mechanics need adjustment
