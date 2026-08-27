# spec-writer

A Claude Code skill that turns vague feature requests into structured specs, technical plans, and task breakdowns — ready for any coding agent to implement without guessing.

---

## The problem it solves

AI coding agents don't fail because the model is weak. They fail because the instructions are ambiguous.

"Add a feature to manage items from the backoffice."

The agent reads the codebase, picks a pattern, and writes the feature. At first it looks fine. Then you click "add item" again and it inserts the same item twice. All the assumptions you thought were obvious — the operation should be idempotent, only admins should be allowed, "the backoffice" means the internal one — were never in the prompt.

Each one was a silent decision. Some guesses were right. Some were wrong. And as complexity increases, so does the gap between what you meant and what the agent actually built.

spec-writer closes that gap before the agent starts.

---

## How it works

Invoke with your feature description:

```
/spec-writer Add a way for users to export their order history as CSV
```

The skill generates three things immediately:

**1. A Spec** — functional, technology-agnostic. What the feature does, who uses it, what must be true, what can go wrong, and acceptance criteria in Given/When/Then format.

**2. A Plan** — technical and concrete. Architecture decisions, data model changes, API contracts, testing strategy, security constraints.

**3. A Task breakdown** — ordered, self-contained tasks. Each completable in a single agent session. Each with its own acceptance criteria. No task that says "implement the feature."

---

## The key idea: generate first, flag assumptions inline

spec-writer doesn't ask questions before generating. It generates a complete draft and marks every decision it made that you didn't specify:

```
Given an authenticated user requesting an export
When the export contains more than 1,000 rows [ASSUMPTION: async for large exports]
Then the export is generated asynchronously and the user is notified by email
```

At the end, every assumption is collected into a prioritized list:

```
## Assumptions to review

1. Async generation for exports over 1,000 rows — Impact: HIGH
   Correct this if: your order volumes are low and synchronous is fine

2. Date range filter is required — Impact: MEDIUM
   Correct this if: the first version should export all orders with no filtering
```

Correcting a spec is faster than writing one. The assumptions show you exactly where the agent would have guessed wrong — before it guesses.

---

## Why this approach

Julián Deangelis documented this pattern at MercadoLibre, rolling out Spec Driven Development to nearly 20,000 developers. His framing: separating functional from technical reduces LLM uncertainty. When you mix "the user can authenticate with Google" with "use NextAuth.js with JWT sessions in Redis," you're forcing the agent to juggle two concerns simultaneously.

The spec handles what. The plan handles how. The tasks handle when.

spec-writer operationalizes that methodology into a single skill invocation.

Full writeup: [The Spec Is the New Code](https://twitter.com/juliandeangeIis) by Julián Deangelis.

---

## Install

**Claude Code:**
```bash
mkdir -p ~/.claude/skills
git clone https://github.com/dannwaneri/spec-writer.git ~/.claude/skills/spec-writer
```

**Or manually:**
```bash
mkdir -p ~/.claude/skills/spec-writer
# Copy SKILL.md into that directory
```

Works across Claude Code, Cursor, Gemini CLI, and any agent that supports the Agent Skills standard.

---

## Usage

```
/spec-writer [feature description]
```

Pass anything: a feature description, a ticket, a PRD fragment, a rough idea. The skill produces a complete spec, plan, and task breakdown in one shot.

**Examples:**
```
/spec-writer Add password reset via email
/spec-writer Build an admin dashboard showing daily active users
/spec-writer Let users invite teammates to their workspace
/spec-writer Add rate limiting to the public API
```

---

## What you get

A single output with three sections:

| Section | What it contains |
|---|---|
| Spec | Purpose, use cases, requirements, edge cases, Given/When/Then criteria |
| Plan | Architecture, data models, API contracts, testing strategy, constraints |
| Tasks | Ordered, self-contained, each with acceptance criteria and dependencies |

Plus an **Assumptions summary** — every implicit decision, impact-rated, with guidance on when to correct it.

---

## Quality rules baked in

- Acceptance criteria are binary. "Works correctly" is not a criterion. "Returns 401 when unauthenticated" is.
- Every task is independently verifiable. If it can't be tested on its own, it gets split.
- The spec never contains implementation details. Framework choices go in the plan.
- Every assumption is visible. Nothing is hidden.

---

## Works with the Agent Skills standard

spec-writer follows the [Agent Skills specification](https://agentskills.io), which means the same skill file works across Claude Code, Cursor, Gemini CLI, Codex CLI, and any agent that adopts the standard.

---

## Related

- [voice-humanizer](https://github.com/dannwaneri/voice-humanizer) — checks your writing against your own voice fingerprint, not generic AI-pattern rules
- [Foundation](https://github.com/dannwaneri/chat-knowledge) — captures what proved true across AI sessions so the understanding doesn't disappear when the context window closes

---

Built by [Daniel Nwaneri](https://dev.to/dannwaneri). Built on the Spec Driven Development methodology — operationalized by tools like [GitHub Spec Kit](https://github.com/github/spec-kit) and [OpenSpec](https://github.com/Fission-AI/OpenSpec). Julián Deangelis's writing on SDD at MercadoLibre was the direct inspiration.