# AGENTS.md — io-platform-core

Monorepo of the IO platform: publishable SDKs/shared packages (`packages/`) and
deployable example apps (`apps/`) built on a **hexagonal (ports & adapters)**
architecture, plus Terraform IaC (`infra/`).

For setup (devcontainer, `nodenv`, `tfenv`, `pre-commit`) and release flow, read
[README.md](README.md) — don't duplicate it here.

## Toolchain (non-negotiable)

- **Package manager: `pnpm`** (workspaces + [catalog](pnpm-workspace.yaml)). Never use `npm`/`yarn`.
- **Task runner: `turbo`** ([turbo.json](turbo.json)). Run monorepo-wide tasks through it.
- **Node 22** (`.node-version` pins the exact version). Use **`nodenv`** to install and activate it:
  ```bash
  nodenv install   # reads .node-version; installs the exact pinned version
  ```
  Never use a different Node version — mismatches cause subtle build/test failures.
- **TypeScript ~5.8** with `moduleResolution: nodenext`.
- **Versioning/release: Changesets.** Any change to a publishable package needs a changeset (`pnpm changeset`). [**IMPORTANT**] If there is a changeset file already present, consolidate the changes into a single changeset file, and remove the others.

### Dependencies

- Shared/third-party versions live in the **catalog** in [pnpm-workspace.yaml](pnpm-workspace.yaml); reference them with `"<dep>": "catalog:"` instead of a literal version.
- Internal packages are referenced with `"@pagopa/<pkg>": "workspace:^"`.
- Add deps with `pnpm --filter <workspace> add <dep>` (use `-w` for the root). After editing the catalog, run `pnpm install`.

## Commands

```bash
pnpm build                       # turbo run build (respects ^build deps)
pnpm code-review                 # full verification pipeline: typecheck, format:check, lint:check, test:coverage
pnpm format                      # auto-fix formatting across the repo
pnpm format:check                # check formatting without fixing
pnpm typecheck                   # type-check every workspace
pnpm test                        # run all tests (vitest); or: pnpm -r test
pnpm test:coverage               # run tests with coverage reporting
pnpm lint                        # auto-fix lint/style issues (eslint --fix .)
pnpm lint:check                  # check lint/style without fixing
pnpm version                     # bump versions using changesets
pnpm release                     # build and publish packages
pnpm --filter <workspace> <script>   # run one package's script
```

Per-workspace scripts: `clean`, `build` (`tsc`), `typecheck`, `format`, `format:check`,
`lint`, `lint:check`, `test` (`vitest run`), `test:coverage`.

> **Development verification flow:** run `pnpm format` first to auto-fix formatting,
> then `pnpm code-review` to run the full check pipeline.

## Linting & formatting — ALWAYS autofix first

ESLint flat config is `@pagopa/eslint-config` (re-exported from `eslint.config.js`)
and it owns formatting too.

- **To fix lint/style errors, run the autofixer — do not hand-edit them:**
  - Whole repo: `pnpm lint` (= `eslint --fix .`)
  - One workspace: `pnpm --filter <workspace> lint`
- Only fix manually what ESLint reports but cannot autofix. Verify with `pnpm lint:check`.

## Repository layout

- `apps/*` — deployable artifacts; **reference implementations** of the architecture or **production shared services**. Only reference imprementation will be declared `private: true` (not published).
- `packages/*` — reusable modules. Publishable `hexagonal-core` package plus or cross product shared packages without the `io-` prefix.
  `typescript-config-node` (shared `tsconfig`, internal/`private`).
- `infra/*` — Terraform IaC (see below).


## Architecture — hexagonal (ports & adapters)

Each app under `src/` is organized in layers with a strict inward dependency rule
(**`domain` ← `application` ← `adapters`**); the `domain` layer must stay
framework-free.

| Layer | Path | Contains |
|-------|------|----------|
| Domain | `domain/entities/*.entity.ts`, `domain/ports/**/*.repository.ts` | Entities + port **interfaces** (`IUserProfileRepository`) |
| Application | `application/use-cases/*.use-case.ts` | Business logic as factories: `makeXxxUseCase(deps): UseCase<In,Out,Err>` |
| Adapters (inbound) | `adapters/inbound/*.handler.ts` + `dto/*.dto.ts` | HTTP/trigger handlers, route contracts; adapter-specific DTOs only when an input/output mapper transforms a shape |
| Adapters (outbound) | `adapters/outbound/persistence/*.repository.ts` | Port implementations (e.g. in-memory) |
| Composition | `createApp.ts`, `main.ts` | Wire adapters → use cases; process entry point |

Tests live next to code in `__tests__/*.test.ts`.

### Required patterns

- **Errors: `neverthrow` `Result<T, E>`** — never throw for business/domain errors.
  Error types extend `BaseError` from `@pagopa/hexagonal-core/domain/errors`
  (`NotFoundError`, `ConflictError`, `GenericError`, `ValidationError`).
- **Validation & types: `zod` v4.** Model value-objects/entities/DTOs as schemas;
  use **branded types** (`.brand<"EmailAddress">()`). Value objects go in
  `value-objects/*.value-object.ts` exporting `XxxSchema` + `type Xxx`.
- **Shared DTO schemas live in `domain/entities/`**. Request/response schemas that
  pass unchanged between an inbound adapter and a use case belong with the domain
  model. Adapter-specific shapes (transport headers, mapper outputs) live in
  `adapters/inbound/dto/*.dto.ts`. The application layer must not contain DTO
  schemas or import adapter DTOs.
- **Dependency injection via factory functions** (`makeXxxUseCase`, `mount<X>Handler`);
  wire everything explicitly in `createApp.ts`. Repository interfaces are `I`-prefixed.
- **ESM-only source with explicit `.js` import extensions** (required by `nodenext`),
  e.g. `import { x } from "./user-profile.entity.js"`.

### Core packages

- `@pagopa/hexagonal-core` — framework-agnostic hexagonal building blocks (domain + adapters).
- `@pagopa/hexagonal-fastify` — Fastify inbound adapter and route utilities for hexagonal apps.
- `@pagopa/hexagonal-openapi` — code-first OpenAPI generation and route-contract helpers.
- `@pagopa/io-platform-typescript-config-node` — shared base `tsconfig` (internal/private).

### Documentation
- `packages/hexagonal-core/docs/*` — architecture notes/ADRs related to the hexagonal pattern libs. Link user docs from a package `README`, not here.

## Publishing packages — dual ESM + CJS is mandatory

Every **publishable** package MUST ship **both ESM and
CommonJS** so it can be consumed from either module system. Encode this in the
`exports` map with `import`, `require` and `types` conditions per entry point:

```jsonc
"exports": {
  ".": {
    "import": { "types": "./dist/esm/index.d.ts", "default": "./dist/esm/index.js" },
    "require": { "types": "./dist/cjs/index.d.ts", "default": "./dist/cjs/index.cjs" }
  }
}
```

The package `build` must emit both formats with matching `.d.ts` (a single `tsc`
pass only emits one module format — use a dual build for publishable libs). Keep
subpath exports (e.g. `./errors`, `./value-objects`) consistent across both formats.
Internal/example workspaces (`private: true`, e.g. apps, `typescript-config-node`)
are exempt.

## Infrastructure (`infra/`)

Terraform IaC for the cloud resources backing the monorepo's apps. Two stacks
manage the **repository itself and its CI/CD**:

- `infra/repository` — configures the **GitHub repository** settings (branch
  protections, environments, …) via the `pagopa-dx` GitHub bootstrap module.
- `infra/bootstrapper/prod` — bootstraps the **Azure ↔ GitHub environment**:
  identity federation and the **custom self-hosted runners** (Container App
  Environment) used by the pipelines, wired to shared APIM/Key Vault/resource groups.

Terraform is governed by `pre-commit` (fmt, tflint, terraform-docs, validate, trivy);
run `pre-commit run` before committing `infra/` changes. See the per-stack READMEs
under `infra/`.
