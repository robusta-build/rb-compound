## boss roadmap

`boss roadmap` keeps `roadmap.yaml` from the build manifests Git tracks. Phase 1 step 1 applies, the other Phases do not: never chained in another boss run, no agent called, no branch switched, nothing committed (§Commits covers the `epic/*` and `feat/*` runs only). The report proposes the commit.

Refusals, nothing written:

```
boss refused: atw does not apply to roadmap, run boss roadmap.
boss refused: roadmap takes no stop, run boss roadmap.
boss refused: <pwd> is not a project root (features/, roadmap.yaml or CLAUDE.md).
boss refused: <pwd> is not in a Git work tree.
```

`roadmap.yaml` is edited as text in place, never re-serialized: comments, key order and quoting survive. What boss writes stays in the JSON-compatible YAML subset: no anchor, alias, tag or second document.

Discovery:

- Build manifests: the files `git ls-files` lists named `Cargo.toml`, `package.json`, `pom.xml`, `build.gradle`, `build.gradle.kts`, `go.mod`, `pyproject.toml`, `compose.yml`, `compose.yaml`, `docker-compose.yml`, `docker-compose.yaml`, `ansible.cfg`, or ending in `.tf`. A module's path is its manifest's folder.
- A manifest at the root is skipped: the root is the system, never a module.
- Outermost wins: a folder equal to or under a module path of the file, or under another discovered folder, adds nothing. A nested manifest the user adds by hand (a Maven module, a workspace package) is a module, kept while its folder exists.
- New modules are appended after the existing ones, in path byte order:

```yaml
  - id: web              # kebab-case of the folder name
    name: web            # the folder name
    kind: app            # first path segment apps/ → app, modules/ → module, infra/ → infra,
                         # spikes/ or spike/ → spike; none → app, named in the report
    path: code/shop/web
```

- Kebab-case: lowercase, each run of characters outside `[a-z0-9]` becomes `-`, ends trimmed. A candidate equal to an id read in the file, or shared by two new modules, takes its parent folder as prefix (`shop-web`), one more segment at a time until unique.

Upkeep:

- Kept as is: every existing module (id, name, kind, path, description, position), `system`, the content of `external_dependencies`. Boss never adds nor removes an external dependency, never guesses a move or a rename.
- Added when missing: `version: 1`; `system` (`id` the kebab-case of the root folder name, `name` that folder name); `modules: []`; `external_dependencies: []`; a module's `name` and `kind`, derived from its path as above. No `roadmap.yaml`: created with these and the discovered modules.
- Left as is and named, with the epics declaring the id, for one of five reasons boss cannot repair:
  - `invalid id`: an id outside kebab-case, `^[a-z0-9]+(-[a-z0-9]+)*$`;
  - `duplicate id`: an id two modules share;
  - `unknown kind <kind>`: a kind other than `app`, `module`, `infra` and `spike`;
  - `no path`: a module without `path`;
  - `unknown key <key>`: a module key other than `id`, `name`, `kind`, `path` and `description`.
- Folder of a module path absent on disk: declared by an epic (`**Module :** <id>` in any `features/**/*.epic.md`, `__done/` included) → kept and flagged with those epics; declared by none → removed. Folder present → kept, manifest or not.
- A second run on an unchanged tree changes nothing, byte for byte.

Report, the last message: these lines as written, in a fenced block, before any prose:

```
boss roadmap — <root>
    - created roadmap.yaml, system `<id>`
    - added `<id>` — <path> — kind app by default
    - flagged `<id>` — folder <path> gone — declared by <epic paths>
    - removed `<id>` — folder <path> gone, declared by no epic
    - left as is `<id>` — <reason> — declared by <epic paths>
Commit proposed, not run: chore(roadmap): <summary>
```

- `— kind app by default` only when no path segment gave the kind.
- No change: the single line `- unchanged`, no commit line. A moved folder shows as one `added` and one `flagged` or `removed` line.
