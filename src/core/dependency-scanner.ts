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

export interface DependencyScanResult {
  scannedManifests: string[];
  checkedPackages: number;
  vulnerabilities: DependencyVuln[];
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

// ─── Main scanner ─────────────────────────────────────────────────────────────

export async function runDependencyScanner(rootDir: string): Promise<DependencyScanResult> {
  const start = Date.now();
  const scannedManifests: string[] = [];
  const allPackages: Array<{ name: string; version: string; ecosystem: 'npm' | 'PyPI' | 'Maven' }> = [];

  // Find manifests
  const candidates = [
    { file: 'package.json', parser: parsePackageJson, ecosystem: 'npm' as const },
    { file: 'requirements.txt', parser: parseRequirementsTxt, ecosystem: 'PyPI' as const },
    { file: 'pom.xml', parser: parsePomXml, ecosystem: 'Maven' as const },
  ];

  for (const { file, parser, ecosystem } of candidates) {
    const full = path.join(rootDir, file);
    if (fs.existsSync(full)) {
      scannedManifests.push(file);
      const packages = parser(full);
      allPackages.push(...packages.map((p) => ({ ...p, ecosystem })));
    }
  }

  if (allPackages.length === 0) {
    return { scannedManifests, checkedPackages: 0, vulnerabilities: [], durationMs: Date.now() - start, apiReachable: true };
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

  return {
    scannedManifests,
    checkedPackages: allPackages.length,
    vulnerabilities: vulnerabilities.sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return order[a.severity] - order[b.severity];
    }),
    durationMs: Date.now() - start,
    apiReachable,
  };
}

export function renderDependencyScanText(result: DependencyScanResult): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('[glasswing] Dependency Scan Results (OSV.dev)');
  lines.push(`  Manifests: ${result.scannedManifests.join(', ') || 'none found'}`);
  lines.push(`  Packages checked: ${result.checkedPackages}`);
  if (!result.apiReachable) lines.push('  ⚠  OSV API unreachable — some packages may not have been checked');
  lines.push('');

  if (result.vulnerabilities.length === 0) {
    lines.push('  ✅ No known vulnerable dependencies');
    return lines.join('\n');
  }

  for (const v of result.vulnerabilities) {
    const icon = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵' }[v.severity];
    lines.push(`${icon} [${v.severity}] ${v.packageName}@${v.installedVersion}`);
    lines.push(`   ${v.vulnId}${v.aliases.length ? ' (' + v.aliases.join(', ') + ')' : ''}`);
    lines.push(`   ${v.summary}`);
    if (v.fixedIn.length) lines.push(`   Fix: upgrade to ${v.fixedIn.join(' or ')}`);
    lines.push(`   Ref: ${v.referenceUrl}`);
    lines.push('');
  }

  lines.push(`  Total: ${result.vulnerabilities.length} vulnerable dependencies`);
  return lines.join('\n');
}
