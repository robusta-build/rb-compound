/**
 * Package hooks — the SessionStart hook that prints the body of compound-routine into the session context.
 *
 * Design: session-hook
 * Requirements: R-SESSIONHOOK-21, R-SESSIONHOOK-22, R-SESSIONHOOK-23, R-SESSIONHOOK-24, R-SESSIONHOOK-25
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTEXT_CAP = 10000;
const ROOT_TOKEN = '${CLAUDE_PLUGIN_ROOT}';
const HEADER = 'rb-compound:compound-routine is loaded below; do not load it again with the Skill tool.';
const SKILL_PATH = 'skills/compound-routine/SKILL.md';

class HookError extends Error {}

function readSkill(pluginDir) {
  try {
    return readFileSync(join(pluginDir, SKILL_PATH), 'utf8');
  } catch (error) {
    throw new HookError(`cannot read ${SKILL_PATH}: ${error.code ?? error.message}`);
  }
}

function bodyOf(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let start = 0;
  if (lines[0] === '---') {
    const close = lines.indexOf('---', 1);
    if (close === -1) throw new HookError(`the front matter of ${SKILL_PATH} is never closed`);
    start = close + 1;
  }
  return lines.slice(start).join('\n').replace(/^(?:[ \t]*\n)+/, '');
}

function sessionContext(pluginDir, rootValue) {
  const context = `${HEADER}\n${bodyOf(readSkill(pluginDir)).split(ROOT_TOKEN).join(rootValue)}`;
  if (context.length > CONTEXT_CAP) {
    throw new HookError(`context of ${context.length} characters exceeds ${CONTEXT_CAP}; compound-routine loads by its description`);
  }
  return context;
}

function main() {
  const pluginDir = dirname(dirname(fileURLToPath(import.meta.url)));
  const rootValue = process.env.CLAUDE_PLUGIN_ROOT || pluginDir;
  try {
    const additionalContext = sessionContext(pluginDir, rootValue);
    process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext } })}\n`);
  } catch (error) {
    process.stderr.write(`rb-compound session-start: ${error instanceof HookError ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

main();
