import * as path from 'path';
import * as fs from 'fs';
import { loadPowerPacks } from '../../src/core/power-pack-loader';
import { detectPacksDetailed } from '../../src/core/detect-packs';
import { ensureDir, writeJson, writeText, readJson } from '../../src/utils/fs';

const FIXTURE_ROOT = path.join(__dirname, '..', '__fixtures__', 'python-pack');
const PACK_TEMPLATE_DIR = path.join(
  __dirname,
  '..',
  '..',
  'src',
  'templates',
  'power-packs',
  'languages',
  'python'
);

afterEach(() => {
  fs.rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

describe('python power pack', () => {
  it('ships pack.json with required fields', () => {
    const packPath = path.join(PACK_TEMPLATE_DIR, 'pack.json');
    expect(fs.existsSync(packPath)).toBe(true);

    const pack = readJson<{
      name: string;
      category: string;
      version: string;
      description: string;
      rules: string[];
      checks: { id: string; severity: string }[];
    }>(packPath);

    expect(pack.name).toBe('python');
    expect(pack.category).toBe('languages');
    expect(pack.rules.length).toBeGreaterThan(0);
    expect(pack.checks.length).toBeGreaterThan(0);

    // All checks have ids and valid severities
    for (const c of pack.checks) {
      expect(c.id).toMatch(/^py-/);
      expect(['info', 'warning', 'error']).toContain(c.severity);
    }
  });

  it('ships rules.md', () => {
    const rulesPath = path.join(PACK_TEMPLATE_DIR, 'rules.md');
    expect(fs.existsSync(rulesPath)).toBe(true);
    const content = fs.readFileSync(rulesPath, 'utf-8');
    expect(content).toMatch(/Python Power Pack/i);
    expect(content).toMatch(/Security/i);
    expect(content).toMatch(/Type Safety/i);
  });

  it('covers critical security checks', () => {
    const pack = readJson<{ checks: { id: string }[] }>(
      path.join(PACK_TEMPLATE_DIR, 'pack.json')
    );
    const ids = pack.checks.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'py-eval-exec',
        'py-sql-injection',
        'py-shell-true',
        'py-pickle-loads',
        'py-yaml-unsafe-load',
        'py-hardcoded-secret',
      ])
    );
  });

  it('regex patterns compile', () => {
    const pack = readJson<{ checks: { id: string; pattern?: string }[] }>(
      path.join(PACK_TEMPLATE_DIR, 'pack.json')
    );
    for (const c of pack.checks) {
      if (c.pattern) {
        expect(() => new RegExp(c.pattern!)).not.toThrow();
      }
    }
  });

  it('loadPowerPacks copies python pack into target project', async () => {
    // Set up a minimal magneto project
    ensureDir(FIXTURE_ROOT);
    const magnetoDir = path.join(FIXTURE_ROOT, '.magneto');
    ensureDir(magnetoDir);
    writeJson(path.join(magnetoDir, 'magneto.config.json'), {
      powerPacks: [],
    });

    await loadPowerPacks(FIXTURE_ROOT, 'python');

    const installedPack = path.join(
      magnetoDir,
      'power-packs',
      'languages',
      'python',
      'pack.json'
    );
    expect(fs.existsSync(installedPack)).toBe(true);

    const installedRules = path.join(
      magnetoDir,
      'power-packs',
      'languages',
      'python',
      'rules.md'
    );
    expect(fs.existsSync(installedRules)).toBe(true);

    // Config updated
    const config = readJson<{ powerPacks: string[] }>(
      path.join(magnetoDir, 'magneto.config.json')
    );
    expect(config.powerPacks).toContain('python');
  });

  it('is marked available in detection (not planned)', async () => {
    ensureDir(FIXTURE_ROOT);
    writeText(path.join(FIXTURE_ROOT, 'requirements.txt'), 'fastapi==0.110\n');

    const detected = await detectPacksDetailed(FIXTURE_ROOT);
    const py = detected.find((d) => d.name === 'python');
    expect(py).toBeDefined();
    expect(py!.available).toBe(true);
  });
});
