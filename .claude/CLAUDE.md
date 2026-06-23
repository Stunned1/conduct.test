# Orca coordination — REQUIRED

Before editing or creating ANY file in this repo you MUST:
1. Call mcp__orca__register with your name and owner (once per session)
2. Call mcp__orca__sync to get current session state
3. Call mcp__orca__claim with the file_path you are about to edit or create

This is enforced. A PreToolUse hook will block file edits on unclaimed files and
tell you exactly what to do next.
After finishing work on a file, call mcp__orca__release so other agents can proceed.
See orca/USAGE.md for full tool documentation.
