import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runAutoFix, getFixableRuleIds } from '../../src/core/security-fixer';
import { VulnerabilityFinding } from '../../src/core/vulnerability-scanner';

function makeTmpFile(name: string, content: string): { dir: string; file: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'magneto-fix-'));
  fs.writeFileSync(path.join(dir, name), content, 'utf-8');
  return { dir, file: name };
}

function makefinding(overrides: Partial<VulnerabilityFinding>): VulnerabilityFinding {
  return {
    id: 'sec-md5-sha1',
    severity: 'warning',
    title: 'Weak Hash',
    description: 'test',
    file: 'crypto.ts',
    line: 1,
    column: 1,
    snippet: '',
    category: 'cryptography',
    ...overrides,
  };
}

describe('security-fixer', () => {
  it('exports fixable rule IDs', () => {
    const ids = getFixableRuleIds();
    expect(ids).toContain('sec-md5-sha1');
    expect(ids).toContain('sec-debug-production');
    expect(ids).toContain('sec-hardcoded-generic-secret');
  });

  it('fixes MD5 → SHA256 in .ts file', async () => {
    const content = "const h = crypto.createHash('md5').update(data).digest('hex');";
    const { dir, file } = makeTmpFile('crypto.ts', content);
    const finding = makefinding({ file, line: 1 });

    const report = await runAutoFix(dir, [finding]);

    expect(report.applied).toBe(1);
    const fixed = fs.readFileSync(path.join(dir, file), 'utf-8');
    expect(fixed).toContain("createHash('sha256')");
    expect(fixed).not.toContain("createHash('md5')");
    fs.rmSync(dir, { recursive: true });
  });

  it('fixes SHA1 → SHA256', async () => {
    const content = "crypto.createHash('sha1').update(buf).digest('base64');";
    const { dir, file } = makeTmpFile('hash.ts', content);
    const finding = makefinding({ file, line: 1 });

    await runAutoFix(dir, [finding]);
    const fixed = fs.readFileSync(path.join(dir, file), 'utf-8');
    expect(fixed).toContain("createHash('sha256')");
    fs.rmSync(dir, { recursive: true });
  });

  it('fixes DEBUG = True in Python', async () => {
    const content = 'DEBUG = True\nSECRET_KEY = "abc"';
    const { dir, file } = makeTmpFile('settings.py', content);
    const finding = makefinding({ id: 'sec-debug-production', file, line: 1, category: 'misconfiguration' });

    const report = await runAutoFix(dir, [finding]);
    expect(report.applied).toBe(1);
    const fixed = fs.readFileSync(path.join(dir, file), 'utf-8');
    expect(fixed).toContain("os.environ.get('DEBUG'");
    expect(fixed).not.toContain('DEBUG = True');
    fs.rmSync(dir, { recursive: true });
  });

  it('dry-run does not write files', async () => {
    const content = "crypto.createHash('md5').update(data).digest('hex');";
    const { dir, file } = makeTmpFile('crypto.ts', content);
    const finding = makefinding({ file, line: 1 });

    const report = await runAutoFix(dir, [finding], { dryRun: true });

    expect(report.applied).toBe(0);
    const unchanged = fs.readFileSync(path.join(dir, file), 'utf-8');
    expect(unchanged).toContain("createHash('md5')");
    fs.rmSync(dir, { recursive: true });
  });

  it('dry-run still includes diff in results', async () => {
    const content = "crypto.createHash('sha1').update(d).digest('hex');";
    const { dir, file } = makeTmpFile('hash.js', content);
    const finding = makefinding({ file, line: 1 });

    const report = await runAutoFix(dir, [finding], { dryRun: true });
    const withDiff = report.results.find((r) => r.diff);
    expect(withDiff).toBeDefined();
    fs.rmSync(dir, { recursive: true });
  });

  it('returns zero applied for unfixable rule', async () => {
    const { dir } = makeTmpFile('x.ts', 'fetch(req.query.url)');
    const finding = makefinding({ id: 'sec-ssrf-user-url', file: 'x.ts', line: 1, category: 'ssrf' });

    const report = await runAutoFix(dir, [finding]);
    expect(report.applied).toBe(0);
    fs.rmSync(dir, { recursive: true });
  });

  it('reports fixable count correctly', async () => {
    const { dir } = makeTmpFile('a.ts', "createHash('md5')");
    const findings = [
      makefinding({ file: 'a.ts', line: 1 }),
      makefinding({ id: 'sec-ssrf-user-url', file: 'a.ts', line: 1, category: 'ssrf' }),
    ];

    const report = await runAutoFix(dir, findings);
    expect(report.fixable).toBe(1);
    expect(report.totalFindings).toBe(2);
    fs.rmSync(dir, { recursive: true });
  });
});
