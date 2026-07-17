# CLAUDE.md

These rules apply to every task in this project unless explicitly overridden.
Bias: caution over speed on non-trivial work. Use judgment on trivial tasks.

## Rules

### Rule 1 — Think Before Coding

State assumptions explicitly. If uncertain, ask rather than guess.
Push back when a simpler approach exists. Stop when confused.

### Rule 2 — Simplicity First

Minimum code that solves the problem. Nothing speculative.
No features beyond what was asked. No abstractions for single-use code.

### Rule 3 — Surgical Changes

Touch only what you must. Clean up only your own mess.
Don't "improve" adjacent code, comments, or formatting. Match existing style.

### Rule 4 — Goal-Driven Execution

Define success criteria, then iterate until verified — don't robotically run steps.

### Rule 5 — Keep context lean

Prefer scoped reads/searches over dumping whole files. Summarize long tool output instead of quoting it.

### Rule 6 — Read before you write

Before adding code, read exports, immediate callers, shared utilities.
If unsure why code is structured a certain way, ask.

### Rule 7 — Checkpoint after every significant step

Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back. Stop and restate.

### Rule 8 — Fail loud

"Completed" is wrong if anything was skipped silently. "Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.

## What this is

GraphQL Faker is a CLI tool that stands up a local GraphQL server returning fake data driven by [faker.js](https://fakerjs.dev/). Users write GraphQL SDL annotated with custom directives (`@fake`, `@examples`, `@listLength`); no resolver code is required. It can also **proxy** ("extend") a real remote GraphQL API and merge faked fields into the real responses.

This is an **ESM** project (`"type": "module"`), Node `>= 22.13`. The published package/bin is `@vbait/graphql-faker` / `vb-graphql-faker`.

## Commands

- `npm run build` — `rm -rf dist && tsc && copy:graphql && chmod +x dist/index.js`. `dist/index.js` is the CLI entry (`bin`).
- `npm start` — run the server from source with live reload via `tsx watch src/index.ts`.
- `npm run debug` — `tsx --inspect src/index.ts` for a debugger.
- `npm run example` — build, then serve `examples/test.faker.graphql` from `dist/` (no install needed).
- `npm test` — full gate: `lint` + `check` + `prettier:check` + `check:spelling`. **No runtime/unit tests** — "test" is entirely static checks.
- `npm run lint` — ESLint flat config (`eslint.config.js`, 0 warnings). `npm run check` — `tsc --noEmit`. `npm run prettier` — auto-format. `npm run check:spelling` — cspell (add project words to `cspell.yml`).

There is no test suite. To verify behavior, build and run the server (or `npm start`), then issue GraphQL queries.

## Running the CLI

```
vb-graphql-faker [options] [SDL file]
vb-graphql-faker --open                                    # mock mode, opens GraphiQL
vb-graphql-faker ./ext.graphql --extend http://api/graphql # proxy/extend mode
```

Default SDL file: `./schema.faker.graphql` (mock) or `./schema_extension.faker.graphql` (extend). If the file doesn't exist, a bundled default (`src/default-schema.graphql` / `src/default-extend.graphql`) is used. Server serves `/graphql` (default port 9002, or `env.PORT`); the same URL returns the GraphiQL IDE (CDN-loaded) for browser requests.

## Architecture

The pipeline is: **CLI args → build an augmented schema → serve it with faking resolvers**.

- `src/index.ts` — entry point and Express 5 server wiring. Chooses mock vs proxy mode, builds the schema, and mounts `/graphql` via **`graphql-http`** (`createHandler`). The custom `execute` injects `fakeFieldResolver`/`fakeTypeResolver` (and the proxy `executeFn` in extend mode); browser GET requests are served an inline GraphiQL HTML page. `__dirname` is derived from `import.meta.url` (ESM).
- `src/cli.ts` — arg parsing via Node's `parseArgs`. `--header`/`--forward-headers` are only valid with `--extend`. Owns the `--help` text.
- `src/fake_definition.ts` — **the core schema builder.** `fakeDefinitionAST` is a hardcoded GraphQL document defining the `@fake`, `@examples`, `@listLength` directives plus the `fake__Types`/`fake__Locale`/`fake__options` enums and inputs (this is the source of truth for which fake types exist). `buildWithFakeDefinitions()` strips these definitions out of the user's SDL (so user SDL stays portable — see issue #75), then re-injects them, then applies the extension SDL if proxying. Fields coming from the extension SDL are tagged `extensions.isExtensionField = true`, which downstream code uses to distinguish faked fields from real remote fields.
- `src/fake_schema.ts` — the faking resolvers `fakeFieldResolver` and `fakeTypeResolver`. For each field it tries the real value first (proxy data), then falls back to faking based on directives found on the field or its type. Reads directive args from both `astNode` and `extensionNodes`. Special-cases mutations (merges `input`/args into the returned object) and abstract types (picks a random possible type; the type resolver returns the type **name**, required by graphql 16+).
- `src/fake.ts` — maps every `fake__Types` enum value to a faker.js (v10) call (`stdScalarFakers` handles Int/Float/String/Boolean/ID). This is where you add or change what a given fake type produces; keep it in sync with the enum in `fake_definition.ts`. `formatDate()` is a small native replacement for `moment` — supports tokens `YYYY YY MM M DD D HH H mm m ss s` and `[]` literal escaping; no format → ISO-8601.
- `src/proxy.ts` — `getProxyExecuteFn` returns a custom `executeFn`. It strips extension (faked) fields and `__typename`s from the query before forwarding to the remote server, then splices remote data + errors back into the result tree so faked fields are resolved locally over real data.
- `src/utils.ts` — SDL reading, remote schema introspection, and the `graphqlRequest` HTTP helper (uses the global `fetch`/`Headers`, Node 22+).

## Conventions & gotchas

- **ESM**: relative imports must carry the `.js` extension (e.g. `./fake.js`), even though the source is `.ts` (NodeNext resolution). `tsconfig.json` is the single compilation context (the old `src/editor` webpack build is gone).
- The `fake__Types` enum in `fake_definition.ts` and the function map in `fake.ts` must stay aligned — adding a fake type means editing both.
- Imports must be sorted (`simple-import-sort` ESLint rule); run `npm run prettier` and `npm run lint` before finishing.
- `.graphql` files are runtime assets, not compiled — they're copied into `dist/` by the `copy:graphql` script and read with `fs.readFileSync` at runtime relative to `__dirname`.
- `graphql` is on **17**, but `graphql-http` (the only dep using graphql) declares `peer graphql "<=16"`. The combo is verified working (tsc + mock + proxy + CI), so `npm install` prints a peer **warning** and `npm ls` marks graphql `invalid` — this is expected, not an error. If graphql-http or graphql 17.x changes, re-verify. `express-graphql` was dropped (abandoned) in favor of `graphql-http`.
- Node `>= 22.13` required (`.node-version` = `22`).
