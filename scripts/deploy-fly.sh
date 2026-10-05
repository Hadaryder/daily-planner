#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

command -v fly >/dev/null 2>&1 || {
  echo "flyctl is not installed."
  exit 1
}

fly auth whoami >/dev/null 2>&1 || {
  echo "Not logged into Fly. Run: fly auth login"
  exit 1
}

NAME="${1:-}"
REGION="${2:-fra}"

if [ -z "$NAME" ]; then
  read -r -p "Enter a unique app name: " NAME
fi

sed -i.bak \
  "s/^app = .*/app = \"$NAME\"/;s/^primary_region = .*/primary_region = \"$REGION\"/" \
  fly.toml
rm -f fly.toml.bak

if fly status --app "$NAME" >/dev/null 2>&1; then
  echo "App $NAME already exists."
else
  echo "Creating app $NAME..."
  fly apps create "$NAME"
fi

if ! fly volumes list --app "$NAME" 2>/dev/null | grep -q dp_data; then
  echo "Creating 1GB persistent storage..."
  fly volumes create dp_data \
    --app "$NAME" \
    --region "$REGION" \
    --size 1 \
    --yes
fi

if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Setting Anthropic API key..."
  fly secrets set \
    --app "$NAME" \
    ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
    --stage
fi

echo "Deploying..."
fly deploy --app "$NAME" --ha=false --remote-only

echo
echo "Done!"
echo "https://$NAME.fly.dev"
