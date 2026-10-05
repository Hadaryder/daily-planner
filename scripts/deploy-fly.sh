#!/usr/bin/env bash
# פריסה ל-Fly.io בפקודה אחת.  שימוש:  ./scripts/deploy-fly.sh [שם-אפליקציה] [אזור]
set -euo pipefail
cd "$(dirname "$0")/.."
command -v fly >/dev/null 2>&1 || { echo "flyctl לא מותקן. הוראות: https://fly.io/docs/flyctl/install/"; exit 1; }
fly auth whoami >/dev/null 2>&1 || { echo "לא מחובר. הריצו קודם:  fly auth signup   (או fly auth login)"; exit 1; }
NAME="${1:-}"; REGION="${2:-fra}"
if [ -z "$NAME" ]; then read -r -p "שם ייחודי לאפליקציה (אותיות קטנות ומספרים, למשל dana-planner): " NAME; fi
sed -i.bak "s/^app = .*/app = \"$NAME\"/;s/^primary_region = .*/primary_region = \"$REGION\"/" fly.toml && rm -f fly.toml.bak
if fly status --app "$NAME" >/dev/null 2>&1; then echo "האפליקציה $NAME כבר קיימת, מעדכנים."; else echo "יוצרים אפליקציה $NAME…"; fly apps create "$NAME"; fi
if ! fly volumes list --app "$NAME" 2>/dev/null | grep -q dp_data; then echo "יוצרים נפח אחסון קבוע (1GB)…"; fly volumes create dp_data --app "$NAME" --region "$REGION" --size 1 --yes; fi
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then echo "מגדירים מפתח AI…"; fly secrets set --app "$NAME" ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" --stage; fi
echo "בונים ומעלים (נבנה אצל Fly, לא צריך דוקר מקומי)…"
fly deploy --app "$NAME" --ha=false --remote-only
echo; echo "מוכן!  https://$NAME.fly.dev"
