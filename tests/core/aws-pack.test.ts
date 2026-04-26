import * as path from 'path';
import * as fs from 'fs';
import { loadPowerPacks } from '../../src/core/power-pack-loader';
import { detectPacksDetailed } from '../../src/core/detect-packs';
import { ensureDir, writeJson, writeText, readJson } from '../../src/utils/fs';

const FIXTURE_ROOT = path.join(__dirname, '..', '__fixtures__', 'aws-pack');
const PACK_TEMPLATE_DIR = path.join(
  __dirname,
  '..',
  '..',
  'src',
  'templates',
  'power-packs',
  'clouds',
  'aws'
);

afterEach(() => {
  fs.rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

describe('AWS power pack', () => {
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

    expect(pack.name).toBe('aws');
    expect(pack.category).toBe('clouds');
    expect(pack.rules.length).toBeGreaterThan(0);
    expect(pack.checks.length).toBeGreaterThan(0);

    for (const c of pack.checks) {
      expect(c.id).toMatch(/^aws-/);
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
        'aws-iam-wildcard-action-resource',
        'aws-s3-public-acl',
        'aws-sg-wide-open-ssh',
        'aws-sg-wide-open-db',
        'aws-rds-unencrypted',
        'aws-hardcoded-access-key',
        'aws-hardcoded-secret-key',
      ])
    );
  });

  it('hardcoded access key pattern matches AKIA format', () => {
    const pack = readJson<{ checks: { id: string; pattern?: string }[] }>(
      path.join(PACK_TEMPLATE_DIR, 'pack.json')
    );
    const akiaCheck = pack.checks.find((c) => c.id === 'aws-hardcoded-access-key');
    expect(akiaCheck?.pattern).toBeDefined();
    const re = new RegExp(akiaCheck!.pattern!);
    expect(re.test('AKIAIOSFODNN7EXAMPLE')).toBe(true);
    expect(re.test('not-an-aws-key')).toBe(false);
  });

  it('rules.md covers core AWS pillars', () => {
    const content = fs.readFileSync(path.join(PACK_TEMPLATE_DIR, 'rules.md'), 'utf-8');
    expect(content).toMatch(/IAM/i);
    expect(content).toMatch(/S3/i);
    expect(content).toMatch(/Encryption/i);
    expect(content).toMatch(/Lambda/i);
    expect(content).toMatch(/Terraform/i);
  });

  it('installs into a target project', async () => {
    ensureDir(FIXTURE_ROOT);
    ensureDir(path.join(FIXTURE_ROOT, '.magneto'));
    writeJson(path.join(FIXTURE_ROOT, '.magneto', 'magneto.config.json'), {
      powerPacks: [],
    });

    await loadPowerPacks(FIXTURE_ROOT, 'aws');

    expect(
      fs.existsSync(
        path.join(FIXTURE_ROOT, '.magneto', 'power-packs', 'clouds', 'aws', 'pack.json')
      )
    ).toBe(true);

    const config = readJson<{ powerPacks: string[] }>(
      path.join(FIXTURE_ROOT, '.magneto', 'magneto.config.json')
    );
    expect(config.powerPacks).toContain('aws');
  });

  it('is marked available when detected from cdk.json', async () => {
    ensureDir(FIXTURE_ROOT);
    writeText(path.join(FIXTURE_ROOT, 'cdk.json'), '{}');

    const detected = await detectPacksDetailed(FIXTURE_ROOT);
    const aws = detected.find((d) => d.name === 'aws');
    expect(aws).toBeDefined();
    expect(aws!.available).toBe(true);
  });
});
