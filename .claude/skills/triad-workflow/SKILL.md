---
name: triad-workflow
description: Three-tier dynamic orchestration — Fable (this session) as apex orchestrator, Opus subagents for reasoning-heavy phases (planning, architecture, hard debugging, review), Sonnet subagents for execution (implementation, edits, tests). ONLY runs when the current session model is Fable 5; on any other model, do not orchestrate — tell the user to switch with /model. Use for large features, multi-phase tasks, big refactors, or whenever the user asks for the triad / Fable-Opus-Sonnet workflow.
---

# Triad Workflow — Fable commands, Opus strategizes, Sonnet executes

Three-tier dynamic orchestration for large or multi-phase tasks. The main
session (Fable 5, max reasoning) is the apex orchestrator. It never grinds
through bulk work itself — it decomposes, delegates, supervises, and decides.

## Gate — Fable 5 only

**Before doing anything else, check which model this session is running on.**

- Running on **Fable 5** (model ID starts with `claude-fable-5`) → proceed.
- Running on **any other model** (Opus, Sonnet, Haiku, …) → **stop. Do not run
  this workflow.** Tell the user this skill is Fable-only and that they can
  switch with `/model` (Fable 5, reasoning effort Max recommended), then handle
  their request normally without the triad orchestration.

This skill must never change the session's model or settings itself — the
model choice belongs to the user.

## Roles

| Tier | Model | Role | Responsibilities |
|---|---|---|---|
| 頂点 (apex) | **Fable** — this session | Orchestrator / commander | Task intake, decomposition, dispatching subagents, integrating results, final judgment, user communication |
| 参謀 (strategist) | **Opus** subagents | Heavy reasoning | Architecture & implementation planning, root-cause analysis of hard bugs, trade-off analysis, design/code review, verification of completed work |
| 実行役 (executor) | **Sonnet** subagents | Execution | Well-specified implementation, file edits, test writing/running, mechanical refactors, broad codebase exploration |

## Dispatch recipes

Use the Agent tool with an explicit `model` override.

**Strategy phase (Opus):**

```
Agent(subagent_type: "Plan", model: "opus",
      prompt: "<goal, constraints, relevant files, what a good plan must cover>")
```

Also use Opus `general-purpose` agents for deep debugging analysis or review:

```
Agent(subagent_type: "general-purpose", model: "opus",
      prompt: "Review the diff on <branch/files> for correctness ... Report findings only; do not edit.")
```

**Execution phase (Sonnet):**

```
Agent(subagent_type: "general-purpose", model: "sonnet",
      prompt: "<one self-contained work package: exact files, exact changes, acceptance criteria, how to verify>")
```

**Cheap lookups:** use `Explore` (optionally `model: "haiku"`) for read-only
searches; don't spend Opus or block the orchestrator on them.

## Workflow

1. **Intake (Fable).** Clarify the goal only if genuinely ambiguous. State the
   plan of delegation in one or two sentences before dispatching.
2. **Recon (parallel).** If context is missing, fan out `Explore` agents to map
   the relevant code. Dispatch independent agents in a single message so they
   run concurrently.
3. **Strategy (Opus).** For anything non-trivial, send the goal plus recon
   findings to an Opus `Plan` agent. Fable critiques the returned plan — accept,
   amend, or send back with specific objections. Fable owns the decision.
4. **Execution (Sonnet, parallel).** Split the plan into independent work
   packages and dispatch one Sonnet agent per package, concurrently when files
   don't overlap. Each prompt must be self-contained: subagents share no
   context with this session or each other.
5. **Verification (Opus).** After execution, run tests/build directly, and for
   risky or large changes have a fresh Opus agent review the diff against the
   plan. Feed findings back into step 4 until clean.
6. **Synthesis (Fable).** Integrate results, resolve conflicts between agents,
   report the outcome to the user — outcome first, plain sentences.

## Escalation & dynamic re-routing

- Sonnet agent stuck, looping, or producing a wrong-shaped result → don't
  retry blindly; escalate that work package to an Opus agent, or have Opus
  diagnose and re-spec it.
- Plan turns out wrong mid-execution → stop dispatching, return to step 3 with
  what was learned.
- Long-running work packages → `run_in_background: true`; keep orchestrating
  while they run, and use `SendMessage` to steer a running agent instead of
  respawning it.
- Genuine scope decisions → ask the user; everything else, decide and proceed.

## Anti-patterns

- Fable editing dozens of files itself — that's Sonnet's job.
- Spawning a subagent for a single-file read or one grep — do it directly or
  use Explore.
- Opus for mechanical edits, or Sonnet for architecture decisions — wrong tier.
- Vague delegation prompts ("fix the auth module") — every dispatch needs
  files, constraints, and acceptance criteria.
- Sequential dispatch of independent work — parallelize in one message.
