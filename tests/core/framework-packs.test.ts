import * as path from 'path';
import * as fs from 'fs';
import { loadPowerPacks } from '../../src/core/power-pack-loader';
import { detectPacksDetailed } from '../../src/core/detect-packs';
import { ensureDir, writeJson, writeText, readJson } from '../../src/utils/fs';

const FIXTURE_ROOT = path.join(__dirname, '..', '__fixtures__', 'framework-packs');
const TEMPLATES_DIR = path.join(
  __dirname,
  '..',
  '..',
  'src',
  'templates',
  'power-packs',
  'frameworks'
);

afterEach(() => {
  fs.rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

interface PackJson {
  name: string;
  category: string;
  version: string;
  description: string;
  rules: string[];
  checks: { id: string; description: string; severity: string; pattern?: string }[];
}

function validatePack(packDir: string, expectedName: string, idPrefix: RegExp): void {
  const packPath = path.join(packDir, 'pack.json');
  const rulesPath = path.join(packDir, 'rules.md');
  expect(fs.existsSync(packPath)).toBe(true);
  expect(fs.existsSync(rulesPath)).toBe(true);

  const pack = readJson<PackJson>(packPath);
  expect(pack.name).toBe(expectedName);
  expect(pack.category).toBe('frameworks');
  expect(pack.rules.length).toBeGreaterThan(0);
  expect(pack.checks.length).toBeGreaterThan(0);

  for (const c of pack.checks) {
    expect(c.id).toMatch(idPrefix);
    expect(['info', 'warning', 'error']).toContain(c.severity);
    if (c.pattern) {
      expect(() => new RegExp(c.pattern!)).not.toThrow();
    }
  }
}

describe('FastAPI power pack', () => {
  const packDir = path.join(TEMPLATES_DIR, 'fastapi');

  it('ships a valid pack.json and rules.md', () => {
    validatePack(packDir, 'fastapi', /^fastapi-/);
  });

  it('covers critical security checks', () => {
    const pack = readJson<PackJson>(path.join(packDir, 'pack.json'));
    const ids = pack.checks.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'fastapi-cors-wildcard-with-credentials',
        'fastapi-hardcoded-secret-key',
        'fastapi-sync-io-in-async',
      ])
    );
  });

  it('installs into a target project', async () => {
    ensureDir(FIXTURE_ROOT);
    ensureDir(path.join(FIXTURE_ROOT, '.magneto'));
    writeJson(path.join(FIXTURE_ROOT, '.magneto', 'magneto.config.json'), {
      powerPacks: [],
    });

    await loadPowerPacks(FIXTURE_ROOT, 'fastapi');
    expect(
      fs.existsSync(
        path.join(FIXTURE_ROOT, '.magneto', 'power-packs', 'frameworks', 'fastapi', 'pack.json')
      )
    ).toBe(true);

    const config = readJson<{ powerPacks: string[] }>(
      path.join(FIXTURE_ROOT, '.magneto', 'magneto.config.json')
    );
    expect(config.powerPacks).toContain('fastapi');
  });

  it('is marked available when detected', async () => {
    ensureDir(FIXTURE_ROOT);
    writeText(path.join(FIXTURE_ROOT, 'requirements.txt'), 'fastapi==0.110\n');

    const detected = await detectPacksDetailed(FIXTURE_ROOT);
    const fastapi = detected.find((d) => d.name === 'fastapi');
    expect(fastapi).toBeDefined();
    expect(fastapi!.available).toBe(true);
  });
});

describe('Spring Boot power pack', () => {
  const packDir = path.join(TEMPLATES_DIR, 'spring-boot');

  it('ships a valid pack.json and rules.md', () => {
    validatePack(packDir, 'spring-boot', /^spring-/);
  });

  it('covers critical security and config checks', () => {
    const pack = readJson<PackJson>(path.join(packDir, 'pack.json'));
    const ids = pack.checks.map((c) => c.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'spring-actuator-all-exposed',
        'spring-ddl-create',
        'spring-hardcoded-password',
        'spring-transactional-on-private',
      ])
    );
  });

  it('installs into a target project', async () => {
    ensureDir(FIXTURE_ROOT);
    ensureDir(path.join(FIXTURE_ROOT, '.magneto'));
    writeJson(path.join(FIXTURE_ROOT, '.magneto', 'magneto.config.json'), {
      powerPacks: [],
    });

    await loadPowerPacks(FIXTURE_ROOT, 'spring-boot');
    expect(
      fs.existsSync(
        path.join(
          FIXTURE_ROOT,
          '.magneto',
          'power-packs',
          'frameworks',
          'spring-boot',
          'pack.json'
        )
      )
    ).toBe(true);

    const config = readJson<{ powerPacks: string[] }>(
      path.join(FIXTURE_ROOT, '.magneto', 'magneto.config.json')
    );
    expect(config.powerPacks).toContain('spring-boot');
  });

  it('is marked available when detected from pom.xml', async () => {
    ensureDir(FIXTURE_ROOT);
    writeText(
      path.join(FIXTURE_ROOT, 'pom.xml'),
      '<project><parent><artifactId>spring-boot-starter-parent</artifactId></parent></project>'
    );

    const detected = await detectPacksDetailed(FIXTURE_ROOT);
    const sb = detected.find((d) => d.name === 'spring-boot');
    expect(sb).toBeDefined();
    expect(sb!.available).toBe(true);
  });
});
