#!/usr/bin/env bash
# Installs a launchd agent that builds (if needed) and serves Margin Muse at
# login on http://localhost:3323, so the installed PWA icon always has a live
# server behind it. Rerun after moving the repo or upgrading node.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NODE_BIN="$(command -v node)"
PORT="${MUSE_PORT:-3323}"
LABEL="com.margin-muse.server"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs"

if [ -z "$NODE_BIN" ]; then
  echo "node not found on PATH — install Node.js first" >&2
  exit 1
fi

if [ ! -d "$REPO/.next" ]; then
  echo "No production build found — running npm run build (one-time)…"
  (cd "$REPO" && npm run build)
fi

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$REPO/node_modules/next/dist/bin/next</string>
    <string>start</string>
    <string>-p</string>
    <string>$PORT</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOG_DIR/margin-muse.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/margin-muse.log</string>
</dict>
</plist>
PLIST

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo
echo "Margin Muse is now served at http://localhost:$PORT (and at every login)."
echo "Give it a dock/taskbar icon:"
echo "  Chrome/Edge: open the URL → Install icon in the address bar → Install"
echo "  Safari:      open the URL → File → Add to Dock…"
echo "Logs: $LOG_DIR/margin-muse.log   Uninstall: scripts/autostart/uninstall-macos.sh"
