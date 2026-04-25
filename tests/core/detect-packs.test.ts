import { detectPacks, detectPacksDetailed } from '../../src/core/detect-packs';
import * as path from 'path';
import * as fs from 'fs';
import { ensureDir, writeJson, writeText } from '../../src/utils/fs';

const TEST_ROOT = path.join(__dirname, '..', '__fixtures__', 'detect-project');

afterEach(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
});

describe('detectPacks (back-compat)', () => {
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
    // react is suppressed (low confidence) when next is also present —
    // installing both nextjs + react packs would be redundant.
    expect(packs).not.toContain('react');
  });

  it('should detect plain react when next is not present', async () => {
    ensureDir(TEST_ROOT);
    writeJson(path.join(TEST_ROOT, 'package.json'), {
      dependencies: { react: '^18.0.0' },
    });

    const packs = await detectPacks(TEST_ROOT);
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

  it('should detect javascript for a bare package.json without tsconfig', async () => {
    ensureDir(TEST_ROOT);
    writeJson(path.join(TEST_ROOT, 'package.json'), {});

    const packs = await detectPacks(TEST_ROOT);
    expect(packs).toContain('javascript');
  });

  it('should handle missing package.json gracefully', async () => {
    ensureDir(TEST_ROOT);

    const packs = await detectPacks(TEST_ROOT);
    expect(Array.isArray(packs)).toBe(true);
  });
});

describe('detectPacksDetailed — languages', () => {
  it('detects python from requirements.txt', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'requirements.txt'), 'requests==2.31\n');

    const detected = await detectPacksDetailed(TEST_ROOT);
    const py = detected.find((d) => d.name === 'python');
    expect(py).toBeDefined();
    expect(py!.category).toBe('languages');
    expect(py!.confidence).toBeGreaterThanOrEqual(0.9);
    expect(py!.reasons.join(' ')).toMatch(/requirements\.txt/);
  });

  it('detects python from pyproject.toml', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'pyproject.toml'), '[project]\nname = "x"\n');

    const detected = await detectPacksDetailed(TEST_ROOT);
    expect(detected.map((d) => d.name)).toContain('python');
  });

  it('detects java from pom.xml', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'pom.xml'), '<project></project>');

    const detected = await detectPacksDetailed(TEST_ROOT);
    expect(detected.map((d) => d.name)).toContain('java');
  });

  it('detects go from go.mod', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'go.mod'), 'module example.com/x\n');

    const detected = await detectPacksDetailed(TEST_ROOT);
    expect(detected.map((d) => d.name)).toContain('go');
  });

  it('detects rust from Cargo.toml', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'Cargo.toml'), '[package]\nname = "x"\n');

    const detected = await detectPacksDetailed(TEST_ROOT);
    expect(detected.map((d) => d.name)).toContain('rust');
  });

  it('detects ruby from Gemfile', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'Gemfile'), "source 'https://rubygems.org'\n");

    const detected = await detectPacksDetailed(TEST_ROOT);
    expect(detected.map((d) => d.name)).toContain('ruby');
  });

  it('detects csharp from .csproj file', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'MyApp.csproj'), '<Project></Project>');

    const detected = await detectPacksDetailed(TEST_ROOT);
    expect(detected.map((d) => d.name)).toContain('csharp');
  });
});

describe('detectPacksDetailed — frameworks', () => {
  it('detects fastapi from requirements.txt', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'requirements.txt'), 'fastapi==0.110\n');

    const detected = await detectPacksDetailed(TEST_ROOT);
    expect(detected.map((d) => d.name)).toContain('fastapi');
  });

  it('detects django from manage.py', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'manage.py'), '#!/usr/bin/env python\n');
    writeText(path.join(TEST_ROOT, 'requirements.txt'), 'django==5.0\n');

    const detected = await detectPacksDetailed(TEST_ROOT);
    expect(detected.map((d) => d.name)).toContain('django');
  });

  it('detects spring-boot from pom.xml content', async () => {
    ensureDir(TEST_ROOT);
    writeText(
      path.join(TEST_ROOT, 'pom.xml'),
      '<project><parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId></parent></project>'
    );

    const detected = await detectPacksDetailed(TEST_ROOT);
    expect(detected.map((d) => d.name)).toContain('spring-boot');
  });

  it('detects vue from dependencies', async () => {
    ensureDir(TEST_ROOT);
    writeJson(path.join(TEST_ROOT, 'package.json'), {
      dependencies: { vue: '^3.0.0' },
    });

    const detected = await detectPacksDetailed(TEST_ROOT);
    expect(detected.map((d) => d.name)).toContain('vue');
  });

  it('detects angular from angular.json', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'angular.json'), '{}');
    writeJson(path.join(TEST_ROOT, 'package.json'), {});

    const detected = await detectPacksDetailed(TEST_ROOT);
    expect(detected.map((d) => d.name)).toContain('angular');
  });

  it('lowers react confidence when next is also present', async () => {
    ensureDir(TEST_ROOT);
    writeJson(path.join(TEST_ROOT, 'package.json'), {
      dependencies: { next: '^14', react: '^18' },
    });

    const detected = await detectPacksDetailed(TEST_ROOT);
    const react = detected.find((d) => d.name === 'react');
    // react below 0.5 minConfidence should be filtered out by default
    expect(react).toBeUndefined();

    const all = await detectPacksDetailed(TEST_ROOT, { minConfidence: 0 });
    const reactLow = all.find((d) => d.name === 'react');
    expect(reactLow).toBeDefined();
    expect(reactLow!.confidence).toBeLessThan(0.5);
  });
});

describe('detectPacksDetailed — clouds', () => {
  it('detects aws from cdk.json', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'cdk.json'), '{}');

    const detected = await detectPacksDetailed(TEST_ROOT);
    expect(detected.map((d) => d.name)).toContain('aws');
  });

  it('detects gcp from firebase.json', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'firebase.json'), '{}');

    const detected = await detectPacksDetailed(TEST_ROOT);
    expect(detected.map((d) => d.name)).toContain('gcp');
  });

  it('detects kubernetes from Chart.yaml', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'Chart.yaml'), 'name: my-chart\n');

    const detected = await detectPacksDetailed(TEST_ROOT);
    expect(detected.map((d) => d.name)).toContain('kubernetes');
  });
});

describe('detectPacksDetailed — metadata', () => {
  it('marks shipped packs as available and others as planned', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'tsconfig.json'), '{}');
    writeText(path.join(TEST_ROOT, 'go.mod'), 'module x\n');
    writeJson(path.join(TEST_ROOT, 'package.json'), {});

    const detected = await detectPacksDetailed(TEST_ROOT);
    const ts = detected.find((d) => d.name === 'typescript');
    const go = detected.find((d) => d.name === 'go');

    expect(ts!.available).toBe(true); // shipped
    expect(go!.available).toBe(false); // planned
  });

  it('sorts shipped packs first, then by confidence', async () => {
    ensureDir(TEST_ROOT);
    writeText(path.join(TEST_ROOT, 'go.mod'), 'module x\n'); // planned, conf 1.0
    writeText(path.join(TEST_ROOT, 'tsconfig.json'), '{}'); // shipped, conf 1.0
    writeJson(path.join(TEST_ROOT, 'package.json'), {});

    const detected = await detectPacksDetailed(TEST_ROOT);
    const tsIndex = detected.findIndex((d) => d.name === 'typescript');
    const goIndex = detected.findIndex((d) => d.name === 'go');
    expect(tsIndex).toBeLessThan(goIndex);
  });

  it('respects minConfidence option', async () => {
    ensureDir(TEST_ROOT);
    writeJson(path.join(TEST_ROOT, 'package.json'), {});
    // javascript has confidence 0.6 — should be excluded at minConfidence 0.8
    const high = await detectPacksDetailed(TEST_ROOT, { minConfidence: 0.8 });
    expect(high.map((d) => d.name)).not.toContain('javascript');

    const low = await detectPacksDetailed(TEST_ROOT, { minConfidence: 0.5 });
    expect(low.map((d) => d.name)).toContain('javascript');
  });

  it('includes reasons for every detection', async () => {
    ensureDir(TEST_ROOT);
    writeJson(path.join(TEST_ROOT, 'package.json'), {
      dependencies: { openai: '^4.0.0' },
    });

    const detected = await detectPacksDetailed(TEST_ROOT);
    for (const d of detected) {
      expect(d.reasons.length).toBeGreaterThan(0);
    }
  });
});
