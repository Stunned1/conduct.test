#!/usr/bin/env node

// Orca coordination hook for Claude Code.
//
// Invoked by the PreToolUse / PostToolUse hooks in .claude/settings.json before
// and after every file edit. It asks Orca's local HTTP server whether the target
// file is claimed, and either allows or blocks the edit.
//
// Non-negotiable: this must be completely silent and non-blocking whenever Orca
// isn't running or has no active session. Every error path exits 0 with zero
// output, so solo work and Orca-less sessions feel exactly as if no hook existed.
// The only output is a block message (exit 1) or a release reminder (exit 0).

const ORCA_PORT = 8765;
const TIMEOUT_MS = 500;

const mode = process.argv[2]; // "pre-edit" or "post-edit"

// Claude Code passes hook context via stdin as JSON.
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", async () => {
  try {
    const ctx = JSON.parse(input);
    const filePath =
      ctx.tool_input?.path ||
      ctx.tool_input?.file_path ||
      ctx.tool_input?.notebook_path ||
      "";

    if (!filePath) process.exit(0); // no file path, allow

    const agentId = ctx.session_id || "";
    const url =
      `http://127.0.0.1:${ORCA_PORT}/hook/${mode}` +
      `?file=${encodeURIComponent(filePath)}` +
      `&agent=${encodeURIComponent(agentId)}`;

    const response = await fetchWithTimeout(url, TIMEOUT_MS);
    const body = await response.text();

    if (mode === "pre-edit") {
      if (body === "block") {
        console.error(
          `✗ Orca: ${filePath} is not claimed.\n` +
            `Required before editing:\n` +
            `  1. mcp__orca__register (if not done this session)\n` +
            `  2. mcp__orca__sync\n` +
            `  3. mcp__orca__claim with file_path: "${filePath}"\n` +
            `Then retry your edit.`,
        );
        process.exit(1); // block the edit
      }
      process.exit(0); // "allow" or any other response → allow
    } else if (mode === "post-edit") {
      if (body.startsWith("remind:")) {
        const minutes = body.split(":")[1];
        console.error(
          `Orca: you claimed ${filePath} ${minutes} min ago` +
            ` without releasing it. Call mcp__orca__release` +
            ` when done so other agents can proceed.`,
        );
      }
      process.exit(0); // post-edit never blocks
    }

    process.exit(0); // unknown mode → allow
  } catch (e) {
    // Any error — connection refused, timeout, parse error — silent allow.
    process.exit(0);
  }
});

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
