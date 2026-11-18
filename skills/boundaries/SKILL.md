---
name: boundaries
description: Notation and guardrails for describing APIs in a technical document (architecture note, spec, design doc, user story). Names the boundaries between apps, modules and packages with precise terms, and shows each API as types, interfaces and client code. Imposes no mapping between a document and a code granularity. Used by the Compound framework.
---

# boundaries — describe the boundaries a document crosses

AI-written code drifts into spaghetti when nobody names the boundaries before the code exists. This skill makes a document name them, with precise words and one shape, at whatever scope the document covers.

The skill writes nothing on its own: it shapes a section of the document being written.

## Vocabulary

- project: the system we want to build, contains the git repository, father of all files (app, modules, ...)
- app — has its own build manifest (`package.json`, `pom.xml`), is run, nothing depends on it.
- module — any unit the repository builds, app included, of kind `app`, `module`, `infra` or `spike` in `roadmap.yaml`. Of kind `module`: has its own build manifest, apps or modules depend on it.
- package — a directory inside an app or a module, around one responsibility.
- API — everything client code may depend on; qualified by kind: library, CLI, HTTP, MCP.
- client code — code outside an app, module or package, using only its API.
- internal code — everything that is not the API.
- interface — the Java/TypeScript keyword, never a synonym for API.

`component` is not used: it means too many things.

## No fixed structure

A document talks about the boundaries it crosses: two apps, two modules, or one function of one package. No document type is bound to a code granularity.

## Overview figure

A Boundaries section with two blocks or more opens with one figure, drawn with the `schematic` skill (pattern I, dependency map). An epic always carries one. A single block needs none.

- Boxes are the apps, modules and packages the document touches, suffixed `[new]` or `[modified]`, nothing when unchanged but needed to read the picture.
- An arrow goes from client code to the API it uses, labelled with the API kind: library, CLI, HTTP, MCP.
- In an epic, each touched box also names the stories that change it: `[modified: race-results, last-race-run]`.
- One zoom per figure: apps and modules, or the packages of one app or module, never both.
- The figure summarises the blocks and never replaces them: a name or an arrow absent from the blocks is not in the figure. When they diverge, the blocks win.

## The block

Each boundary is one block, opened by its head line:

```md
### <kind> API of <app|module|package> `<name>` — new | modified
```

- A package is located by its app or module when ambiguous: `package invoices in module billing`.
- Client code is named on the next line when it matters: `Client code: module orders`.
- Only what is new or modified. An unchanged API is not listed.

## Two zooms

Each block picks its zoom. An overview tends to sketch, a spec to full. This is a default, not a rule.

- sketch: types with no attributes, then interfaces with signatures
- full: types with main attributes, then interfaces with signatures, then client code.

Sketch:

````md
### library API of module `billing` — modified


```ts
type Invoice, User

interface InvoiceReader {
  /** empty when the order has no invoice yet */
  async byOrder(orderId: string, user:User): Promise<Invoice[]>;
}
```
````


Full:

````md
### library API of package `invoices` in module `billing` — new

Types:

```ts
type User; // already known
type Invoice = {
  id: string;
  orderId: string;
  total: Money;
  // …
};
```

Interfaces:

```ts
interface InvoiceReader {
  /** empty when the order has no invoice yet */
  async byOrder(orderId: string, user:User): Promise<Invoice[]>;
}
```

Client code, in module `orders`:

```ts
import { invoiceReader } from 'billing';

user : User = userManager.connect()
const invoices = await invoiceReader.byOrder(order.id, user);
```
````

## PseudoCode

Pseudo code, valid for every language, written in TypeScript.

## Sketch limitation

When using the sketch, use only type, enum, interface and a minimal of keyword;
When not mandatory, no `class`, only `interfaces`.
Never ever `abstract`, `readonly`, that are to sophisticated keywords.

## Types

- A type carries data only: fields, no function. `record` in Java.
- At most 5 fields, hard limit: the identity and the fields the API decision rests on. The rest is written `// …`.
- A type the document does not change is cited by name, not redeclared.
- No `export`, no `readonly`: the code decides them.

## Interfaces

- An interface carries functions only: signatures, no data field, no body.
- The implementation satisfies the interface (`const reader: InvoiceReader`, `class … implements InvoiceReader`). A function exported outside an interface is internal code.
- A one-line comment per method when the name does not tell the contract.

## Client code

- At most 10 lines, showing a real call from the client code named in the block.
- Its imports reach the entry point of the app, module or package (`index.ts`, the `exports` of `package.json`), never an internal file. That import line is the test of the boundary.

## Other kinds

A CLI, HTTP or MCP API has no type/interface split. It is written as its signature:

- CLI: the invocation, the exit codes, the stdout format.
- HTTP: method, path, body, statuses.
- MCP: tool name, input, output.

## Guardrails

- Real names from the code when they already exist.
- Dependencies go one way, no cycle; nothing depends on an app. The overview figure makes both visible: an arrow pointing into an app, or a loop, is a design defect, not a drawing one.
- No body, no internal code, no private helper, at any zoom.
- A boundary the document cannot draw cleanly is raised as an open question, not guessed.

## In Compound

Loaded by epicman, storyman, designman and archiman, which write it in a `## Boundaries` section; tddman and codeman implement from it. The terms are registered in `ubiquitous-language.md`, which wins if the two diverge. An undrawable boundary becomes a Gap in the `open-question` format.
