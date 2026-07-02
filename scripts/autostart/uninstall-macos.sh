#!/usr/bin/env bash
# Removes the launchd agent installed by install-macos.sh.
set -euo pipefail

LABEL="com.margin-muse.server"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ -f "$PLIST" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm "$PLIST"
  echo "Removed $LABEL — the server no longer starts at login."
else
  echo "Nothing to remove ($PLIST not found)."
fi
