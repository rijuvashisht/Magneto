# Auto-detect & Suggest Power Packs

## Overview

Improve `magneto init` and add a new `magneto detect` command so Magneto auto-detects the project's language, framework, cloud, and project type, then suggests relevant power packs interactively. This removes the biggest onboarding friction: users currently have to know which packs to add via `--with`.

## Goals

- Detect a richer set of languages (Python, Java, Go, Rust, Ruby, PHP, .NET) beyond the current TS-only signal
- Detect more frameworks (FastAPI, Django, Spring Boot, Express, NestJS, Vue, Angular, Rails) and cloud providers (AWS, GCP)
- Detect project types (mobile, microservices, CLI, library, data pipeline)
- Surface detection results to the user during `magneto init` with an interactive prompt to install matched packs
- Add a standalone `magneto detect` command that prints detected stack and recommends packs without modifying the project

## Acceptance Criteria

- `magneto detect` runs successfully on a TS, Python, and Java project and prints the correct stack
- `magneto init` (no flags) prompts: "Detected: typescript, nextjs. Install these packs? [Y/n]"
- `magneto init --no-suggest` skips the prompt (back-compat)
- `magneto init --auto-install` installs all detected packs without prompting (CI mode)
- Detection covers at minimum: Python, Java, Go, Rust, TypeScript/JavaScript, AWS, GCP, Azure, Spring Boot, Django, FastAPI, Next.js, React, Vue, Angular
- Confidence score (0.0–1.0) attached to each detection
- Unit tests for detection logic
- Documentation updated in README and a new `docs/AUTO-DETECT.md`

## Files to Touch

- `src/core/detect-packs.ts` — expand detection rules
- `src/commands/init.ts` — add interactive suggestion flow
- `src/commands/detect.ts` — new command
- `src/cli.ts` — register `detect` command and new init flags
- `tests/detect-packs.test.ts` — new test file
- `docs/AUTO-DETECT.md` — new documentation

## Out of Scope

- Actually creating the new power packs themselves (Python, Java, etc. packs come in separate PRs)
- ML-based detection — pure heuristics only for now

## Risk

- **Medium**: changes user-facing init flow — must preserve back-compat with existing flags
