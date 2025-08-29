#!/bin/bash
set -euo pipefail

# Load ENV variables
API="${API:-http://localhost:8000}"
USERNAME="${USERNAME:?Missing USERNAME env}"
PASSWORD="${PASSWORD:?Missing PASSWORD env}"

# Get token
TOKEN=$(curl -s -X POST "$API/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$USERNAME&password=$PASSWORD" \
  | jq -r .access_token)

# Call backup endpoint
curl -s -X BACKUP "$API/backup-db/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
