import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface DependencyVuln {
  packageName: string;
  installedVersion: string;
  ecosystem: 'npm' | 'PyPI' | 'Maven';
  vulnId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
  aliases: string[];
  fixedIn: string[];
  referenceUrl: string;
}

export interface GroupedVulnerability {
  packageName: string;
  installedVersion: string;
  ecosystem: 'npm' | 'PyPI' | 'Maven';
  highestSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  cveCount: number;
  cves: DependencyVuln[];
  recommendedFixVersion: string | null;
}

export interface DependencyScanResult {
  scannedManifests: string[];
  checkedPackages: number;
  vulnerabilities: DependencyVuln[];
  groupedVulnerabilities: GroupedVulnerability[];
  durationMs: number;
  apiReachable: boolean;
}

interface OsvVuln {
  id: string;
  summary?: string;
  aliases?: string[];
  affected?: Array<{
    ranges?: Array<{
      type: string;
      events?: Array<{ introduced?: string; fixed?: string }>;
    }>;
    versions?: string[];
  }>;
  severity?: Array<{ type: string; score: string }>;
  references?: Array<{ url: string }>;
}

interface OsvResponse {
  vulns?: OsvVuln[];
}

const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const OSV_QUERY_URL = 'https://api.osv.dev/v1/query';

function scoreToSeverity(score: number): DependencyVuln['severity'] {
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  return 'LOW';
}

function parseOsvSeverity(vuln: OsvVuln): DependencyVuln['severity'] {
  const cvss = vuln.severity?.find((s) => s.type === 'CVSS_V3' || s.type === 'CVSS_V2');
  if (cvss) {
    const score = parseFloat(cvss.score);
    if (!isNaN(score)) return scoreToSeverity(score);
  }
  return 'MEDIUM';
}

function extractFixedVersions(vuln: OsvVuln): string[] {
  const fixed: string[] = [];
  for (const affected of vuln.affected ?? []) {
    for (const range of affected.ranges ?? []) {
      for (const event of range.events ?? []) {
        if (event.fixed) fixed.push(event.fixed);
      }
    }
  }
  return [...new Set(fixed)];
}

async function queryOsvSingle(
  packageName: string,
  version: string,
  ecosystem: 'npm' | 'PyPI' | 'Maven'
): Promise<OsvResponse> {
  const body = JSON.stringify({
    version,
    package: { name: packageName, ecosystem },
  });
  const response = await fetch(OSV_QUERY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`OSV API ${response.status}`);
  return response.json() as Promise<OsvResponse>;
}

// ─── Manifest parsers ────────────────────────────────────────────────────────

function parsePackageJson(filePath: string): Array<{ name: string; version: string }> {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...raw.dependencies, ...raw.devDependencies };
    return Object.entries(all).map(([name, ver]) => ({
      name,
      version: ver.replace(/^[\^~>=<*]/, '').split(' ')[0].trim(),
    })).filter((p) => p.version && /^\d/.test(p.version));
  } catch {
    return [];
  }
}

function parseRequirementsTxt(filePath: string): Array<{ name: string; version: string }> {
  try {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    const results: Array<{ name: string; version: string }> = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
      const match = trimmed.match(/^([A-Za-z0-9_.-]+)==([^\s;]+)/);
      if (match) results.push({ name: match[1], version: match[2] });
    }
    return results;
  } catch {
    return [];
  }
}

function parsePomXml(filePath: string): Array<{ name: string; version: string }> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const deps: Array<{ name: string; version: string }> = [];
    const depRegex = /<dependency>[\s\S]*?<groupId>(.*?)<\/groupId>[\s\S]*?<artifactId>(.*?)<\/artifactId>[\s\S]*?<version>(.*?)<\/version>[\s\S]*?<\/dependency>/g;
    let match: RegExpExecArray | null;
    while ((match = depRegex.exec(content)) !== null) {
      const version = match[3].trim();
      if (!version.startsWith('$')) {
        deps.push({ name: `${match[1].trim()}:${match[2].trim()}`, version });
      }
    }
    return deps;
  } catch {
    return [];
  }
}

// Parse package-lock.json v2/v3 — captures transitive deps (where most CVEs live)
function parsePackageLock(filePath: string): Array<{ name: string; version: string }> {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
      lockfileVersion?: number;
      packages?: Record<string, { version?: string; dev?: boolean }>;
      dependencies?: Record<string, { version?: string; dev?: boolean; dependencies?: unknown }>;
    };

    const results: Array<{ name: string; version: string }> = [];

    // lockfileVersion 2/3 — "packages" key with paths like "node_modules/foo"
    if (raw.packages) {
      for (const [pkgPath, info] of Object.entries(raw.packages)) {
        if (!pkgPath || !info?.version) continue;
        // Path is like "node_modules/foo" or "node_modules/foo/node_modules/bar"
        const match = pkgPath.match(/node_modules\/((?:@[^/]+\/)?[^/]+)$/);
        if (match) {
          results.push({ name: match[1], version: info.version });
        }
      }
    }

    // lockfileVersion 1 fallback — "dependencies" tree
    if (raw.dependencies && results.length === 0) {
      const walk = (deps: Record<string, { version?: string; dependencies?: unknown }>) => {
        for (const [name, info] of Object.entries(deps)) {
          if (info?.version) results.push({ name, version: info.version });
          if (info?.dependencies) walk(info.dependencies as Record<string, { version?: string; dependencies?: unknown }>);
        }
      };
      walk(raw.dependencies);
    }

    return results;
  } catch {
    return [];
  }
}

// Recursively find manifest files, skipping standard ignore dirs
function findManifests(rootDir: string, filename: string): string[] {
  const results: string[] = [];
  const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.magneto', '.turbo', '.cache']);

  const walk = (dir: string, depth: number) => {
    if (depth > 6) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORE.has(entry.name) || entry.name.startsWith('.') && entry.name !== '.github') continue;
        walk(path.join(dir, entry.name), depth + 1);
      } else if (entry.name === filename) {
        results.push(path.join(dir, entry.name));
      }
    }
  };
  walk(rootDir, 0);
  return results;
}

// ─── Main scanner ─────────────────────────────────────────────────────────────

export async function runDependencyScanner(rootDir: string): Promise<DependencyScanResult> {
  const start = Date.now();
  const scannedManifests: string[] = [];
  const allPackages: Array<{ name: string; version: string; ecosystem: 'npm' | 'PyPI' | 'Maven' }> = [];

  // Discover all manifests recursively across the repo
  const packageJsons = findManifests(rootDir, 'package.json');
  const packageLocks = findManifests(rootDir, 'package-lock.json');
  const requirementsFiles = findManifests(rootDir, 'requirements.txt');
  const pomFiles = findManifests(rootDir, 'pom.xml');

  // package.json — direct deps
  for (const full of packageJsons) {
    const rel = path.relative(rootDir, full) || 'package.json';
    scannedManifests.push(rel);
    const packages = parsePackageJson(full);
    allPackages.push(...packages.map((p) => ({ ...p, ecosystem: 'npm' as const })));
  }

  // package-lock.json — transitive deps (where most CVEs hide)
  for (const full of packageLocks) {
    const rel = path.relative(rootDir, full) || 'package-lock.json';
    scannedManifests.push(rel);
    const packages = parsePackageLock(full);
    allPackages.push(...packages.map((p) => ({ ...p, ecosystem: 'npm' as const })));
  }

  // requirements.txt
  for (const full of requirementsFiles) {
    const rel = path.relative(rootDir, full);
    scannedManifests.push(rel);
    const packages = parseRequirementsTxt(full);
    allPackages.push(...packages.map((p) => ({ ...p, ecosystem: 'PyPI' as const })));
  }

  // pom.xml
  for (const full of pomFiles) {
    const rel = path.relative(rootDir, full);
    scannedManifests.push(rel);
    const packages = parsePomXml(full);
    allPackages.push(...packages.map((p) => ({ ...p, ecosystem: 'Maven' as const })));
  }

  // Dedupe by name@version@ecosystem (lockfiles can list the same dep multiple times)
  const seen = new Set<string>();
  const dedupedPackages = allPackages.filter((p) => {
    const key = `${p.ecosystem}:${p.name}@${p.version}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  allPackages.length = 0;
  allPackages.push(...dedupedPackages);

  if (allPackages.length === 0) {
    return { scannedManifests, checkedPackages: 0, vulnerabilities: [], groupedVulnerabilities: [], durationMs: Date.now() - start, apiReachable: true };
  }

  logger.info(`[glasswing] Scanning ${allPackages.length} dependencies via OSV.dev...`);

  const vulnerabilities: DependencyVuln[] = [];
  let apiReachable = true;

  // Query OSV in parallel batches of 10
  const BATCH = 10;
  for (let i = 0; i < allPackages.length; i += BATCH) {
    const batch = allPackages.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((pkg) => queryOsvSingle(pkg.name, pkg.version, pkg.ecosystem))
    );

    for (let j = 0; j < results.length; j++) {
      const res = results[j];
      const pkg = batch[j];

      if (res.status === 'rejected') {
        apiReachable = false;
        continue;
      }

      for (const vuln of res.value.vulns ?? []) {
        vulnerabilities.push({
          packageName: pkg.name,
          installedVersion: pkg.version,
          ecosystem: pkg.ecosystem,
          vulnId: vuln.id,
          severity: parseOsvSeverity(vuln),
          summary: vuln.summary ?? 'No summary available',
          aliases: vuln.aliases ?? [],
          fixedIn: extractFixedVersions(vuln),
          referenceUrl: vuln.references?.[0]?.url ?? `https://osv.dev/vulnerability/${vuln.id}`,
        });
      }
    }
  }

  const sorted = vulnerabilities.sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.severity] - order[b.severity];
  });

  const grouped = groupVulnerabilities(sorted);

  return {
    scannedManifests,
    checkedPackages: allPackages.length,
    vulnerabilities: sorted,
    groupedVulnerabilities: grouped,
    durationMs: Date.now() - start,
    apiReachable,
  };
}

// ─── Grouping + semver fix selection ──────────────────────────────────────

function parseSemver(v: string): [number, number, number] | null {
  const m = v.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return a.localeCompare(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

function pickRecommendedFix(installed: string, fixSets: string[][]): string | null {
  // Each CVE provides one or more fix versions. We need a single version that
  // satisfies all CVEs (i.e., ≥ the lowest acceptable fix from each set).
  if (fixSets.length === 0) return null;
  const flatCandidates = Array.from(new Set(fixSets.flat())).filter((v) => parseSemver(v));
  if (flatCandidates.length === 0) return null;

  // Sort candidates ascending
  const sortedCandidates = [...flatCandidates].sort(compareSemver);

  // For each candidate, check that for every CVE, at least one of its fix versions is ≤ candidate
  for (const candidate of sortedCandidates) {
    if (compareSemver(candidate, installed) <= 0) continue;
    const satisfiesAll = fixSets.every((set) =>
      set.some((fix) => parseSemver(fix) && compareSemver(fix, candidate) <= 0)
    );
    if (satisfiesAll) return candidate;
  }
  // Fallback: highest fix from any CVE
  return sortedCandidates[sortedCandidates.length - 1] ?? null;
}

export function groupVulnerabilities(vulns: DependencyVuln[]): GroupedVulnerability[] {
  const buckets = new Map<string, DependencyVuln[]>();
  for (const v of vulns) {
    const key = `${v.ecosystem}:${v.packageName}@${v.installedVersion}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(v);
  }

  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

  const groups: GroupedVulnerability[] = [];
  for (const cves of buckets.values()) {
    const first = cves[0];
    const highestSeverity = cves.reduce<DependencyVuln['severity']>(
      (acc, c) => (order[c.severity] < order[acc] ? c.severity : acc),
      'LOW'
    );
    const fixSets = cves.map((c) => c.fixedIn).filter((s) => s.length > 0);
    groups.push({
      packageName: first.packageName,
      installedVersion: first.installedVersion,
      ecosystem: first.ecosystem,
      highestSeverity,
      cveCount: cves.length,
      cves,
      recommendedFixVersion: pickRecommendedFix(first.installedVersion, fixSets),
    });
  }

  return groups.sort((a, b) => {
    const sevDiff = order[a.highestSeverity] - order[b.highestSeverity];
    if (sevDiff !== 0) return sevDiff;
    return b.cveCount - a.cveCount;
  });
}

export function renderDependencyScanText(result: DependencyScanResult): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('[glasswing] Dependency Scan Results (OSV.dev)');
  lines.push(`  Manifests: ${result.scannedManifests.length} · Packages checked: ${result.checkedPackages}`);
  if (!result.apiReachable) lines.push('  ⚠  OSV API unreachable — some packages may not have been checked');
  lines.push('');

  if (result.groupedVulnerabilities.length === 0) {
    lines.push('  ✅ No known vulnerable dependencies');
    return lines.join('\n');
  }

  for (const g of result.groupedVulnerabilities) {
    const icon = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵' }[g.highestSeverity];
    const cveLabel = g.cveCount === 1 ? '1 CVE' : `${g.cveCount} CVEs`;
    lines.push(`${icon} [${g.highestSeverity}] ${g.packageName}@${g.installedVersion}  (${cveLabel})`);
    if (g.recommendedFixVersion) {
      lines.push(`   → upgrade to ${g.recommendedFixVersion}`);
    } else {
      lines.push('   → no fix version available');
    }
    for (const c of g.cves.slice(0, 3)) {
      lines.push(`   • ${c.vulnId}${c.aliases[0] ? ' (' + c.aliases[0] + ')' : ''} — ${c.summary.slice(0, 80)}`);
    }
    if (g.cves.length > 3) lines.push(`   • … and ${g.cves.length - 3} more`);
    lines.push('');
  }

  lines.push(`  Total: ${result.groupedVulnerabilities.length} vulnerable packages · ${result.vulnerabilities.length} CVEs`);
  return lines.join('\n');
}
