#!/bin/sh
# HL7 Test Message Sender — Phase 258
# Usage: sh send-test-message.sh <fixture-file> [host] [port]
#
# Sends an HL7v2 message wrapped in MLLP framing to the target host:port.
# Default: host.docker.internal:2575

FIXTURE=${1:-fixtures/adt_a01.hl7}
HOST=${2:-host.docker.internal}
PORT=${3:-2575}

if [ ! -f "$FIXTURE" ]; then
  echo "ERROR: Fixture file not found: $FIXTURE"
  exit 1
fi

MSG=$(cat "$FIXTURE")

# MLLP framing: 0x0B + message + 0x1C + 0x0D
printf '\x0b%s\x1c\x0d' "$MSG" | nc -w 5 "$HOST" "$PORT"
echo ""
echo "Sent $(echo "$MSG" | head -1 | cut -d'|' -f9) to $HOST:$PORT"
