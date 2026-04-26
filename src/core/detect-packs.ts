import * as fs from 'fs';
import * as path from 'path';
import { fileExists, readJson, readText } from '../utils/fs';
import { logger } from '../utils/logger';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export type PackCategory =
  | 'languages'
  | 'frameworks'
  | 'clouds'
  | 'project-types'
  | 'integrations';

export interface DetectedPack {
  /** Pack identifier (matches a directory under src/templates/power-packs/<category>/<name>) */
  name: string;
  /** Logical category */
  category: PackCategory;
  /** Confidence between 0 and 1 (1 = certain, 0.5 = likely, < 0.5 = weak signal) */
  confidence: number;
  /** Human-readable signals that triggered the detection */
  reasons: string[];
  /** Whether the pack template currently exists in this magneto build */
  available: boolean;
}

interface DetectionContext {
  projectRoot: string;
  pkg: PackageJson;
  rootEntries: Set<string>;
}

interface DetectionRule {
  name: string;
  category: PackCategory;
  /** Returns confidence (0..1) and reasons; 0 means not detected */
  detect: (ctx: DetectionContext) => { confidence: number; reasons: string[] };
}

/** Packs that ship with current build (templates exist on disk) */
const SHIPPED_PACKS: Record<PackCategory, Set<string>> = {
  languages: new Set(['typescript', 'python', 'java']),
  frameworks: new Set(['nextjs', 'fastapi', 'spring-boot']),
  clouds: new Set(['azure', 'aws']),
  'project-types': new Set(['ai-platform']),
  integrations: new Set(['openclaw']),
};

function has(ctx: DetectionContext, file: string): boolean {
  return ctx.rootEntries.has(file);
}

function hasAny(ctx: DetectionContext, files: string[]): string | null {
  for (const f of files) if (ctx.rootEntries.has(f)) return f;
  return null;
}

function depPresent(pkg: PackageJson, dep: string): boolean {
  return !!(pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]);
}

function anyDep(pkg: PackageJson, deps: string[]): string | null {
  for (const d of deps) if (depPresent(pkg, d)) return d;
  return null;
}

function readSafe(filePath: string): string | null {
  try {
    return readText(filePath);
  } catch {
    return null;
  }
}

const RULES: DetectionRule[] = [
  // ─── Languages ───────────────────────────────────────────────────────────
  {
    name: 'typescript',
    category: 'languages',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (has(ctx, 'tsconfig.json')) reasons.push('tsconfig.json present');
      const dep = anyDep(ctx.pkg, ['typescript']);
      if (dep) reasons.push(`dependency: ${dep}`);
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'javascript',
    category: 'languages',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (has(ctx, 'package.json') && !has(ctx, 'tsconfig.json')) {
        reasons.push('package.json without tsconfig.json');
      }
      return { confidence: reasons.length ? 0.6 : 0, reasons };
    },
  },
  {
    name: 'python',
    category: 'languages',
    detect: (ctx) => {
      const reasons: string[] = [];
      const marker = hasAny(ctx, [
        'pyproject.toml',
        'requirements.txt',
        'setup.py',
        'Pipfile',
        'poetry.lock',
      ]);
      if (marker) reasons.push(`${marker} present`);
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'java',
    category: 'languages',
    detect: (ctx) => {
      const reasons: string[] = [];
      const marker = hasAny(ctx, ['pom.xml', 'build.gradle', 'build.gradle.kts']);
      if (marker) reasons.push(`${marker} present`);
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'go',
    category: 'languages',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (has(ctx, 'go.mod')) reasons.push('go.mod present');
      if (has(ctx, 'go.sum')) reasons.push('go.sum present');
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'rust',
    category: 'languages',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (has(ctx, 'Cargo.toml')) reasons.push('Cargo.toml present');
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'ruby',
    category: 'languages',
    detect: (ctx) => {
      const reasons: string[] = [];
      const marker = hasAny(ctx, ['Gemfile', 'Gemfile.lock', '.ruby-version']);
      if (marker) reasons.push(`${marker} present`);
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'php',
    category: 'languages',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (has(ctx, 'composer.json')) reasons.push('composer.json present');
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'csharp',
    category: 'languages',
    detect: (ctx) => {
      const reasons: string[] = [];
      const csproj = [...ctx.rootEntries].find((f) => f.endsWith('.csproj') || f.endsWith('.sln'));
      if (csproj) reasons.push(`${csproj} present`);
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'kotlin',
    category: 'languages',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (has(ctx, 'build.gradle.kts')) reasons.push('build.gradle.kts present');
      return { confidence: reasons.length ? 0.8 : 0, reasons };
    },
  },

  // ─── Frameworks (JS/TS) ──────────────────────────────────────────────────
  {
    name: 'nextjs',
    category: 'frameworks',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (depPresent(ctx.pkg, 'next')) reasons.push('next dependency');
      if (has(ctx, 'next.config.js') || has(ctx, 'next.config.mjs') || has(ctx, 'next.config.ts'))
        reasons.push('next.config present');
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'react',
    category: 'frameworks',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (depPresent(ctx.pkg, 'react')) reasons.push('react dependency');
      // Lower confidence — Next.js etc. include react transitively
      const c = depPresent(ctx.pkg, 'next') ? 0.3 : 0.9;
      return { confidence: reasons.length ? c : 0, reasons };
    },
  },
  {
    name: 'vue',
    category: 'frameworks',
    detect: (ctx) => {
      const reasons: string[] = [];
      const dep = anyDep(ctx.pkg, ['vue', 'nuxt', '@nuxt/core']);
      if (dep) reasons.push(`dependency: ${dep}`);
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'angular',
    category: 'frameworks',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (has(ctx, 'angular.json')) reasons.push('angular.json present');
      if (depPresent(ctx.pkg, '@angular/core')) reasons.push('@angular/core dependency');
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'express',
    category: 'frameworks',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (depPresent(ctx.pkg, 'express')) reasons.push('express dependency');
      return { confidence: reasons.length ? 0.9 : 0, reasons };
    },
  },
  {
    name: 'nestjs',
    category: 'frameworks',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (depPresent(ctx.pkg, '@nestjs/core')) reasons.push('@nestjs/core dependency');
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },

  // ─── Frameworks (Python) ─────────────────────────────────────────────────
  {
    name: 'fastapi',
    category: 'frameworks',
    detect: (ctx) => {
      const reasons: string[] = [];
      const reqs = readSafe(path.join(ctx.projectRoot, 'requirements.txt'));
      if (reqs && /\bfastapi\b/i.test(reqs)) reasons.push('fastapi in requirements.txt');
      const pyproject = readSafe(path.join(ctx.projectRoot, 'pyproject.toml'));
      if (pyproject && /fastapi/i.test(pyproject)) reasons.push('fastapi in pyproject.toml');
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'django',
    category: 'frameworks',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (has(ctx, 'manage.py')) reasons.push('manage.py present');
      const reqs = readSafe(path.join(ctx.projectRoot, 'requirements.txt'));
      if (reqs && /\bdjango\b/i.test(reqs)) reasons.push('django in requirements.txt');
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'flask',
    category: 'frameworks',
    detect: (ctx) => {
      const reasons: string[] = [];
      const reqs = readSafe(path.join(ctx.projectRoot, 'requirements.txt'));
      if (reqs && /\bflask\b/i.test(reqs)) reasons.push('flask in requirements.txt');
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },

  // ─── Frameworks (Java) ───────────────────────────────────────────────────
  {
    name: 'spring-boot',
    category: 'frameworks',
    detect: (ctx) => {
      const reasons: string[] = [];
      const pom = readSafe(path.join(ctx.projectRoot, 'pom.xml'));
      if (pom && /spring-boot/.test(pom)) reasons.push('spring-boot in pom.xml');
      const gradle = readSafe(path.join(ctx.projectRoot, 'build.gradle')) ||
        readSafe(path.join(ctx.projectRoot, 'build.gradle.kts'));
      if (gradle && /spring-boot/.test(gradle)) reasons.push('spring-boot in build.gradle');
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },

  // ─── Frameworks (Ruby) ───────────────────────────────────────────────────
  {
    name: 'rails',
    category: 'frameworks',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (has(ctx, 'config.ru')) reasons.push('config.ru present');
      const gemfile = readSafe(path.join(ctx.projectRoot, 'Gemfile'));
      if (gemfile && /\brails\b/i.test(gemfile)) reasons.push('rails in Gemfile');
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },

  // ─── Clouds ──────────────────────────────────────────────────────────────
  {
    name: 'aws',
    category: 'clouds',
    detect: (ctx) => {
      const reasons: string[] = [];
      const marker = hasAny(ctx, ['serverless.yml', 'samconfig.toml', 'template.yaml', 'cdk.json']);
      if (marker) reasons.push(`${marker} present`);
      const dep = anyDep(ctx.pkg, ['aws-sdk', '@aws-sdk/client-s3', 'aws-cdk-lib']);
      if (dep) reasons.push(`dependency: ${dep}`);
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'gcp',
    category: 'clouds',
    detect: (ctx) => {
      const reasons: string[] = [];
      const marker = hasAny(ctx, ['app.yaml', 'firebase.json', '.firebaserc']);
      if (marker) reasons.push(`${marker} present`);
      const dep = anyDep(ctx.pkg, ['@google-cloud/storage', 'firebase-admin', 'firebase']);
      if (dep) reasons.push(`dependency: ${dep}`);
      return { confidence: reasons.length ? 0.9 : 0, reasons };
    },
  },
  {
    name: 'azure',
    category: 'clouds',
    detect: (ctx) => {
      const reasons: string[] = [];
      const marker = hasAny(ctx, ['azure.yaml', 'bicep', 'infra']);
      if (marker) reasons.push(`${marker} present`);
      const dep = anyDep(ctx.pkg, ['@azure/identity', '@azure/storage-blob', '@azure/openai']);
      if (dep) reasons.push(`dependency: ${dep}`);
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'kubernetes',
    category: 'clouds',
    detect: (ctx) => {
      const reasons: string[] = [];
      const marker = hasAny(ctx, ['Chart.yaml', 'kustomization.yaml', 'k8s', 'manifests']);
      if (marker) reasons.push(`${marker} present`);
      return { confidence: reasons.length ? 0.85 : 0, reasons };
    },
  },

  // ─── Project Types ───────────────────────────────────────────────────────
  {
    name: 'ai-platform',
    category: 'project-types',
    detect: (ctx) => {
      const reasons: string[] = [];
      const dep = anyDep(ctx.pkg, [
        'openai',
        '@azure/openai',
        'langchain',
        '@langchain/core',
        '@anthropic-ai/sdk',
        'llamaindex',
      ]);
      if (dep) reasons.push(`dependency: ${dep}`);
      const reqs = readSafe(path.join(ctx.projectRoot, 'requirements.txt'));
      if (reqs && /(openai|langchain|anthropic|llama-?index|transformers)/i.test(reqs)) {
        reasons.push('AI library in requirements.txt');
      }
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'mobile',
    category: 'project-types',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (has(ctx, 'ios') || has(ctx, 'android')) reasons.push('ios/android directory');
      const dep = anyDep(ctx.pkg, ['react-native', 'expo']);
      if (dep) reasons.push(`dependency: ${dep}`);
      if (has(ctx, 'pubspec.yaml')) reasons.push('pubspec.yaml (Flutter)');
      return { confidence: reasons.length ? 0.95 : 0, reasons };
    },
  },
  {
    name: 'cli-tool',
    category: 'project-types',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (ctx.pkg && (ctx.pkg as PackageJson & { bin?: unknown }).bin) {
        reasons.push('package.json has "bin" field');
      }
      return { confidence: reasons.length ? 0.7 : 0, reasons };
    },
  },

  // ─── Integrations ────────────────────────────────────────────────────────
  {
    name: 'graphify',
    category: 'integrations',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (fileExists(path.join(ctx.projectRoot, '.graphify-out', 'graph.json'))) {
        reasons.push('.graphify-out/graph.json present');
      }
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
  {
    name: 'openclaw',
    category: 'integrations',
    detect: (ctx) => {
      const reasons: string[] = [];
      if (
        fileExists(path.join(ctx.projectRoot, '.openclaw', 'openclaw.json')) ||
        has(ctx, 'openclaw.json')
      ) {
        reasons.push('openclaw config present');
      }
      if (depPresent(ctx.pkg, 'openclaw')) reasons.push('openclaw dependency');
      return { confidence: reasons.length ? 1.0 : 0, reasons };
    },
  },
];

function loadContext(projectRoot: string): DetectionContext {
  let pkg: PackageJson = {};
  const pkgPath = path.join(projectRoot, 'package.json');
  if (fileExists(pkgPath)) {
    try {
      pkg = readJson<PackageJson>(pkgPath);
    } catch {
      logger.warn('Could not parse package.json for pack detection');
    }
  }

  let entries: string[] = [];
  try {
    entries = fs.readdirSync(projectRoot);
  } catch {
    // ignore
  }

  return { projectRoot, pkg, rootEntries: new Set(entries) };
}

/**
 * Detailed detection — returns rich metadata including category, confidence,
 * reasons, and whether the matching pack template is shipped with magneto.
 */
export async function detectPacksDetailed(
  projectRoot: string,
  options: { minConfidence?: number } = {}
): Promise<DetectedPack[]> {
  const ctx = loadContext(projectRoot);
  const minConfidence = options.minConfidence ?? 0.5;

  const detected: DetectedPack[] = [];
  for (const rule of RULES) {
    try {
      const { confidence, reasons } = rule.detect(ctx);
      if (confidence >= minConfidence) {
        detected.push({
          name: rule.name,
          category: rule.category,
          confidence,
          reasons,
          available: SHIPPED_PACKS[rule.category]?.has(rule.name) ?? false,
        });
      }
    } catch (err) {
      logger.debug(`Detection rule ${rule.name} failed: ${err}`);
    }
  }

  // Sort: shipped first, then highest confidence
  detected.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return b.confidence - a.confidence;
  });

  return detected;
}

/**
 * Back-compat thin wrapper — returns just pack names like the previous API.
 * Keeps existing callers (refresh, doctor, etc.) working unchanged.
 */
export async function detectPacks(projectRoot: string): Promise<string[]> {
  const detailed = await detectPacksDetailed(projectRoot);
  const names = detailed.map((d) => d.name);
  for (const name of names) logger.debug(`Detected pack: ${name}`);
  return names;
}
