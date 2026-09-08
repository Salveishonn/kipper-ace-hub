# Cursor skills from Awesome Agent Skills

These folders were installed for Cursor from the
[VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)
catalog.

Cursor loads every `SKILL.md` under `.cursor/skills/` automatically. Each skill is
kept in an owner-prefixed folder (`anthropics--docx`, `supabase--postgres-best-practices`,
and so on) so two vendors can ship the same skill name without overwriting each other.

## Refresh

From the repo root:

```bash
python3 scripts/install-awesome-agent-skills.py
```

## What was skipped

- Offensive pentest / red-team catalog entries
- Red Hat catalog packs and a Notion page that are not public GitHub skill repos

Re-run the installer after upstream catalog updates.
