#!/usr/bin/env bash
# Deploys the Email Monitoring feature: migration, edge functions, and secrets.
#
# Requires the Supabase CLI to already be logged in and linked to your project:
#   npx supabase login
#   npx supabase link --project-ref <your-project-ref>
#
# Required environment variables (export these, or set them inline before running):
#   GEMINI_API_KEY              — shared with ai-complete; get one at aistudio.google.com/apikey
#   GMAIL_CLIENT_ID              — Google Cloud Console OAuth client ID
#   GMAIL_CLIENT_SECRET          — Google Cloud Console OAuth client secret
#   GMAIL_TOKEN_ENCRYPTION_KEY   — generate with: openssl rand -base64 32
#   CRON_SECRET                  — generate with: openssl rand -base64 24
#
# Usage: ./deploy-email-monitoring.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${YELLOW}==>${NC} $1"; }
ok() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

REQUIRED_VARS=(GEMINI_API_KEY GMAIL_CLIENT_ID GMAIL_CLIENT_SECRET GMAIL_TOKEN_ENCRYPTION_KEY CRON_SECRET)
missing=0
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo -e "${RED}✗${NC} Missing required environment variable: $var"
    missing=1
  fi
done
if [ "$missing" -eq 1 ]; then
  fail "Set the missing variables above and re-run. See the comment block at the top of this script."
fi
ok "All required secrets are set."

command -v npx >/dev/null 2>&1 || fail "npx is not on PATH — install Node.js first."

info "Running tests..."
npm run test || fail "Tests failed — fix them before deploying."
ok "Tests passed."

info "Type-checking and building the frontend..."
npm run build || fail "Build failed."
ok "Build succeeded."

info "Applying database migrations..."
npx supabase db push || fail "Migration push failed."
ok "Migrations applied."

info "Deploying edge functions..."
for fn in classify-emails gmail-oauth-callback gmail-fetch-messages agent-cron-check; do
  info "  -> $fn"
  npx supabase functions deploy "$fn" || fail "Failed to deploy $fn."
done
ok "All edge functions deployed."

info "Setting server secrets..."
npx supabase secrets set \
  GEMINI_API_KEY="$GEMINI_API_KEY" \
  GMAIL_CLIENT_ID="$GMAIL_CLIENT_ID" \
  GMAIL_CLIENT_SECRET="$GMAIL_CLIENT_SECRET" \
  GMAIL_TOKEN_ENCRYPTION_KEY="$GMAIL_TOKEN_ENCRYPTION_KEY" \
  CRON_SECRET="$CRON_SECRET" \
  || fail "Failed to set secrets."
ok "Secrets set."

echo ""
ok "Email Monitoring deployed."
echo "Next steps:"
echo "  1. Set VITE_GMAIL_CLIENT_ID in your frontend .env (same value as GMAIL_CLIENT_ID above) and redeploy the frontend."
echo "  2. In the Supabase Dashboard, add an OAuth redirect URI of <your app origin>/app/settings to your Gmail OAuth client."
echo "  3. Schedule agent-cron-check to run periodically (Dashboard -> Edge Functions -> agent-cron-check -> Schedules),"
echo "     sending header 'x-cron-secret: \$CRON_SECRET' with each invocation."
echo "  4. Monitor logs from the Supabase Dashboard -> Edge Functions -> classify-emails -> Logs."
