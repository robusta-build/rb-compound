import { readdirSync, statSync, existsSync, realpathSync, readFileSync } from "node:fs";
import { unlink, rename, writeFile } from "node:fs/promises";
import nodePath from "node:path";
import { F, C, S as Stream } from "./masala-parser/masala-parser.mjs";
function nodeTargetEnv(cwd = process.cwd(), platform = process.platform) {
  const isWindows = platform === "win32";
  return {
    path: isWindows ? nodePath.win32 : nodePath.posix,
    caseInsensitive: isWindows || platform === "darwin",
    cwd,
    realpath: (p) => {
      try {
        return realpathSync(p);
      } catch {
        return p;
      }
    },
    exists: (p) => existsSync(p),
    isDirectory: (p) => {
      try {
        return statSync(p).isDirectory();
      } catch {
        return false;
      }
    },
    readDir: (p) => {
      try {
        return readdirSync(p);
      } catch {
        return [];
      }
    }
  };
}
function nodeFs(sep = nodePath) {
  return {
    readFile: (p) => readFileSync(p, "utf8"),
    readDirEntries: (p) => {
      try {
        return readdirSync(p, { withFileTypes: true }).map((entry) => ({ name: entry.name, isDirectory: entry.isDirectory() }));
      } catch {
        return [];
      }
    },
    writeFile: (p, content) => writeFile(p, content, "utf8"),
    rename: (from, to) => rename(from, to),
    unlink: (p) => unlink(p),
    exists: (p) => existsSync(p),
    dirname: (p) => sep.dirname(p),
    join: (...parts) => sep.join(...parts),
    basename: (p) => sep.basename(p)
  };
}
const ok = (value) => ({ ok: true, value });
const err = (error) => ({ ok: false, error });
const defaultTempName = (basename, index) => `.${basename}.bulker-${process.pid}-${index}.tmp`;
async function applyEdits(edits, fs, options = {}) {
  const tempName = options.tempName ?? defaultTempName;
  const written = [];
  for (const [index, edit] of edits.entries()) {
    try {
      if (edit.kind === "delete") {
        if (fs.exists(edit.path)) await fs.unlink(edit.path);
        written.push(edit.path);
        continue;
      }
      const temp = fs.join(fs.dirname(edit.path), tempName(fs.basename(edit.path), index));
      await fs.writeFile(temp, edit.content);
      await fs.rename(temp, edit.path);
      written.push(edit.path);
    } catch (cause) {
      return err({
        path: edit.path,
        message: cause instanceof Error ? cause.message : String(cause),
        written
      });
    }
  }
  return ok(written);
}
const SUFFIXES = [
  [".epic.md", "epic"],
  [".story.md", "story"],
  [".brainstorm.md", "brainstorm"],
  [".design.md", "design"],
  // Legacy: a *.prd.md was the design doc before designman renamed the artifact.
  [".prd.md", "design"]
];
SUFFIXES.map(([suffix]) => suffix);
function docKindOf(path) {
  const name2 = path.replace(/\\/g, "/").split("/").pop() ?? path;
  for (const [suffix, kind] of SUFFIXES) {
    if (name2.endsWith(suffix)) return kind;
  }
  return null;
}
function bulkHeadingFor(kind) {
  return `${kind[0].toUpperCase()}${kind.slice(1)} OQ`;
}
function docKindFromBulkHeading(label) {
  const lowered = label.toLowerCase();
  for (const kind of ["epic", "story", "brainstorm", "design"]) {
    if (lowered === kind) return kind;
  }
  return null;
}
const BULLET = "- ";
const KEY_SOURCE = "(?:Gap|OQ)-[A-Z]{5,15}-[1-9][0-9]*";
const LEGACY_SOURCE = "(?:Gap|Open Question) [1-9][0-9]*";
const FIELD_LABELS = ["Proposition", "Rationale", "Resolution", "Route", "Rloq", "Note"];
const restOfLine = F.regex(/.*/);
const separator = F.regex(/ ?:/);
const labelled = (label) => C.string(BULLET).drop().then(label).then(separator).then(restOfLine).then(F.eos().drop());
const headParser = labelled(F.regex(new RegExp(`${KEY_SOURCE}|${LEGACY_SOURCE}`)));
const fieldParser = labelled(F.regex(new RegExp(`(?:${FIELD_LABELS.join("|")})(?= ?:)`)));
const unknownFieldParser = labelled(F.regex(/[A-Za-z][A-Za-z0-9 ]{0,29}?(?= ?:)/));
const keyParser = F.regex(new RegExp(`^${KEY_SOURCE}$`)).then(F.eos().drop());
function run(parser, line) {
  const response = parser.parse(Stream.ofChars(line));
  if (!response.isAccepted()) return null;
  const parts = response.value.array();
  return { label: parts[0], sep: parts[1], text: parts[2] };
}
function toLine(parts) {
  return { label: parts.label, sep: parts.sep, text: parts.text, continuations: [] };
}
function parseKey(label) {
  const response = keyParser.parse(Stream.ofChars(label));
  if (!response.isAccepted()) return null;
  const [type, infix, number] = label.split("-");
  return {
    type: type === "Gap" ? "gap" : "oq",
    infix,
    number: Number(number),
    text: label
  };
}
function entryTypeOf(label) {
  return label.startsWith("Gap") ? "gap" : "oq";
}
function parseHeadLine(line) {
  const parts = run(headParser, line);
  return parts ? toLine(parts) : null;
}
function parseFieldLine(line) {
  const parts = run(fieldParser, line);
  return parts ? toLine(parts) : null;
}
function parseUnknownFieldLine(line) {
  const parts = run(unknownFieldParser, line);
  return parts ? toLine(parts) : null;
}
function renderLine(line, eol) {
  const head = `${BULLET}${line.label}${line.sep}${line.text}`;
  return [head, ...line.continuations].join(eol);
}
function splitLines(text) {
  const lines = [];
  let start = 0;
  let number = 1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "\n" && ch !== "\r") continue;
    const eol = ch === "\r" && text[i + 1] === "\n" ? "\r\n" : ch;
    lines.push({ text: text.slice(start, i), eol, start, end: i + eol.length, number });
    i += eol.length - 1;
    start = i + 1;
    number++;
  }
  if (start < text.length || text.length === 0) {
    lines.push({ text: text.slice(start), eol: "", start, end: text.length, number });
  }
  return lines;
}
function detectEol(text) {
  let crlf = 0;
  let lf = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "\n") continue;
    if (i > 0 && text[i - 1] === "\r") crlf++;
    else lf++;
  }
  if (crlf === 0 && lf === 0) return "\n";
  return crlf > lf ? "\r\n" : "\n";
}
function applySplices(text, splices) {
  const sorted = [...splices].sort((a, b) => a.start - b.start || a.end - b.end);
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (current.start < previous.end) {
      throw new Error(`overlapping splices at ${previous.start}-${previous.end} and ${current.start}-${current.end}`);
    }
  }
  let out = text;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const { start, end, replacement } = sorted[i];
    out = out.slice(0, start) + replacement + out.slice(end);
  }
  return out;
}
const CANONICAL_HEADING = "## Open Questions & Gaps";
const LEGACY_HEADINGS = [
  "open questions",
  "gaps",
  "gaps / open questions",
  "open questions / gaps",
  "questions ouvertes"
];
function headingLevel(text) {
  const match = /^(#{1,6}) /.exec(text);
  return match ? match[1].length : 0;
}
function scanHeadings(text) {
  const lines = splitLines(text);
  const canonical = [];
  const legacy = [];
  for (const line of lines) {
    if (headingLevel(line.text) !== 2) continue;
    const label = line.text.slice(3).trim();
    if (label === CANONICAL_HEADING.slice(3)) canonical.push(line);
    else if (LEGACY_HEADINGS.includes(label.toLowerCase())) legacy.push(line);
  }
  return { canonical, legacy, lines };
}
function sectionSpan(lines, heading) {
  for (let i = heading.number; i < lines.length; i++) {
    const level = headingLevel(lines[i].text);
    if (level === 1 || level === 2) return { start: heading.start, end: lines[i].start };
  }
  return { start: heading.start, end: lines[lines.length - 1].end };
}
function bodyLines(lines, heading, span) {
  return lines.filter((line) => line.start >= heading.end && line.end <= span.end && line.start < span.end);
}
const isBlank = (line) => /^\s*-?\s*$/.test(line.text);
const questionOf = (head) => [head.text, ...head.continuations].join("\n");
const valueOf = (field) => [field.text, ...field.continuations].join("\n");
function build(draft) {
  const pick = (label) => draft.fields.find((field) => field.label === label);
  const resolutionField = pick("Resolution");
  const noteField = pick("Note");
  const propositionField = pick("Proposition");
  const rationaleField = pick("Rationale");
  const routeField = pick("Route");
  return {
    key: parseKey(draft.head.label),
    head: draft.head.label + draft.head.sep + draft.head.text,
    question: questionOf(draft.head),
    proposition: propositionField ? valueOf(propositionField) : null,
    rationale: rationaleField ? valueOf(rationaleField) : null,
    resolution: resolutionField ? valueOf(resolutionField) : noteField ? "" : null,
    route: routeField ? valueOf(routeField) : null,
    span: { start: draft.start, end: draft.end },
    headLine: draft.head,
    fields: draft.fields,
    line: draft.line
  };
}
function parseEntries(lines, path) {
  const entries = [];
  let draft = null;
  let field = null;
  const close = () => {
    if (draft) entries.push(build(draft));
    draft = null;
    field = null;
  };
  for (const line of lines) {
    if (isBlank(line)) {
      close();
      continue;
    }
    if (headingLevel(line.text) >= 3) {
      close();
      continue;
    }
    const head = parseHeadLine(line.text);
    if (head) {
      close();
      draft = { head, fields: [], line: line.number, start: line.start, end: line.end };
      continue;
    }
    const parsedField = parseFieldLine(line.text);
    if (parsedField) {
      if (!draft) {
        return err({ path, line: line.number, reason: `field line \`${line.text.trim()}\` before any entry head` });
      }
      draft.fields.push(parsedField);
      draft.end = line.end;
      field = parsedField;
      continue;
    }
    const unknown = parseUnknownFieldLine(line.text);
    if (unknown) {
      return err({
        path,
        line: line.number,
        reason: `unrecognised field line \`- ${unknown.label}${unknown.sep}\` inside an entry block`
      });
    }
    if (field) {
      field.continuations.push(line.text);
      draft.end = line.end;
      continue;
    }
    if (draft) {
      draft.head.continuations.push(line.text);
      draft.end = line.end;
      continue;
    }
  }
  close();
  const seen = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    if (!entry.key) continue;
    const previous = seen.get(entry.key.text);
    if (previous !== void 0) {
      return err({
        path,
        line: entry.line,
        reason: `duplicate key \`${entry.key.text}\`, already used at line ${previous}`
      });
    }
    seen.set(entry.key.text, entry.line);
  }
  return ok(entries);
}
const DOC_HEADING = /^### ([A-Za-z]+) OQ \((.+)\)\s*$/;
const EPIC_INFIX = /^# Epic ([A-Z]{5,15})\s*$/m;
const LAST_UPDATE = /^\*\*Last update:\*\*\s*(\S*)\s*$/m;
const EPIC_SLUG = /^\*\*Epic:\*\*\s*(\S*)\s*$/m;
const GROUP_HEADING = /^## Story ([A-Z]{5,15})\s*$/;
function parseBulk(text, path) {
  const lines = splitLines(text);
  const docs = [];
  let groupInfix = null;
  let open = null;
  const close = (upto) => {
    if (!open) return ok(null);
    const parsed = parseEntries(lines.slice(open.first, upto), path);
    if (!parsed.ok) return parsed;
    open.doc.entries = parsed.value;
    docs.push(open.doc);
    open = null;
    return ok(null);
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const docHeading = DOC_HEADING.exec(line.text);
    if (docHeading) {
      const closed2 = close(i);
      if (!closed2.ok) return closed2;
      const kind = docKindFromBulkHeading(docHeading[1]);
      if (!kind) {
        return err({ path, line: line.number, reason: `unknown bulk subsection \`${docHeading[1]} OQ\`` });
      }
      open = { doc: { sourcePath: docHeading[2], kind, infix: groupInfix, entries: [] }, first: i + 1 };
      continue;
    }
    const group = GROUP_HEADING.exec(line.text);
    if (group) {
      const closed2 = close(i);
      if (!closed2.ok) return closed2;
      groupInfix = group[1];
      continue;
    }
    const level = headingLevel(line.text);
    if (level >= 1 && level <= 3) {
      const closed2 = close(i);
      if (!closed2.ok) return closed2;
    }
  }
  const closed = close(lines.length);
  if (!closed.ok) return closed;
  return ok({
    path,
    text,
    epicInfix: EPIC_INFIX.exec(text)?.[1] ?? null,
    epicSlug: EPIC_SLUG.exec(text)?.[1] ?? null,
    lastUpdate: LAST_UPDATE.exec(text)?.[1] ?? null,
    docs
  });
}
const INFIX_HEADER = /^\*\*Infix\s*:\*\*\s*([A-Z]{5,15})\s*$/m;
function infixOf(text, doc) {
  const header = INFIX_HEADER.exec(text);
  if (header) return header[1];
  for (const entry of doc.section?.entries ?? []) {
    if (entry.key) return entry.key.infix;
  }
  return null;
}
function parseDocument(text, path, kind) {
  const resolvedKind = docKindOf(path) ?? "design";
  const { canonical, legacy, lines } = scanHeadings(text);
  if (canonical.length > 1) {
    return err({
      path,
      line: canonical[1].number,
      reason: `two \`${CANONICAL_HEADING}\` sections in one file`
    });
  }
  const warnings = legacy.length > 0 ? [`${path}: legacy heading \`${legacy[0].text.trim()}\` is not a section — no entry read from this file`] : [];
  if (canonical.length === 0) {
    return ok({ path, kind: resolvedKind, infix: infixOf(text, { section: null }), text, section: null, warnings });
  }
  const heading = canonical[0];
  const span = sectionSpan(lines, heading);
  const parsed = parseEntries(bodyLines(lines, heading, span), path);
  if (!parsed.ok) return parsed;
  const section = {
    span,
    headingSpan: { start: heading.start, end: heading.end },
    entries: parsed.value
  };
  return ok({ path, kind: resolvedKind, infix: infixOf(text, { section }), text, section, warnings });
}
const FIELD_ORDER = ["Proposition", "Rationale", "Rloq", "Route", "Resolution"];
const EOL = "\n";
const isFilled$2 = (value) => value !== null && value.trim() !== "";
function orderedFields(entry) {
  const ordered = [];
  for (const label of FIELD_ORDER) {
    const field = entry.fields.find((candidate) => candidate.label === label);
    if (field) ordered.push(field);
  }
  if (!ordered.some((field) => field.label === "Resolution")) {
    ordered.push({ label: "Resolution", sep: ":", text: "", continuations: [] });
  }
  return ordered;
}
function renderEntry(entry) {
  return [renderLine(entry.headLine, EOL), ...orderedFields(entry).map((field) => renderLine(field, EOL))].join(EOL);
}
function renderDocSection(doc) {
  const blocks = [`### ${bulkHeadingFor(doc.kind)} (${doc.sourcePath})`];
  const gaps = doc.entries.filter((entry) => entryTypeOf(entry.headLine.label) === "gap");
  const questions = doc.entries.filter((entry) => entryTypeOf(entry.headLine.label) === "oq");
  if (gaps.length > 0) blocks.push("Gaps:", ...gaps.map(renderEntry));
  if (questions.length > 0) blocks.push("Open Questions:", ...questions.map(renderEntry));
  return blocks.join(EOL + EOL);
}
function synthesise(docs) {
  const entries = docs.flatMap((doc) => doc.entries);
  const gaps = entries.filter((entry) => entryTypeOf(entry.headLine.label) === "gap").length;
  const filled = entries.filter((entry) => isFilled$2(entry.resolution)).length;
  const keyless = entries.filter((entry) => entry.key === null).length;
  const lines = [
    `${entries.length} ${plural(entries.length, "entry", "entries")} across ${docs.length} ${plural(docs.length, "document", "documents")}: ${gaps} ${plural(gaps, "gap", "gaps")}, ${entries.length - gaps} open ${plural(entries.length - gaps, "question", "questions")}.`,
    `${filled} filled ${plural(filled, "Resolution", "Resolutions")} ready for \`bulker resolve\`, ${entries.length - filled} pending.`
  ];
  if (keyless > 0) {
    lines.push(`${keyless} ${plural(keyless, "entry", "entries")} carry no key — key them in their source before \`bulker resolve\`.`);
  }
  return lines.join(EOL);
}
const plural = (count, one, many) => count === 1 ? one : many;
function renderBulk(bulk) {
  const blocks = [
    `# Epic ${bulk.epicInfix ?? "UNKNOWN"}`,
    [`**Last update:** ${bulk.lastUpdate ?? ""}`, `**Epic:** ${bulk.epicSlug ?? ""}`].join(EOL),
    synthesise(bulk.docs)
  ];
  let group = null;
  for (const doc of bulk.docs) {
    if (doc.kind === "epic") {
      blocks.push(renderDocSection(doc));
      continue;
    }
    const stem = groupOf(doc.sourcePath);
    if (stem !== group) {
      group = stem;
      blocks.push(`## Story ${doc.infix ?? stem.toUpperCase()}`);
    }
    blocks.push(renderDocSection(doc));
  }
  return blocks.join(EOL + EOL) + EOL;
}
function groupOf(sourcePath) {
  const normalised = sourcePath.replace(/\\/g, "/");
  const dir = normalised.includes("/") ? normalised.slice(0, normalised.lastIndexOf("/") + 1) : "";
  const name2 = normalised.slice(dir.length);
  return dir + name2.replace(/\.(epic|story|brainstorm|design|prd)\.md$/, "");
}
const isFilled$1 = (value) => value !== null && value.trim() !== "";
const emptyResolution = () => ({ label: "Resolution", sep: ":", text: "", continuations: [] });
const refOf$1 = (entry, source) => ({
  key: entry.key?.text ?? null,
  head: entry.head,
  source
});
function bulkEntryOf(sourceEntry, previous) {
  const previousResolution = previous?.fields.find((f) => f.label === "Resolution");
  const resolution = previousResolution && isFilled$1(previous.resolution) ? previousResolution : emptyResolution();
  const carried = ["Proposition", "Rationale", "Rloq", "Route"].map((label) => sourceEntry.fields.find((f) => f.label === label)).filter((f) => f !== void 0);
  return { ...sourceEntry, resolution: resolution.text, fields: [...carried, resolution] };
}
const answeredDifferently = (sourceEntry, previous) => previous !== void 0 && isFilled$1(previous.resolution) && previous.resolution.trim() !== sourceEntry.resolution.trim();
function findPrevious(previousDoc, sourceEntry) {
  if (!previousDoc) return void 0;
  if (sourceEntry.key) {
    return previousDoc.entries.find((candidate) => candidate.key?.text === sourceEntry.key.text);
  }
  return previousDoc.entries.find((candidate) => candidate.key === null && candidate.question === sourceEntry.question);
}
function orderSources(sources, relativise) {
  return [...sources].sort((a, b) => {
    const kindRank = Number(a.kind !== "epic") - Number(b.kind !== "epic");
    return kindRank !== 0 ? kindRank : relativise(a.path).localeCompare(relativise(b.path), "en");
  });
}
function planRefresh(sources, existing, options) {
  const docs = [];
  const pending = [];
  const keyless = [];
  const answeredInSource2 = [];
  for (const source of orderSources(sources, options.relativise)) {
    const entries = source.section?.entries ?? [];
    if (entries.length === 0) continue;
    const sourcePath = options.relativise(source.path);
    const previousDoc = existing?.docs.find((doc) => doc.sourcePath === sourcePath);
    const merged = [];
    for (const entry of entries) {
      const previous = findPrevious(previousDoc, entry);
      if (isFilled$1(entry.resolution)) {
        if (answeredDifferently(entry, previous)) answeredInSource2.push(refOf$1(entry, sourcePath));
        continue;
      }
      const bulkEntry = bulkEntryOf(entry, previous);
      const ref = refOf$1(bulkEntry, sourcePath);
      if (bulkEntry.key === null) keyless.push(ref);
      if (!isFilled$1(bulkEntry.resolution)) pending.push(ref);
      merged.push(bulkEntry);
    }
    if (merged.length === 0) continue;
    docs.push({ sourcePath, kind: source.kind, infix: source.infix, entries: merged });
  }
  if (docs.length === 0) {
    const action = existing === null ? "none" : "deleted";
    const edits = existing === null ? [] : [{ kind: "delete", path: options.bulkPath }];
    return ok({ edits, bulk: null, bulkAction: action, pending, keyless, answeredInSource: answeredInSource2 });
  }
  const epicInfix = docs.find((doc) => doc.kind === "epic")?.infix ?? docs[0].infix;
  const bulk = {
    path: options.bulkPath,
    text: "",
    epicInfix,
    epicSlug: options.slug,
    lastUpdate: options.today,
    docs
  };
  const rendered = renderBulk(bulk);
  if (existing !== null) {
    const asExisting = renderBulk({ ...bulk, lastUpdate: existing.lastUpdate });
    if (asExisting === existing.text) {
      return ok({ edits: [], bulk: { ...bulk, lastUpdate: existing.lastUpdate, text: existing.text }, bulkAction: "unchanged", pending, keyless, answeredInSource: answeredInSource2 });
    }
  }
  return ok({
    edits: [{ kind: "write", path: options.bulkPath, content: rendered, previous: existing?.text ?? null }],
    bulk: { ...bulk, text: rendered },
    bulkAction: "written",
    pending,
    keyless,
    answeredInSource: answeredInSource2
  });
}
const RESOLUTION = "Resolution";
function fieldLines(lines, entry) {
  const own = lines.filter((line) => line.start >= entry.span.start && line.start < entry.span.end);
  let cursor = 1 + entry.headLine.continuations.length;
  return entry.fields.map((field) => {
    const taken = own.slice(cursor, cursor + 1 + field.continuations.length);
    cursor += taken.length;
    return { field, lines: taken };
  });
}
function copySplice(lines, fallbackEol, copy) {
  const target = fieldLines(lines, copy.entry).find(({ field }) => field.label === RESOLUTION);
  if (target) {
    const first = target.lines[0];
    const last = target.lines[target.lines.length - 1];
    const eol2 = first.eol || fallbackEol;
    const replacement = renderLine({ ...copy.resolution, label: RESOLUTION, sep: target.field.sep }, eol2);
    return { start: first.start, end: last.start + last.text.length, replacement };
  }
  const lastLine = lines.filter((line) => line.start < copy.entry.span.end).pop();
  const eol = lastLine.eol || fallbackEol;
  const rendered = renderLine({ ...copy.resolution, label: RESOLUTION }, eol);
  return lastLine.eol === "" ? { start: lastLine.end, end: lastLine.end, replacement: `${eol}${rendered}` } : { start: lastLine.end, end: lastLine.end, replacement: `${rendered}${eol}` };
}
function editDocument(doc, edit) {
  if (edit.copies.length === 0) return doc.text;
  const lines = splitLines(doc.text);
  const eol = detectEol(doc.text);
  return applySplices(doc.text, edit.copies.map((copy) => copySplice(lines, eol, copy)));
}
const REFUSAL_LABELS = {
  "no-key": "no key — key it in its source by hand, resolve never guesses",
  drift: "question no longer matches its source — run `bulker <target>`, then re-read the question"
};
const refusalOf = (ref, reason) => ({
  ...ref,
  reason,
  label: REFUSAL_LABELS[reason]
});
const isFilled = (value) => value !== null && value.trim() !== "";
const refOf = (entry, source) => ({
  key: entry.key?.text ?? null,
  head: entry.head,
  source
});
const slugOf = (sourcePath) => {
  const name2 = sourcePath.replace(/\\/g, "/").split("/").pop() ?? sourcePath;
  return name2.replace(/\.(epic|story|brainstorm|design|prd)\.md$/, "");
};
const INTEGRATORS = {
  epic: (slug) => `epicman update ${slug}`,
  story: (slug) => `storyman update ${slug}`,
  design: (slug) => `designman update ${slug}`,
  brainstorm: (slug) => `storyman update ${slug} avec brainstorm`
};
function followUpOf(kind, path, count) {
  const entries = count === 1 ? "1 entry" : `${count} entries`;
  return `${INTEGRATORS[kind](slugOf(path))} — ${entries} resolved in ${path}`;
}
const toApply = (doc, entry, lookup) => isFilled(entry.resolution) && !isFilled(lookup(doc, entry)?.resolution ?? null);
function preflight(bulk, lookup, unparsable) {
  const refused = [];
  for (const doc of bulk.docs) {
    for (const entry of doc.entries.filter((candidate) => toApply(doc, candidate, lookup))) {
      const ref = refOf(entry, doc.sourcePath);
      if (entry.key === null) {
        refused.push(refusalOf(ref, "no-key"));
      } else {
        const sourceEntry = lookup(doc, entry);
        if (sourceEntry && sourceEntry.question !== entry.question) refused.push(refusalOf(ref, "drift"));
      }
    }
  }
  return refused.length > 0 || unparsable.length > 0 ? { unparsable, refused } : null;
}
function resolutionFieldOf(entry) {
  return entry.fields.find((field) => field.label === "Resolution");
}
function planResolve(bulk, sources, options) {
  const byPath = new Map(sources.map((source) => [options.relativise(source.path), source]));
  const lookup = (doc, entry) => byPath.get(doc.sourcePath)?.section?.entries.find((candidate) => candidate.key?.text === entry.key?.text);
  const failure = preflight(bulk, lookup, options.unparsable ?? []);
  if (failure) return err(failure);
  const applied = [];
  const pending = [];
  const skipped = [];
  const edits = [];
  const followUps = [];
  for (const doc of bulk.docs) {
    const copies = [];
    for (const entry of doc.entries) {
      const ref = refOf(entry, doc.sourcePath);
      if (!isFilled(entry.resolution)) {
        pending.push(ref);
        skipped.push({ ...ref, reason: "empty-resolution" });
        continue;
      }
      const sourceEntry = lookup(doc, entry);
      if (!sourceEntry) {
        skipped.push({ ...ref, reason: "not-in-source" });
        continue;
      }
      if (isFilled(sourceEntry.resolution)) continue;
      copies.push({ entry: sourceEntry, resolution: resolutionFieldOf(entry) });
      applied.push(ref);
    }
    if (copies.length === 0) continue;
    const source = byPath.get(doc.sourcePath);
    edits.push({ kind: "write", path: source.path, content: editDocument(source, { copies }), previous: source.text });
    followUps.push(followUpOf(source.kind, doc.sourcePath, copies.length));
  }
  return ok({ edits, applied, pending, skipped, followUps });
}
const SKIP_LABELS = {
  "empty-resolution": "Resolution still empty",
  "not-in-source": "no longer in its source — typically integrated by its owner",
  "answered-in-source": "answered differently in its source — never overwritten"
};
const INVOCATIONS = {
  refresh: "bulker",
  resolve: "bulker resolve"
};
const list = (title, items) => items.length === 0 ? [] : [`${title}:`, ...items.map((item) => `  - ${item}`)];
const name = (ref) => `${ref.key ?? `(keyless) ${ref.head}`} — ${ref.source}`;
function renderReport(report, dryRun) {
  const lines = [
    `${INVOCATIONS[report.phase]}${dryRun ? " --dry-run" : ""} — ${report.target}`,
    `bulk: ${report.bulk.action}${report.bulk.path ? ` (${report.bulk.path})` : ""}`
  ];
  lines.push(...list("Applied", report.applied.map(name)));
  lines.push(...list("Pending", report.pending.map(name)));
  lines.push(...list("Skipped", report.skipped.map((ref) => `${name(ref)} — ${SKIP_LABELS[ref.reason] ?? ref.reason}`)));
  lines.push(...list("Refused", report.refused.map((ref) => `${name(ref)} — ${ref.label}`)));
  lines.push(...list("Unparsable", report.unparsable.map((e) => `${e.path}:${e.line} — ${e.reason}`)));
  lines.push(...list("Warnings", report.warnings));
  lines.push(...list("Follow-ups", report.followUps));
  lines.push(`exit ${report.exitCode}`);
  return lines.join("\n");
}
function emptyReport(phase, target) {
  return {
    version: 2,
    phase,
    target,
    exitCode: 0,
    bulk: { path: "", action: "none" },
    applied: [],
    pending: [],
    skipped: [],
    refused: [],
    unparsable: [],
    warnings: [],
    followUps: []
  };
}
const PROJECT_MARKERS = ["CLAUDE.md", ".claude"];
function findProjectRoot(env, from) {
  let current = env.path.resolve(from);
  for (; ; ) {
    for (const marker of PROJECT_MARKERS) {
      if (env.exists(env.path.join(current, marker))) return current;
    }
    const parent = env.path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}
const stripWin32Prefix = (p) => p.replace(/^\\\\\?\\/, "");
function comparable(env, p) {
  const normalised = env.path.normalize(stripWin32Prefix(p));
  return env.caseInsensitive ? normalised.toLowerCase() : normalised;
}
function isWithin(env, root, candidate) {
  const a = comparable(env, root).replace(new RegExp(`\\${env.path.sep}+$`), "");
  const b = comparable(env, candidate).replace(new RegExp(`\\${env.path.sep}+$`), "");
  return b === a || b.startsWith(a + env.path.sep);
}
function realpathDeep(env, p) {
  const tail = [];
  let current = env.path.resolve(p);
  for (; ; ) {
    if (env.exists(current)) return env.path.join(env.realpath(current), ...tail);
    const parent = env.path.dirname(current);
    if (parent === current) return env.path.resolve(p);
    tail.unshift(env.path.basename(current));
    current = parent;
  }
}
function toAbsolute(env, raw) {
  const input = env.path.sep === "\\" ? stripWin32Prefix(raw) : raw;
  const direct = env.path.isAbsolute(input) ? env.path.normalize(input) : env.path.resolve(env.cwd, input);
  if (env.exists(direct) || !input.includes("\\")) return direct;
  const swapped = input.replace(/\\/g, "/");
  return env.path.isAbsolute(swapped) ? env.path.normalize(swapped) : env.path.resolve(env.cwd, swapped);
}
const EPIC_SUFFIX = ".epic.md";
const BULK_SUFFIX = ".bulk.md";
function slugOfDirectory(env, dir) {
  const epics = env.readDir(dir).filter((name2) => name2.endsWith(EPIC_SUFFIX)).sort();
  const epic = epics[0];
  if (epic) {
    return { slug: epic.slice(0, -EPIC_SUFFIX.length), epicPath: env.path.join(dir, epic) };
  }
  return { slug: env.path.basename(dir), epicPath: null };
}
function resolveTarget(input, cwd, env) {
  if (input.trim() === "") {
    return err({ kind: "usage", message: "a target is required: an epic folder, an <epic>.epic.md or an <epic>.bulk.md" });
  }
  const scoped = { ...env, cwd };
  const root = findProjectRoot(scoped, cwd);
  if (root === null) {
    return err({
      kind: "outside-project",
      message: `no Claude project found from ${cwd}: no ancestor carries a CLAUDE.md or a .claude directory`,
      root: null
    });
  }
  const realRoot = realpathDeep(scoped, root);
  const absolute = toAbsolute(scoped, input);
  const real = realpathDeep(scoped, absolute);
  if (!isWithin(scoped, realRoot, real)) {
    return err({
      kind: "outside-project",
      message: `${input} resolves to ${real}, outside the current Claude project ${realRoot}`,
      root: realRoot
    });
  }
  if (!scoped.exists(real)) {
    return err({ kind: "usage", message: `target not found: ${input}` });
  }
  if (scoped.isDirectory(real)) {
    const { slug: slug2, epicPath } = slugOfDirectory(scoped, real);
    return ok({ input, dir: real, slug: slug2, epicPath, bulkPath: scoped.path.join(real, `${slug2}${BULK_SUFFIX}`), root: realRoot });
  }
  const name2 = scoped.path.basename(real);
  const suffix = name2.endsWith(EPIC_SUFFIX) ? EPIC_SUFFIX : name2.endsWith(BULK_SUFFIX) ? BULK_SUFFIX : null;
  if (!suffix) {
    return err({ kind: "usage", message: `target must be an epic folder, an <epic>.epic.md or an <epic>.bulk.md, got ${name2}` });
  }
  const dir = scoped.path.dirname(real);
  const slug = name2.slice(0, -suffix.length);
  const epicCandidate = scoped.path.join(dir, `${slug}${EPIC_SUFFIX}`);
  return ok({
    input,
    dir,
    slug,
    epicPath: scoped.exists(epicCandidate) ? epicCandidate : null,
    bulkPath: scoped.path.join(dir, `${slug}${BULK_SUFFIX}`),
    root: realRoot
  });
}
const SKIP_DIRS = /* @__PURE__ */ new Set(["__done", "_done", "__future", "__chore", "node_modules", "dist"]);
function scanSources(dir, fs, path) {
  const found = [];
  const walk = (current) => {
    const entries = [...fs.readDirEntries(current)].sort((a, b) => a.name.localeCompare(b.name, "en"));
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
        continue;
      }
      if (docKindOf(entry.name) !== null) found.push(full);
    }
  };
  walk(dir);
  return found.sort((a, b) => a.localeCompare(b, "en"));
}
const relativiser = (env, dir) => (path) => env.path.relative(dir, path).replace(/\\/g, "/");
function loadSources(target, deps) {
  const sources = [];
  const unparsable = [];
  const warnings = [];
  for (const path of scanSources(target.dir, deps.fs, deps.env.path)) {
    const parsed = parseDocument(deps.fs.readFile(path), path);
    if (!parsed.ok) {
      unparsable.push(parsed.error);
      continue;
    }
    sources.push(parsed.value);
    warnings.push(...parsed.value.warnings);
  }
  return { sources, unparsable, warnings };
}
function loadBulk(target, deps) {
  if (!deps.fs.exists(target.bulkPath)) return { bulk: null, error: null };
  const parsed = parseBulk(deps.fs.readFile(target.bulkPath), target.bulkPath);
  return parsed.ok ? { bulk: parsed.value, error: null } : { bulk: null, error: parsed.error };
}
async function write(edits, report, deps) {
  if (deps.dryRun || edits.length === 0) return report;
  const applied = await applyEdits(edits, deps.fs, deps.apply);
  if (applied.ok) return report;
  return {
    ...report,
    exitCode: 4,
    warnings: [
      ...report.warnings,
      `write failed on ${applied.error.path}: ${applied.error.message}`,
      ...applied.error.written.length > 0 ? [`already replaced: ${applied.error.written.join(", ")}`] : []
    ]
  };
}
function refusalReport(phase, input, refusal) {
  return {
    ...emptyReport(phase, input),
    exitCode: refusal.kind === "outside-project" ? 2 : 1,
    warnings: [refusal.message]
  };
}
const refreshOptions = (target, deps) => ({
  bulkPath: target.bulkPath,
  slug: target.slug,
  today: deps.today,
  relativise: relativiser(deps.env, target.dir)
});
const gatheringWarnings = (plan) => [
  // R-BULKER-45: named once, so it can be keyed by hand before `resolve` needs it.
  ...plan.keyless.map((ref) => `keyless entry carried on its legacy identity: \`${ref.head}\` in ${ref.source} — key it before \`bulker resolve\``)
];
const answeredInSource = (plan) => plan.answeredInSource.map((ref) => ({ ...ref, reason: "answered-in-source" }));
async function gather(phase, target, loaded, existing, deps, notes) {
  const plan = planRefresh(loaded.sources, existing, refreshOptions(target, deps));
  if (!plan.ok) {
    return { ...emptyReport(phase, target.dir), exitCode: phase === "resolve" ? 3 : 1, unparsable: plan.error, warnings: loaded.warnings };
  }
  const report = {
    ...emptyReport(phase, target.dir),
    bulk: { path: target.bulkPath, action: plan.value.bulkAction },
    pending: plan.value.pending,
    skipped: answeredInSource(plan.value),
    unparsable: loaded.unparsable,
    warnings: [...loaded.warnings, ...gatheringWarnings(plan.value), ...notes]
  };
  return write(plan.value.edits, report, deps);
}
function afterCopy(sources, edits) {
  const written = new Map(edits.flatMap((edit) => edit.kind === "write" ? [[edit.path, edit.content]] : []));
  const docs = [];
  const errors = [];
  for (const source of sources) {
    const content = written.get(source.path);
    if (content === void 0) {
      docs.push(source);
      continue;
    }
    const parsed = parseDocument(content, source.path);
    if (parsed.ok) docs.push(parsed.value);
    else errors.push(parsed.error);
  }
  return errors.length > 0 ? err(errors) : ok(docs);
}
async function runRefresh(input, deps) {
  const target = resolveTarget(input, deps.env.cwd, deps.env);
  if (!target.ok) return refusalReport("refresh", input, target.error);
  const loaded = loadSources(target.value, deps);
  const bulk = loadBulk(target.value, deps);
  if (bulk.error) {
    return {
      ...emptyReport("refresh", target.value.dir),
      exitCode: 1,
      bulk: { path: target.value.bulkPath, action: "none" },
      unparsable: [bulk.error],
      warnings: [...loaded.warnings, `refusing to rebuild an unreadable bulk: ${bulk.error.path}:${bulk.error.line} — ${bulk.error.reason}`]
    };
  }
  return gather("refresh", target.value, loaded, bulk.bulk, deps, []);
}
async function runResolve(input, deps) {
  const target = resolveTarget(input, deps.env.cwd, deps.env);
  if (!target.ok) return refusalReport("resolve", input, target.error);
  const loaded = loadSources(target.value, deps);
  const { sources, unparsable, warnings } = loaded;
  const bulk = loadBulk(target.value, deps);
  if (bulk.error) {
    return {
      ...emptyReport("resolve", target.value.dir),
      exitCode: 3,
      bulk: { path: target.value.bulkPath, action: "none" },
      unparsable: [bulk.error],
      warnings
    };
  }
  if (bulk.bulk === null) {
    return gather("resolve", target.value, loaded, null, deps, [
      `no bulk at ${target.value.bulkPath} — nothing to resolve, gathered from the sources`
    ]);
  }
  const refused = (failure) => ({
    ...emptyReport("resolve", target.value.dir),
    exitCode: 3,
    bulk: { path: target.value.bulkPath, action: "unchanged" },
    refused: failure.refused ?? [],
    unparsable: failure.unparsable,
    warnings: [...warnings, "preflight failed — nothing was written"]
  });
  const plan = planResolve(bulk.bulk, sources, { relativise: relativiser(deps.env, target.value.dir), unparsable });
  if (!plan.ok) return refused(plan.error);
  const postCopy = afterCopy(sources, plan.value.edits);
  if (!postCopy.ok) return refused({ unparsable: postCopy.error });
  const rebuild = planRefresh(postCopy.value, bulk.bulk, refreshOptions(target.value, deps));
  if (!rebuild.ok) return refused({ unparsable: rebuild.error });
  const report = {
    ...emptyReport("resolve", target.value.dir),
    bulk: { path: target.value.bulkPath, action: rebuild.value.bulkAction },
    applied: plan.value.applied,
    pending: rebuild.value.pending,
    skipped: [...plan.value.skipped, ...answeredInSource(rebuild.value)],
    unparsable,
    warnings: [...warnings, ...gatheringWarnings(rebuild.value)],
    followUps: plan.value.followUps
  };
  return write([...plan.value.edits, ...rebuild.value.edits], report, deps);
}
const VERSION = "0.6.0";
const USAGE = `bulker — the Compound bulk round trip, as a deterministic command

  bulker <target> [--json] [--dry-run]           gather the Open Questions & Gaps into <epic>.bulk.md
  bulker resolve <target> [--json] [--dry-run]   copy filled Resolutions into their sources, then rebuild the bulk
  bulker --help | --version

<target> is required and never inferred: an epic folder, an <epic>.epic.md or an
<epic>.bulk.md, relative or absolute, with either path separator.

Exit codes are the machine contract:
  0  success, a no-op run included
  1  usage error: unknown option, no target, two targets, or a target that cannot be read
  2  safety refusal: the target resolves outside the current Claude project
  3  preflight failure (resolve only) — nothing was written
  4  I/O failure during the write phase; the report lists the files already replaced`;
function parseArgv(argv) {
  const parsed = { command: null, target: null, json: false, dryRun: false, error: null };
  const positional = [];
  for (const arg of argv) {
    if (arg === "--json") parsed.json = true;
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--help" || arg === "-h") parsed.command ??= "help";
    else if (arg === "--version" || arg === "-V") parsed.command ??= "version";
    else if (arg.startsWith("-")) parsed.error = `unknown option ${arg}`;
    else positional.push(arg);
  }
  if (parsed.command === "help" || parsed.command === "version") return parsed;
  const command = positional[0] === "resolve" ? "resolve" : "refresh";
  const targets = positional[0] === "resolve" || positional[0] === "refresh" ? positional.slice(1) : positional;
  const invocation = command === "resolve" ? "resolve" : "bulker";
  if (targets.length === 0) {
    return { ...parsed, command, error: command === "resolve" ? "resolve needs a target" : "no target given" };
  }
  if (targets.length > 1) return { ...parsed, command, error: `${invocation} takes exactly one target, got ${targets.length}` };
  return { ...parsed, command, target: targets[0] };
}
async function main(cli) {
  const parsed = parseArgv(cli.argv);
  if (parsed.command === "help") {
    cli.stdout(USAGE);
    return 0;
  }
  if (parsed.command === "version") {
    cli.stdout(VERSION);
    return 0;
  }
  if (parsed.error !== null || parsed.command === null || parsed.target === null) {
    cli.stderr(`${parsed.error ?? "no target given"}

${USAGE}`);
    return 1;
  }
  const env = nodeTargetEnv(cli.cwd, cli.platform ?? process.platform);
  const deps = { env, fs: nodeFs(), today: cli.today, dryRun: parsed.dryRun };
  const report = parsed.command === "refresh" ? await runRefresh(parsed.target, deps) : await runResolve(parsed.target, deps);
  cli.stdout(parsed.json ? JSON.stringify(report, null, 2) : renderReport(report, parsed.dryRun));
  if (report.exitCode !== 0 && !parsed.json) {
    cli.stderr(report.warnings.join("\n"));
  }
  return report.exitCode;
}
const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
process.exitCode = await main({
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  today,
  stdout: (text) => process.stdout.write(`${text}
`),
  stderr: (text) => process.stderr.write(`${text}
`)
});
