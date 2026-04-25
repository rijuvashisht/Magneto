# Auto-Detection & Pack Suggestions

Magneto automatically detects your project's stack — languages, frameworks, cloud providers, project type — and recommends matching power packs. This removes the biggest onboarding hurdle: knowing which packs to install up front.

## Quick Reference

```bash
# See what magneto detects in your project (read-only)
magneto detect

# JSON output for tooling
magneto detect --json

# Only show high-confidence detections
magneto detect --min-confidence 0.85

# Init with detection prompt (default for new projects)
magneto init

# CI mode: install all detected packs without prompting
magneto init --auto-install

# Skip the auto-detection prompt entirely
magneto init --no-suggest
```

## What Gets Detected

| Category | Detections | Signals |
|---|---|---|
| **Languages** | TypeScript, JavaScript, Python, Java, Go, Rust, Ruby, PHP, C#, Kotlin | `tsconfig.json`, `pyproject.toml`, `pom.xml`, `go.mod`, `Cargo.toml`, `Gemfile`, `composer.json`, `*.csproj`, `build.gradle.kts` |
| **Frameworks** | Next.js, React, Vue, Angular, Express, NestJS, FastAPI, Django, Flask, Spring Boot, Rails | Dependencies, config files, source markers (`manage.py`, `angular.json`, `next.config.*`) |
| **Clouds** | AWS, GCP, Azure, Kubernetes | `cdk.json`, `serverless.yml`, `firebase.json`, `azure.yaml`, `Chart.yaml` |
| **Project Types** | AI Platform, Mobile, CLI Tool | AI library deps, `ios/android/`, `react-native`, `pubspec.yaml`, `bin` field |
| **Integrations** | Graphify, OpenClaw | `.graphify-out/graph.json`, `openclaw.json` |

## Output Example

```
$ magneto detect

Detected stack for: /home/dev/my-fastapi-app

Languages
  python           ██████████ 100% ○ planned
    └─ requirements.txt present

Frameworks
  fastapi          ██████████ 100% ○ planned
    └─ fastapi in requirements.txt

Project Types
  ai-platform      ██████████ 100% ● available
    └─ AI library in requirements.txt

Recommended install:
  magneto init --with ai-platform

2 planned pack(s) detected — see ROADMAP.md to track progress.
```

## Status Legend

- **`● available`** — Pack ships with the current Magneto build and can be installed today
- **`○ planned`** — Stack detected but the corresponding pack template is on the roadmap (PRs welcome!)

## Confidence Scoring

Each detection has a confidence score between **0 and 1**:

- **1.0** — Strong signal (e.g. `pom.xml` definitively means Java)
- **0.85–0.95** — Likely (e.g. `Chart.yaml` for Kubernetes — could be other Helm-using project)
- **0.6–0.8** — Possible (e.g. plain `package.json` without `tsconfig.json` → JavaScript)
- **< 0.5** — Suppressed by default (e.g. `react` when `next` is also present, since installing both is redundant)

You can override the threshold with `--min-confidence`.

## Init Flow

When you run `magneto init` with no `--with` flag, Magneto:

1. Scaffolds the base `.magneto/` structure
2. Runs detection across all rules
3. Prints detected stack with reasons
4. Prompts: `Install detected packs (typescript, ai-platform)? [Y/n]:`
5. Loads chosen packs

### Prompt Responses

| Input | Behavior |
|---|---|
| `<enter>` or `y`/`yes` | Install all suggested packs |
| `n`/`no` | Skip — you can install later with `magneto refresh` |
| `typescript ai-platform` | Install only the named subset |

### Non-Interactive Mode

In CI or non-TTY environments, the prompt is bypassed and **all detected packs are installed** automatically. Use `--no-suggest` to opt out, or `--auto-install` to be explicit about CI behavior.

## Programmatic API

```typescript
import { detectPacksDetailed, DetectedPack } from 'magneto-ai';

const packs: DetectedPack[] = await detectPacksDetailed(projectRoot, {
  minConfidence: 0.7,
});

for (const p of packs) {
  console.log(`${p.name} (${p.category}) — ${p.confidence} — ${p.reasons.join(', ')}`);
}
```

The legacy `detectPacks()` function still works and returns just pack names (back-compat).

## Adding New Detection Rules

Detection rules live in `src/core/detect-packs.ts` in the `RULES` array. Each rule returns a confidence score (0..1) and an array of human-readable reasons:

```typescript
{
  name: 'svelte',
  category: 'frameworks',
  detect: (ctx) => {
    const reasons: string[] = [];
    if (depPresent(ctx.pkg, 'svelte')) reasons.push('svelte dependency');
    if (has(ctx, 'svelte.config.js')) reasons.push('svelte.config.js present');
    return { confidence: reasons.length ? 1.0 : 0, reasons };
  },
}
```

When you add a shipped pack template under `src/templates/power-packs/<category>/<name>/`, also add the name to the corresponding `SHIPPED_PACKS` set so it's marked `available`.

## See Also

- `ROADMAP.md` — Tracked planned packs
- `docs/POWER-PACK-AUTHORING.md` — Coming soon: guide to building custom packs
- `README.md` — Power Pack overview
