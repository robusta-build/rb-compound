/**
 * Package hooks, license reading — the license number of the plugin option and the occasional free-version reminder.
 *
 * Design: license-key
 * Requirements: R-LICENSEKEY-21, R-LICENSEKEY-22, R-LICENSEKEY-23, R-LICENSEKEY-24, R-LICENSEKEY-41, R-LICENSEKEY-42, R-LICENSEKEY-44, R-LICENSEKEY-46
 */

export const REMINDER_ONE_IN = 40;

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PREFIX = 'RBC';
const TOTAL_LENGTH = 19;
const FREE_VERSION = 'This is the free version, for noncommercial use. Commercial license: https://robusta.build';
const REASON_WORDS = {
  prefix: 'it does not start with RBC',
  length: 'wrong number of characters',
  character: 'a character outside 0-9 and A-Z',
  check: 'wrong check character',
};

function normalise(raw) {
  return raw.replace(/[\s\p{Pd}]/gu, '').toUpperCase();
}

function checkCharacter(body) {
  const n = ALPHABET.length;
  let factor = 2;
  let sum = 0;
  for (let i = body.length - 1; i >= 0; i--) {
    const addend = factor * ALPHABET.indexOf(body[i]);
    factor = factor === 2 ? 1 : 2;
    sum += Math.floor(addend / n) + (addend % n);
  }
  return ALPHABET[(n - (sum % n)) % n];
}

/** The state of a raw number: normalised then checked; undefined, empty or not a string is absent; never throws. */
export function readLicense(raw) {
  try {
    if (typeof raw !== 'string') return { kind: 'absent' };
    const number = normalise(raw);
    if (number === '') return { kind: 'absent' };
    if (!number.startsWith(PREFIX)) return { kind: 'refused', reason: 'prefix' };
    if (number.length !== TOTAL_LENGTH) return { kind: 'refused', reason: 'length' };
    const tail = number.slice(PREFIX.length);
    if (!/^[0-9A-Z]+$/.test(tail)) return { kind: 'refused', reason: 'character' };
    if (checkCharacter(tail.slice(0, -1)) !== tail.slice(-1)) return { kind: 'refused', reason: 'check' };
    return { kind: 'valid' };
  } catch {
    return { kind: 'absent' };
  }
}

/** False when the entry point is an SDK one, or CI is set to anything but 0 or false. */
export function isInteractive(env) {
  if (String(env.CLAUDE_CODE_ENTRYPOINT ?? '').startsWith('sdk-')) return false;
  const ci = env.CI;
  if (ci === undefined) return true;
  const value = String(ci).toLowerCase();
  return value === '0' || value === 'false';
}

/** The visible text for an absent or refused state. */
export function reminderText(state) {
  if (state.kind === 'refused') {
    return `rb-compound: the configured license number is refused (${REASON_WORDS[state.reason]}). ${FREE_VERSION}`;
  }
  return 'rb-compound is the free version, for noncommercial use. Commercial license: https://robusta.build';
}

function sourceOf(stdin) {
  try {
    const input = JSON.parse(stdin);
    return input !== null && typeof input === 'object' && !Array.isArray(input) ? input.source : undefined;
  } catch {
    return undefined;
  }
}

/** The systemMessage of this start, or undefined; never throws; draw defaults to Math.random, read at call time. */
export function reminder(stdin, env, draw = () => Math.random()) {
  try {
    if (sourceOf(stdin) !== 'startup') return undefined;
    if (!isInteractive(env)) return undefined;
    const state = readLicense(env.CLAUDE_PLUGIN_OPTION_LICENSE_NUMBER);
    if (state.kind === 'valid') return undefined;
    if (!(draw() < 1 / REMINDER_ONE_IN)) return undefined;
    return reminderText(state);
  } catch {
    return undefined;
  }
}
