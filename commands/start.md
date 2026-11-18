---
description: Load the purpose of this project and the Compound routine, then run nxt.
---

<!--
Package start — the command /rb-compound:start: the project's purpose, then the Compound routine and nxt.
-->

Load the context of this project without reading too much. Write nothing, and read no file outside this project and the rb-compound plugin.

1. Read, with the Read tool, one call per file, at the root of the working directory: `README.md`, `ubiquitous-language.md` and `root.archi.md`. No other `*.archi.md`.
2. Load the skill `rb-compound:compound-routine` with the Skill tool.
3. Run `nxt` as that skill describes.

Print, in this order:

- the purpose of the project, in at most 3 lines;
- one line `<file>: absent` per missing file of step 1, never created;
- the `nxt` output.
