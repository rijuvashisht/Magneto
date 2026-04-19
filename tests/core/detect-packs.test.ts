import { detectPacks } from '../../src/core/detect-packs';
import * as path from 'path';
import * as fs from 'fs';
import { ensureDir, writeJson } from '../../src/utils/fs';

const TEST_ROOT = path.join(__dirname, '..', '__fixtures__', 'detect-project');

afterEach(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
});

describe('detectPacks', () => {
  it('should detect typescript from tsconfig.json', async () => {
    ensureDir(TEST_ROOT);
    fs.writeFileSync(path.join(TEST_ROOT, 'tsconfig.json'), '{}');
    writeJson(path.join(TEST_ROOT, 'package.json'), {});

    const packs = await detectPacks(TEST_ROOT);
    expect(packs).toContain('typescript');
  });

  it('should detect typescript from package.json devDependencies', async () => {
    ensureDir(TEST_ROOT);
    writeJson(path.join(TEST_ROOT, 'package.json'), {
      devDependencies: { typescript: '^5.0.0' },
    });

    const packs = await detectPacks(TEST_ROOT);
    expect(packs).toContain('typescript');
  });

  it('should detect nextjs from package.json dependencies', async () => {
    ensureDir(TEST_ROOT);
    writeJson(path.join(TEST_ROOT, 'package.json'), {
      dependencies: { next: '^14.0.0', react: '^18.0.0' },
    });

    const packs = await detectPacks(TEST_ROOT);
    expect(packs).toContain('nextjs');
    expect(packs).toContain('react');
  });

  it('should detect ai-platform from openai dependency', async () => {
    ensureDir(TEST_ROOT);
    writeJson(path.join(TEST_ROOT, 'package.json'), {
      dependencies: { openai: '^4.0.0' },
    });

    const packs = await detectPacks(TEST_ROOT);
    expect(packs).toContain('ai-platform');
  });

  it('should detect azure from azure.yaml', async () => {
    ensureDir(TEST_ROOT);
    fs.writeFileSync(path.join(TEST_ROOT, 'azure.yaml'), 'name: my-app');
    writeJson(path.join(TEST_ROOT, 'package.json'), {});

    const packs = await detectPacks(TEST_ROOT);
    expect(packs).toContain('azure');
  });

  it('should detect graphify from .graphify-out/graph.json', async () => {
    ensureDir(path.join(TEST_ROOT, '.graphify-out'));
    writeJson(path.join(TEST_ROOT, '.graphify-out', 'graph.json'), { nodes: [], edges: [] });
    writeJson(path.join(TEST_ROOT, 'package.json'), {});

    const packs = await detectPacks(TEST_ROOT);
    expect(packs).toContain('graphify');
  });

  it('should return empty for a bare project', async () => {
    ensureDir(TEST_ROOT);
    writeJson(path.join(TEST_ROOT, 'package.json'), {});

    const packs = await detectPacks(TEST_ROOT);
    expect(packs).toHaveLength(0);
  });

  it('should handle missing package.json gracefully', async () => {
    ensureDir(TEST_ROOT);

    const packs = await detectPacks(TEST_ROOT);
    // Should not crash, just return whatever it can detect from filesystem
    expect(Array.isArray(packs)).toBe(true);
  });
});
