# rb-compound

The shared skills of Compound, the documentation-first workflow of Robusta Build, as a Claude Code plugin. The repository is both the plugin `rb-compound` and the marketplace `robusta-build`.

## Skills

Seven skills, listed as `rb-compound:<skill>`. They name each other by short name. The plugin has no agent, hook or command.

- boundaries: names the boundaries between apps, modules and packages, and shows each API as types, interfaces and client code.
- checker: runs build, lint and tests before and after coding.
- code-comments: rules for comments in code, write and review modes.
- deslop: rules against AI slop in technical writing, English and French, write and review modes.
- open-question: format of the `## Open Questions & Gaps` section.
- relevant-oq: sorts a doubt into `ask`, `decide` or nothing before it is written.
- schematic: ASCII schematics in markdown, 80 columns.

A skill of the same name in the user's own skills folder is listed beside the plugin's and keeps the bare name.

## Install from GitHub

The repository is private: the machine's git credentials must reach `github.com/robusta-build/rb-compound`.

```
/plugin marketplace add robusta-build/rb-compound
/plugin install rb-compound@robusta-build
```

`marketplace add` fails on a machine with no GitHub SSH key and no stored HTTPS credential. Store a credential with the GitHub CLI:

```
gh auth login
gh auth setup-git
```

or start Claude Code with `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1`.

## Install from a local checkout

```
claude plugin marketplace add <path-to-checkout>
claude plugin install rb-compound@robusta-build
```

The plugin is read in place from the checkout: an edit, committed or not, is loaded at the next session.

One session without installing:

```
claude --plugin-dir <path-to-checkout>
```

## Updates

The manifests carry no `version`: an installed plugin follows the commits of `main`. `/plugin marketplace update robusta-build` fetches them, or auto-update does, turned on per machine in `/plugin` > Marketplaces. The new content loads at the next session.

## License

PolyForm Noncommercial 1.0.0, see `LICENSE`. The source is available; noncommercial use is free, commercial use requires a paid license from Robusta Build.
