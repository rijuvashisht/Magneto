import * as path from 'path';
import * as fs from 'fs';
import { loadPowerPacks } from '../../src/core/power-pack-loader';
import { detectPacksDetailed } from '../../src/core/detect-packs';
import { ensureDir, writeJson, writeText, readJson } from '../../src/utils/fs';

const FIXTURE_ROOT = path.join(__dirname, '..', '__fixtures__', 'java-pack');
const PACK_TEMPLATE_DIR = path.join(
  __dirname,
  '..',
  '..',
  'src',
  'templates',
  'power-packs',
  'languages',
  'java'
);

afterEach(() => {
  fs.rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

describe('Java power pack', () => {
  it('ships pack.json and rules.md with required fields', () => {
    const packPath = path.join(PACK_TEMPLATE_DIR, 'pack.json');
    const rulesPath = path.join(PACK_TEMPLATE_DIR, 'rules.md');
    expect(fs.existsSync(packPath)).toBe(true);
    expect(fs.existsSync(rulesPath)).toBe(true);

    const pack = readJson<{
      name: string;
      category: string;
      rules: string[];
      checks: { id: string; severity: string; pattern?: string }[];
    }>(packPath);

    expect(pack.name).toBe('java');
    expect(pack.category).toBe('languages');
    expect(pack.rules.length).toBeGreaterThan(0);
    expect(pack.checks.length).toBeGreaterThan(0);

    for (const c of pack.checks) {
      expect(c.id).toMatch(/^java-/);
      expect(['info', 'warning', 'error']).toContain(c.severity);
      if (c.pattern) {
        expect(() => new RegExp(c.pattern!)).not.toThrow();
      }
    }
  });

  it('covers critical security checks', () => {
    const pack = readJson<{ checks: { id: string }[] }>(
      path.join(PACK_TEMPLATE_DIR, 'pack.json')
    );
    const ids = pack.checks.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'java-catch-throwable',
        'java-swallowed-interrupt',
        'java-runtime-exec',
        'java-hardcoded-secret',
        'java-unsafe-deserialize',
        'java-sql-concat',
      ])
    );
  });

  it('rules.md mentions modern Java features', () => {
    const content = fs.readFileSync(path.join(PACK_TEMPLATE_DIR, 'rules.md'), 'utf-8');
    expect(content).toMatch(/Records/i);
    expect(content).toMatch(/Sealed/i);
    expect(content).toMatch(/Pattern matching/i);
    expect(content).toMatch(/Virtual threads/i);
  });

  it('installs into a target project', async () => {
    ensureDir(FIXTURE_ROOT);
    ensureDir(path.join(FIXTURE_ROOT, '.magneto'));
    writeJson(path.join(FIXTURE_ROOT, '.magneto', 'magneto.config.json'), {
      powerPacks: [],
    });

    await loadPowerPacks(FIXTURE_ROOT, 'java');

    expect(
      fs.existsSync(
        path.join(FIXTURE_ROOT, '.magneto', 'power-packs', 'languages', 'java', 'pack.json')
      )
    ).toBe(true);

    const config = readJson<{ powerPacks: string[] }>(
      path.join(FIXTURE_ROOT, '.magneto', 'magneto.config.json')
    );
    expect(config.powerPacks).toContain('java');
  });

  it('is marked available when detected from pom.xml', async () => {
    ensureDir(FIXTURE_ROOT);
    writeText(path.join(FIXTURE_ROOT, 'pom.xml'), '<project></project>');

    const detected = await detectPacksDetailed(FIXTURE_ROOT);
    const java = detected.find((d) => d.name === 'java');
    expect(java).toBeDefined();
    expect(java!.available).toBe(true);
  });
});
