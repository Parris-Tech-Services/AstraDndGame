# Astra Engineering Principles

These principles are the default standard for all Astra code. The governing idea is simple: **code should make its intent obvious to the next person who reads it — including us six months later.**

Compliance is judged where a principle is applicable. A CSS file, for example, has no database boundary to validate; that principle is **N/A**, not a failure. Generated files are reviewed for the invariants they can affect (reproducibility, integrity, secrets, dependency intent) rather than hand-styled as source code.

## Maintainability and architecture

1. **Understand before changing.** Read the surrounding system, trace data flow and dependencies, and prove equivalence before broad edits. Never optimise for making a large diff before understanding the system.
2. **One concept → one source of truth.** A domain concept, schema, rule or canonical model should have one authoritative definition. Presentation copies must be derived or protected by explicit consistency tests.
3. **Keep related things together.** Modules have one clear responsibility and related domain code lives together.
4. **Prefer boring, obvious names.** Names should reveal intent without archaeology.
5. **Keep functions small and single-purpose.** Split validation, transformation, persistence, rendering and side effects rather than hiding them in one routine.
6. **Make data flow explicit.** State moves through understandable boundaries; avoid hidden global mutation and surprising cross-cutting interception.
7. **Separate UI from business logic.** UI renders state and gathers intent; domain/server code owns consequential game rules and persistence invariants.
8. **Never pretend static data is live data.** Anything presented as current state must be calculated from authoritative state or clearly labelled as illustrative.
9. **Delete dead code.** Unused architecture and stale scaffolding are liabilities, not future-proofing.
10. **Do not mutate data unless mutation is intentional.** Prefer copies at boundaries and in shared/query data. Where a state machine intentionally mutates a private working copy, make that ownership obvious.
11. **Protect important operations with invariants.** Encode and test properties that must always survive, especially save/sign/verify, backup/restore and resource accounting.
12. **Comments explain WHY, not WHAT.** Use comments for constraints, trade-offs and non-obvious invariants rather than narrating syntax.
13. **Consistent structure beats cleverness.** Use predictable naming, error handling, state patterns, imports and conventions.
14. **Keep dependencies directional.** UI depends on domain/services; domain logic must not unexpectedly depend on UI implementation.
15. **Tests protect behaviour, not implementation.** Test player-visible flows, rules, boundaries, migrations and invariants rather than incidental syntax.
16. **Fail loudly at boundaries; degrade gracefully in the UI.** Reject malformed external state immediately, preserve the last valid state, and show a useful player-facing fallback.
17. **YAGNI.** Do not add abstractions, features or layers without a current requirement.
18. **Zero trust for external data.** Validate API data, user input, model output, imported backups and persisted browser data before domain logic consumes them.

## AI-game, reliability and operational principles

19. **The engine owns truth; AI proposes fiction.** Dice, HP, resources, inventory consequences, XP, combat outcomes and signed campaign state are authoritative code. AI may interpret intent and narrate but cannot silently become a second game engine.
20. **State changes are atomic and idempotent.** Retries, double-clicks, duplicate requests and timeouts must not apply damage, resources, XP or quest consequences twice.
21. **Persistent data evolves safely.** Save formats are versioned, migrations/upgrades are explicit, older supported saves remain recoverable, and migration behaviour is regression-tested.
22. **Secure and private by default.** Keep secrets server-side, minimise privilege and exposure, constrain origins and inputs, use safe browser/security headers, and never leak private player text, credentials, signed saves or prompts into diagnostics.
23. **Accessibility and responsive UX are correctness requirements.** Keyboard use, focus, screen readers, reduced motion, readable layouts, touch/mobile behaviour and error/status feedback are tested as product behaviour.
24. **Make failures observable without leaking data.** Diagnostics identify stage, build and safe error metadata while excluding secrets, prompts, signed saves and player-authored content.
25. **Bound expensive and unpredictable work.** AI context, output, retries, network timeouts, request bodies, state arrays, caches, histories and loops all have explicit ceilings.
26. **Builds are reproducible and dependencies intentional.** Commit and honour lockfiles, use deterministic installs, pin volatile tooling, keep dependency surface small and ensure CI tests the same commit/artifact that production deploys.

## Release rule

A change is releasable only when every applicable principle is either **compliant** or has an explicit, justified exception recorded in the repository audit. New code should not create an undocumented exception.
