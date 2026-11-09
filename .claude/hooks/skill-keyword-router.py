#!/usr/bin/env python3
"""UserPromptSubmit hook: match keywords in the prompt and inject the matching skills.

Small skills (< inline_max_bytes) are injected in full; larger ones get a reminder
to load them with the Skill tool. Keyword list lives in skill-keywords.json next to
this script. Any error exits silently so the prompt is never blocked.

Runs from the project's .claude/settings.json (everyone who opens the repo).
A personal copy in ~/.claude/settings.json can call it with --global; that call
does nothing when the open project has its own router, so nothing is injected twice.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(HERE, "skill-keywords.json")


def find_skill(name, cwd):
    # project copy first, then the global one
    for base in (os.path.join(cwd, ".claude", "skills"), os.path.expanduser("~/.claude/skills")):
        path = os.path.join(base, name, "SKILL.md")
        if os.path.isfile(path):
            return path
    return None


def matches(prompt, spec):
    low = prompt.lower()
    if any(k.lower() in low for k in spec.get("keywords", [])):
        return True
    return any(re.search(p, prompt, re.IGNORECASE) for p in spec.get("patterns", []))


def project_has_router(cwd):
    # walk up from cwd looking for a project-level copy of this hook
    d = os.path.abspath(os.environ.get("CLAUDE_PROJECT_DIR") or cwd)
    while True:
        if os.path.isfile(os.path.join(d, ".claude", "hooks", "skill-keyword-router.py")):
            return True
        parent = os.path.dirname(d)
        if parent == d:
            return False
        d = parent


def main():
    data = json.load(sys.stdin)
    prompt = data.get("prompt") or ""
    cwd = data.get("cwd") or os.getcwd()
    if "--global" in sys.argv[1:] and project_has_router(cwd):
        return
    with open(CONFIG, encoding="utf-8") as f:
        cfg = json.load(f)
    limit = int(cfg.get("inline_max_bytes", 20480))

    hits = [n for n, spec in cfg.get("skills", {}).items() if matches(prompt, spec)]
    always = [n for n in cfg.get("always", []) if n not in hits]

    inline, remind = [], []
    for name in hits:
        path = find_skill(name, cwd)
        if not path:
            continue
        if os.path.getsize(path) < limit:
            inline.append((name, path))
        else:
            remind.append((name, path))
    for name in always:
        path = find_skill(name, cwd)
        if path:
            remind.append((name, path))

    if not inline and not remind:
        return

    out = ["[skill-keyword-router] คำสั่งนี้ตรงกับ skill ต่อไปนี้ ต้องทำตามก่อนเริ่มงาน"]
    for name, path in remind:
        out.append(f"- ต้องโหลด skill `{name}` ด้วย Skill tool ก่อนลงมือ ({path})")
    for name, path in inline:
        out.append(f"- skill `{name}` แนบเนื้อหาเต็มไว้ด้านล่างแล้ว ({path})")
    for name, path in inline:
        with open(path, encoding="utf-8") as f:
            out.append(f"\n===== skill: {name} =====\n{f.read()}\n===== end skill: {name} =====")
    print("\n".join(out))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
