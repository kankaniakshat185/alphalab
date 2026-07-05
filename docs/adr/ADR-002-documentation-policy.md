# ADR-002 — Documentation Policy

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-07-05 |
| **Phase** | 0 — Engineering Foundation |
| **Deciders** | Vaishnavi Rai, Akshat Kankani |

---

## Context

Most software projects treat documentation as an afterthought. The result is a
codebase where the only source of truth is the code itself — which means a new
engineer (or a future AI agent) must reverse-engineer context from implementation
details, commit history, and tribal knowledge.

AlphaLab must be the opposite: a new engineer or AI agent should be able to
recover full project context from documentation alone, without any prior
conversation history.

---

## Decision

AlphaLab uses a **four-file documentation system** as its core documentation
structure, with a **public/private split** for documentation content.

### The Four Core Documents

| File | Purpose | Update Frequency |
|---|---|---|
| `docs/00_MASTER_PLAN.md` | Project constitution — thesis, goals, non-goals, roadmap, deferred features | Rarely; major pivots only |
| `docs/01_ARCHITECTURE.md` | Living system description — repo structure, package responsibilities, data flow, schemas, API routes, tech stack | After every phase |
| `docs/02_CURRENT_STATE.md` | Continuous changelog — current phase, completed features, what works, what doesn't, known issues | After every task |
| `docs/03_NEXT_STAGE.md` | Immediate next milestone — objective, deliverables, acceptance criteria, risks, learning goals | Rewritten when milestone completes |

### The Public/Private Split

**`docs/`** (committed, public when repository goes public):
Contains everything a new contributor or external engineer needs to understand
AlphaLab: architecture, decisions, deployment, API reference.

**`internal/`** (gitignored, never pushed):
Contains personal engineering notes: learning notes, development diary, interview
preparation, design deliberations. This is a private engineering notebook.

### Documentation Update Triggers

| Type of change | Documentation to update |
|---|---|
| Architecture changes | `docs/01_ARCHITECTURE.md` |
| Phase completed | `docs/02_CURRENT_STATE.md` |
| Next milestone defined | `docs/03_NEXT_STAGE.md` |
| Major architectural decision | `docs/adr/ADR-NNN-*.md` (new ADR) |
| New subsystem introduced | `internal/learning_notes/` (new note) |
| Significant implementation | `internal/development_log/Phase_NN.md` |
| Public behaviour change | `README.md` (if applicable) |
| New file with real logic | `internal/file_reference/` (new reference doc) |

---

## Alternatives Considered

### Option A — Wiki (rejected)

GitHub wikis, Confluence, and Notion are popular documentation platforms.
They were rejected because:
- Documentation that lives outside the repository becomes out of sync with code
- Wikis are not version-controlled alongside the code they document
- External platforms require separate access management

### Option B — Inline comments only (rejected)

Inline comments explain what code does. They cannot explain why architectural
decisions were made, what alternatives were considered, or what the intended
evolution path is. Comments are necessary but not sufficient.

### Option C — Single README (rejected)

A single README that grows to document the entire system becomes unmaintainable
past a certain size. The four-file system distributes documentation across
documents with distinct purposes and update frequencies, making each document
easier to maintain.

---

## Tradeoffs

| Tradeoff | Assessment |
|---|---|
| Higher upfront investment | Accepted. Phase 0 cost is higher; every subsequent phase benefits. |
| Documentation can become stale | Mitigated by the update matrix — every type of change has defined docs to update. |
| Private notes are local only | Accepted. The private notebook is for personal learning; it doesn't need to be shared. |
| AI agents must follow the same policy | Enforced via the Phase Guard in `CONTRIBUTING.md`. |

---

## Consequences

1. Every phase has a documentation checklist as part of its Definition of Done.
2. No phase is complete until `02_CURRENT_STATE.md` and `03_NEXT_STAGE.md` are updated.
3. No major technical decision is made without an ADR.
4. The private `internal/` directory is gitignored from the first commit and never pushed.

---

## Future Impact

This policy scales with the project. As more phases complete:
- `02_CURRENT_STATE.md` grows (new phases archived into it)
- `03_NEXT_STAGE.md` is rewritten (exactly once per phase)
- `docs/adr/` grows (one ADR per major decision)
- `internal/learning_notes/` grows (one note per new concept)

The four-file system is designed to remain navigable even as the project scales
to its full 12-phase scope.
