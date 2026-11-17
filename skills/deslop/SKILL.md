---
name: deslop
description: Rules against AI slop in technical writing, documentation first — English and French. Detects the language, stacks the project's and the machine's own slop list (an "AI Slop" section in CLAUDE.md) over generic patterns, and enforces documentation that states what is in place, without history or justification. Two modes — write (applied while writing) and review (read-only report of offending sentences with a rewrite). Used by the Compound framework.
---

# deslop — write what is in place, nothing else

The test for every sentence: does it tell the reader something true about the current state? If not, it goes. A pattern listed below is a signal, not a proof: a human may write "crucial" once and mean it. Density is the sign.

Never add a fact while rewriting. A deslopped text says the same things in fewer words, or says fewer things.

## Language

Use the language of the document being written or reviewed. A new document follows the language directive of the project (its CLAUDE.md or README), English otherwise. Load the patterns of that language only.

## Three layers of rules

From the most local to the most general; the more local wins on conflict:

1. The project's slop list: a heading named `AI Slop` (or `AI Slope`), at any level, in the project's `CLAUDE.md`. It carries the habits the AI took on this project.
2. The machine's slop list: the same heading in the user's own instructions, already loaded by Claude Code.
3. The generic patterns of this skill.

A missing layer is skipped silently.

## Documentation rules

- State what is in place. No history (how it used to be), no justification (why it was chosen), no account of the AI's reasoning. The why lives in git, in decision records, in design docs.
- Timeless: no "currently", "now", "new", "no longer", "as of", "actuellement", "désormais", "ne … plus". "Windows isn't currently supported" becomes "Windows isn't supported".
- Replace, don't append. A changed behaviour rewrites or deletes the passage describing the old one. Only a new capability adds lines; a modification should not grow the document.
- One fact, one place. A fact already stated elsewhere in the document is linked or dropped, not restated.
- No summary paragraph repeating the bullets around it, no closing paragraph that would fit any other document.
- No warm-up: the first sentence of a section carries information.
- Bold only for what is truly important, italic for the unusual or a citation. Bullet or definition lists over tables.

In a prompt (an agent or skill definition), keep a one-line why for a rule that is not obvious: it tells the model when the rule applies. Plead no further.

## Specifications

- Gherkin-washing: an internal mechanism (loads a skill, reads a file, calls an agent), a negative ("does not…"), or a rule already stated, dressed as Given/When/Then. An Acceptance Criterion states an outcome the user or the business can observe; how the system works is a requirement of the design file, or nothing.
- Edge-case inflation: one acceptance criterion per field left empty or date mistyped. An edge case is a business case; input validation is not listed.

## Generic patterns — English

- Filler openers: "It's worth noting", "It's important to", "Note that", "In today's…", "Let's dive in".
- Inflated vocabulary: delve, underscore, pivotal, crucial, robust, seamless, powerful, leverage, utilize, streamline, empower, unlock, elevate, tapestry, landscape, testament, comprehensive.
- Justification tails: "this ensures", "in order to", "so that", "which allows", "making it easy to".
- Copula avoidance: "serves as", "acts as", "functions as", "stands as" where "is" works.
- Superficial "-ing" analysis: "…, highlighting", "…, underscoring", "…, contributing to".
- Negative parallelism: "not just X, but Y", "it's not X, it's Y".
- Rule of three: triplets of adjectives or benefits by reflex.
- Sweeps: "from X to Y", "whether A or B" where one case is meant.
- Vague attribution: "experts say", "many developers".
- Em dashes where a comma or a period works; emoji as formatting; headings in Title Case.
- Closings: "In summary", "Overall", "In conclusion", "Happy coding".

## Generic patterns — français

- Ouvertures creuses : « Il est important de noter que », « Il convient de souligner », « Dans le paysage actuel », « À l'ère du numérique ».
- Connecteurs empilés : « En effet », « Par ailleurs », « En outre », « De plus », « Tout d'abord… ensuite… enfin ».
- Adjectifs gonflés : crucial, fondamental, essentiel, clé, incontournable, robuste, puissant.
- Verbes passe-partout : tirer parti de, exploiter, capitaliser sur, favoriser, permettre de, garantir.
- Queues de justification : « afin de », « ce qui permet de », « pour garantir », « dans le but de ».
- Calques de l'anglais : « geste » pour une action technique, « adresser un problème », « impacter ».
- Clôtures : « En conclusion », « En résumé », « N'hésitez pas à ».
- Tirets cadratins en série, gras partout, listes par réflexe.

## Modes

- write — apply the rules while writing. Before handing the text over, reread it once against the three layers.
- review — read-only. For each offending sentence: its location, the rule or pattern it breaks, and a rewrite, or "delete". End with a count per rule. Write nothing.

## In Compound

To be loaded by docman and archiman before writing or reviewing documentation.
