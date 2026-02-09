#!/usr/bin/env bash
set -euo pipefail

SERVER_URL="${SERVER_URL:-http://localhost:3000}"
WEB_URL="${WEB_URL:-http://localhost:3001}"
TEMPLATE_ID="${TEMPLATE_ID:-balanced}"
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:9999/webhook}"

COOKIE_JAR="$(mktemp -t agentpit-cookies.XXXXXX)"
cleanup() {
  rm -f "$COOKIE_JAR"
}
trap cleanup EXIT

timestamp="$(date +%s)"
EMAIL="tester+${timestamp}@example.com"
PASS="Password123!"

echo "Server:   $SERVER_URL"
echo "Web:      $WEB_URL"
echo "Template: $TEMPLATE_ID"

echo "==> Health check"
curl -s "$SERVER_URL/" | head -c 200
echo

echo "==> Sign up"
curl -s -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Tester\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  "$SERVER_URL/api/auth/sign-up/email" >/dev/null

echo "==> Sign in"
curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  "$SERVER_URL/api/auth/sign-in/email" >/dev/null

echo "==> Create Agent A"
AGENT_A_JSON=$(curl -s -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{\"json\":{\"name\":\"Agent A\",\"webhookUrl\":\"$WEBHOOK_URL\"}}" \
  "$SERVER_URL/rpc/arena/agents/create")

echo "==> Create Agent B"
AGENT_B_JSON=$(curl -s -b "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{\"json\":{\"name\":\"Agent B\",\"webhookUrl\":\"$WEBHOOK_URL\"}}" \
  "$SERVER_URL/rpc/arena/agents/create")

A_KEY=$(node -e "const r=JSON.parse(process.env.JSON); console.log(r.apiKey ?? '');" JSON="$AGENT_A_JSON")
B_KEY=$(node -e "const r=JSON.parse(process.env.JSON); console.log(r.apiKey ?? '');" JSON="$AGENT_B_JSON")

if [[ -z "$A_KEY" || -z "$B_KEY" ]]; then
  echo "Failed to obtain API keys."
  echo "Agent A response: $AGENT_A_JSON"
  echo "Agent B response: $AGENT_B_JSON"
  exit 1
fi

echo "==> Join queue (Agent A)"
curl -s \
  -H "X-Agent-Key: $A_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"json\":{\"templateId\":\"$TEMPLATE_ID\"}}" \
  "$SERVER_URL/rpc/arena/matches/join" >/dev/null

echo "==> Join queue (Agent B)"
MATCH_JSON=$(curl -s \
  -H "X-Agent-Key: $B_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"json\":{\"templateId\":\"$TEMPLATE_ID\"}}" \
  "$SERVER_URL/rpc/arena/matches/join")

MATCH_ID=$(node -e "const r=JSON.parse(process.env.JSON); console.log(r.matchId ?? '');" JSON="$MATCH_JSON")

if [[ -z "$MATCH_ID" ]]; then
  echo "Failed to obtain matchId."
  echo "Join response: $MATCH_JSON"
  exit 1
fi

echo "MATCH_ID=$MATCH_ID"
echo "Spectator: $WEB_URL/watch/$MATCH_ID"

echo "==> Fetch match state"
curl -s \
  -H "X-Agent-Key: $A_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"json\":{\"matchId\":\"$MATCH_ID\"}}" \
  "$SERVER_URL/rpc/arena/matches/state" | head -c 800
echo
