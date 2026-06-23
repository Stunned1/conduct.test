# Orca hooks

Orca installs two Claude Code hooks to enforce coordination protocol. Both run
`orca-hook-check/index.mjs`, which asks Orca's local server about the target file.
They are silent and non-blocking whenever Orca isn't running or has no active
session — zero friction for solo work.

## PreToolUse — blocks unclaimed file edits
Fires before every Edit, Write, MultiEdit, or NotebookEdit tool call.
Checks whether the target file has an active claim in the current session.
If an active session tracks the file and nobody has claimed it: blocks the edit
and returns:

  "✗ Orca: {file} is not claimed.
   Required before editing:
     1. mcp__orca__register (if not done this session)
     2. mcp__orca__sync
     3. mcp__orca__claim with file_path: \"{file}\"
   Then retry your edit."

If the file is claimed (by any agent), or there's no active session, or the file
is outside the tracked repo: allows the edit through silently. Claims are
advisory, so a claim held by another agent does not block.

## PostToolUse — reminds agents to release
Fires after every Edit, Write, MultiEdit, or NotebookEdit tool call. Never blocks.
If the file is still claimed and was claimed more than 5 minutes ago without a
release call:
  "Orca: you claimed {file} N min ago without releasing it. Call
   mcp__orca__release when done so other agents can proceed."

## Hook status
The active hook configuration lives in `.claude/settings.json` (Claude Code reads
hooks from there) and runs `orca-hook-check/index.mjs`. `.claude/hooks.json` is a
companion placeholder kept for reference — Claude Code does not read it directly.
