#!/usr/bin/env bash
# Link every skill in this repo's .claude/skills/ into the global skill folders,
# so the same files are used in every project (Claude Code, Codex/agents, Cursor).
#
# Optional: inside this repo Claude Code already loads .claude/skills/ by itself.
# Run this only if you also want the skills in other projects.
#
#   bash scripts/link-skills.sh            # link
#   bash scripts/link-skills.sh --dry-run  # show what would change
#
# - ~/.claude/skills/<name> is always linked.
# - ~/.agents/skills/<name> and ~/.cursor/skills/<name> are linked only if that
#   tool folder already has a skill with the same name.
# - An existing folder/file that is not already our link is moved to
#   ~/.claude/skills-backup-<date>/<tool>/<name> first. Nothing is deleted.
set -euo pipefail

DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$REPO/.claude/skills"
BACKUP="$HOME/.claude/skills-backup-$(date +%Y-%m-%d)"

run() { if [ $DRY = 1 ]; then echo "  would: $*"; else "$@"; fi; }

link_one() { # <tool> <target-dir> <name> <always:0|1>
  local tool=$1 dir=$2 name=$3 always=$4
  local dst="$dir/$name" src="$SRC/$name"
  if [ -L "$dst" ] && [ "$(readlink "$dst")" = "$src" ]; then
    echo "ok      $tool/$name"; return
  fi
  if [ ! -e "$dst" ] && [ ! -L "$dst" ] && [ "$always" = 0 ]; then
    return
  fi
  if [ -e "$dst" ] || [ -L "$dst" ]; then
    run mkdir -p "$BACKUP/$tool"
    run mv "$dst" "$BACKUP/$tool/$name"
    echo "backup  $tool/$name -> $BACKUP/$tool/$name"
  fi
  run mkdir -p "$dir"
  run ln -s "$src" "$dst"
  echo "linked  $tool/$name -> $src"
}

for path in "$SRC"/*/; do
  name="$(basename "$path")"
  [ -f "$path/SKILL.md" ] || continue
  link_one claude "$HOME/.claude/skills" "$name" 1
  link_one agents "$HOME/.agents/skills" "$name" 0
  link_one cursor "$HOME/.cursor/skills" "$name" 0
done
