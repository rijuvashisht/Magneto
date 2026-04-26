// Spec-Driven Development (SDD) framework abstraction.
//
// Magneto supports three SDD frameworks behind a single interface:
//   - openspec  → brownfield-first, delta-based (ADDED/MODIFIED/REMOVED)
//   - speckit   → greenfield, branch-per-spec, GitHub Spec Kit
//   - bmad      → multi-agent (PM/Architect/SM/Dev/QA), audit-friendly
//
// Reference: dev.to/willtorber/spec-kit-vs-bmad-vs-openspec-2026
//            arXiv 2602.00180v1 "Spec-Driven Development"
//            github/spec-kit#980 (constitution best practices)

export type SddFramework = 'openspec' | 'speckit' | 'bmad';

export interface SddFrameworkInfo {
  id: SddFramework;
  displayName: string;
  bestFor: 'brownfield' | 'greenfield' | 'regulated';
  /** One-line description shown in the init prompt. */
  tagline: string;
  /** Long description shown in `magneto sdd status`. */
  description: string;
  /** Filesystem markers used by the auto-detector. */
  detectionMarkers: string[];
  /** External CLI invocation for upstream init (optional fallback). */
  upstreamInit?: { cmd: string; args: string[] };
}

export interface SddInitOptions {
  projectRoot: string;
  framework: SddFramework;
  /** When true, do not write files; just report what would happen. */
  dryRun?: boolean;
  /** When true, overwrite existing scaffolding. */
  force?: boolean;
}

export interface SddInitResult {
  framework: SddFramework;
  filesCreated: string[];
  filesSkipped: string[];
  warnings: string[];
}

export interface SddNewChangeOptions {
  projectRoot: string;
  /** kebab-case change name, e.g. `add-dark-mode`. */
  name: string;
  /** Short human description of the change. */
  description: string;
  dryRun?: boolean;
}

export interface SddNewChangeResult {
  framework: SddFramework;
  changeDir: string;
  filesCreated: string[];
}

export interface SddStatusReport {
  framework: SddFramework | null;
  detected: SddFramework[];
  scaffolded: boolean;
  /** Top-level project description / constitution path. */
  constitutionPath?: string;
  /** Active changes / specs in flight. */
  activeChanges: string[];
  /** Frozen / merged specs that describe the current system. */
  frozenSpecs: string[];
}

export interface SddSyncReport {
  framework: SddFramework;
  /** Items where spec ↔ code diverged. */
  drifts: SddDrift[];
  /** Files the reconciler updated (or would update in dry-run). */
  updatedFiles: string[];
  dryRun: boolean;
}

export interface SddDrift {
  specPath: string;
  codePath: string;
  kind: 'spec-stale' | 'code-undocumented' | 'spec-only' | 'mismatch';
  summary: string;
}

/**
 * Adapter contract every SDD framework must implement.
 * Keep methods small and side-effect-explicit so unit tests can
 * stub a fake projectRoot without hitting the network.
 */
export interface SddAdapter {
  readonly info: SddFrameworkInfo;

  /** Scaffold the framework's directory structure inside projectRoot. */
  init(opts: SddInitOptions): Promise<SddInitResult>;

  /** Return true if this framework is already scaffolded in projectRoot. */
  isScaffolded(projectRoot: string): boolean;

  /** Create a new change/spec/feature scaffold. */
  newChange(opts: SddNewChangeOptions): Promise<SddNewChangeResult>;

  /** Report active and frozen specs. */
  status(projectRoot: string): Promise<SddStatusReport>;

  /**
   * Reconcile spec ↔ code drift. The default implementation in
   * `reconciler.ts` handles the heavy lifting; adapters can override
   * to add framework-specific passes.
   */
  sync(projectRoot: string, dryRun?: boolean): Promise<SddSyncReport>;
}
