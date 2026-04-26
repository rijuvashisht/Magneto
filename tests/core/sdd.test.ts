import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getAdapter, listFrameworks, defaultFramework } from '../../src/core/sdd/framework';
import { detectFrameworks, recommendFramework } from '../../src/core/sdd/detector';
import { extractFilePaths } from '../../src/core/sdd/reconciler';

function mkTmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'magneto-sdd-'));
}

describe('SDD framework registry', () => {
  it('lists exactly three frameworks', () => {
    const ids = listFrameworks().map((f) => f.id).sort();
    expect(ids).toEqual(['bmad', 'openspec', 'speckit']);
  });

  it('default framework is OpenSpec (matches article TL;DR)', () => {
    expect(defaultFramework()).toBe('openspec');
  });

  it('every adapter exposes id, displayName, bestFor', () => {
    for (const info of listFrameworks()) {
      expect(info.id).toBeTruthy();
      expect(info.displayName).toBeTruthy();
      expect(['brownfield', 'greenfield', 'regulated']).toContain(info.bestFor);
    }
  });
});

describe('OpenSpec adapter', () => {
  it('init scaffolds openspec/{project.md,AGENTS.md,specs,changes}', async () => {
    const tmp = mkTmp();
    const adapter = getAdapter('openspec');
    const result = await adapter.init({ projectRoot: tmp, framework: 'openspec' });

    expect(adapter.isScaffolded(tmp)).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'openspec', 'project.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'openspec', 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'openspec', 'specs'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'openspec', 'changes'))).toBe(true);
    expect(result.filesCreated.length).toBeGreaterThan(0);

    const constitution = fs.readFileSync(path.join(tmp, 'openspec', 'project.md'), 'utf8');
    // Constitution must explain WHY, not just WHAT (article failure-mode fix).
    expect(constitution).toContain('**Why:**');
    expect(constitution).toContain('Non-goals');
  });

  it('init dry-run does not write any files', async () => {
    const tmp = mkTmp();
    const adapter = getAdapter('openspec');
    await adapter.init({ projectRoot: tmp, framework: 'openspec', dryRun: true });
    expect(adapter.isScaffolded(tmp)).toBe(false);
  });

  it('init skips existing files unless --force', async () => {
    const tmp = mkTmp();
    const adapter = getAdapter('openspec');
    await adapter.init({ projectRoot: tmp, framework: 'openspec' });
    fs.writeFileSync(path.join(tmp, 'openspec', 'project.md'), '# CUSTOM');
    const second = await adapter.init({ projectRoot: tmp, framework: 'openspec' });
    expect(second.filesSkipped.length).toBeGreaterThan(0);
    expect(fs.readFileSync(path.join(tmp, 'openspec', 'project.md'), 'utf8')).toBe('# CUSTOM');

    const forced = await adapter.init({ projectRoot: tmp, framework: 'openspec', force: true });
    expect(forced.filesCreated.length).toBeGreaterThan(0);
    expect(fs.readFileSync(path.join(tmp, 'openspec', 'project.md'), 'utf8')).not.toBe('# CUSTOM');
  });

  it('newChange scaffolds proposal.md, design.md, tasks.md and a specs/ delta dir', async () => {
    const tmp = mkTmp();
    const adapter = getAdapter('openspec');
    await adapter.init({ projectRoot: tmp, framework: 'openspec' });
    const change = await adapter.newChange({
      projectRoot: tmp,
      name: 'Add Dark Mode',
      description: 'Toggle in settings page',
    });
    const dir = path.join(tmp, 'openspec', 'changes', 'add-dark-mode');
    expect(change.changeDir).toBe(dir);
    expect(fs.existsSync(path.join(dir, 'proposal.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'design.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'tasks.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'specs'))).toBe(true);

    const proposal = fs.readFileSync(path.join(dir, 'proposal.md'), 'utf8');
    expect(proposal).toContain('Add Dark Mode');
    expect(proposal).toContain('Toggle in settings page');
    expect(proposal).toContain('Non-goals');
  });

  it('status reports active changes', async () => {
    const tmp = mkTmp();
    const adapter = getAdapter('openspec');
    await adapter.init({ projectRoot: tmp, framework: 'openspec' });
    await adapter.newChange({ projectRoot: tmp, name: 'feature-a', description: 'x' });
    await adapter.newChange({ projectRoot: tmp, name: 'feature-b', description: 'y' });
    const status = await adapter.status(tmp);
    expect(status.framework).toBe('openspec');
    expect(status.scaffolded).toBe(true);
    expect(status.activeChanges.sort()).toEqual(['feature-a', 'feature-b']);
  });
});

describe('Spec Kit adapter', () => {
  it('scaffolds .specify/constitution.md and specs/', async () => {
    const tmp = mkTmp();
    const adapter = getAdapter('speckit');
    await adapter.init({ projectRoot: tmp, framework: 'speckit' });
    expect(fs.existsSync(path.join(tmp, '.specify', 'constitution.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'specs'))).toBe(true);
  });

  it('newChange creates spec.md/plan.md/tasks.md (WHAT-WHY split)', async () => {
    const tmp = mkTmp();
    const adapter = getAdapter('speckit');
    await adapter.init({ projectRoot: tmp, framework: 'speckit' });
    await adapter.newChange({ projectRoot: tmp, name: 'add-search', description: 'global search bar' });
    const dir = path.join(tmp, 'specs', 'add-search');
    expect(fs.existsSync(path.join(dir, 'spec.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'plan.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'tasks.md'))).toBe(true);
    const spec = fs.readFileSync(path.join(dir, 'spec.md'), 'utf8');
    expect(spec).toContain('WHAT and WHY only');
    expect(spec).toContain('Non-goals');
  });
});

describe('BMAD adapter', () => {
  it('scaffolds bmad-core/ with persona files for the full pipeline', async () => {
    const tmp = mkTmp();
    const adapter = getAdapter('bmad');
    await adapter.init({ projectRoot: tmp, framework: 'bmad' });
    expect(fs.existsSync(path.join(tmp, 'bmad-core', 'constitution.md'))).toBe(true);
    for (const persona of ['analyst', 'pm', 'architect', 'scrum-master', 'developer', 'qa']) {
      expect(fs.existsSync(path.join(tmp, 'bmad-core', 'agents', `${persona}.md`))).toBe(true);
    }
    for (const dir of ['discovery', 'prd', 'architecture', 'stories', 'qa']) {
      expect(fs.existsSync(path.join(tmp, 'docs', dir))).toBe(true);
    }
  });

  it('newChange writes PRD + architecture + stories docs (audit trail)', async () => {
    const tmp = mkTmp();
    const adapter = getAdapter('bmad');
    await adapter.init({ projectRoot: tmp, framework: 'bmad' });
    await adapter.newChange({ projectRoot: tmp, name: 'export-report', description: 'CSV export' });
    expect(fs.existsSync(path.join(tmp, 'docs', 'prd', 'export-report.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'docs', 'architecture', 'export-report.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'docs', 'stories', 'export-report.md'))).toBe(true);
  });
});

describe('detector', () => {
  it('detects openspec scaffolding', async () => {
    const tmp = mkTmp();
    expect(detectFrameworks(tmp)).toEqual([]);
    await getAdapter('openspec').init({ projectRoot: tmp, framework: 'openspec' });
    expect(detectFrameworks(tmp)).toEqual(['openspec']);
  });

  it('detects multiple coexisting frameworks', async () => {
    const tmp = mkTmp();
    await getAdapter('openspec').init({ projectRoot: tmp, framework: 'openspec' });
    await getAdapter('speckit').init({ projectRoot: tmp, framework: 'speckit' });
    expect(detectFrameworks(tmp).sort()).toEqual(['openspec', 'speckit']);
  });

  it('recommends OpenSpec for a brownfield project (src/+tests/+deps)', () => {
    const tmp = mkTmp();
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'tests'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, 'package.json'),
      JSON.stringify({
        dependencies: { a: '1', b: '1', c: '1', d: '1', e: '1', f: '1' },
      })
    );
    expect(recommendFramework(tmp)).toBe('openspec');
  });

  it('recommends Spec Kit for an empty repo', () => {
    const tmp = mkTmp();
    expect(recommendFramework(tmp)).toBe('speckit');
  });

  it('respects an existing framework over heuristics', async () => {
    const tmp = mkTmp();
    fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'tests'), { recursive: true });
    await getAdapter('bmad').init({ projectRoot: tmp, framework: 'bmad' });
    expect(recommendFramework(tmp)).toBe('bmad');
  });
});

describe('reconciler', () => {
  it('extractFilePaths only returns file-like tokens with a slash', () => {
    const text = 'See `src/foo/bar.ts` and the user model. Also docs/api.md and not foo.bar.';
    const paths = extractFilePaths(text);
    expect(paths).toContain('src/foo/bar.ts');
    expect(paths).toContain('docs/api.md');
    expect(paths).not.toContain('foo.bar');
  });

  it('detects spec-only references to missing files', async () => {
    const tmp = mkTmp();
    const adapter = getAdapter('openspec');
    await adapter.init({ projectRoot: tmp, framework: 'openspec' });
    fs.writeFileSync(
      path.join(tmp, 'openspec', 'specs', 'auth.md'),
      '# Auth\n\nImplemented in `src/auth/login.ts` and `src/auth/logout.ts`.'
    );
    const report = await adapter.sync(tmp, /* dryRun */ true);
    const summaries = report.drifts.map((d) => d.summary).join('\n');
    expect(summaries).toContain('src/auth/login.ts');
    expect(report.drifts.some((d) => d.kind === 'spec-only')).toBe(true);
  });

  it('detects undocumented src/ subtrees', async () => {
    const tmp = mkTmp();
    const adapter = getAdapter('openspec');
    await adapter.init({ projectRoot: tmp, framework: 'openspec' });
    fs.mkdirSync(path.join(tmp, 'src', 'undocumented-feature'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'src', 'undocumented-feature', 'index.ts'), 'export {};');
    const report = await adapter.sync(tmp, true);
    expect(report.drifts.some((d) => d.kind === 'code-undocumented')).toBe(true);
  });

  it('returns no drift on a freshly scaffolded project', async () => {
    const tmp = mkTmp();
    const adapter = getAdapter('openspec');
    await adapter.init({ projectRoot: tmp, framework: 'openspec' });
    const report = await adapter.sync(tmp, true);
    expect(report.drifts).toEqual([]);
  });

  it('writes drift report to .magneto/sdd-drift.md when not dry-run', async () => {
    const tmp = mkTmp();
    const adapter = getAdapter('openspec');
    await adapter.init({ projectRoot: tmp, framework: 'openspec' });
    fs.writeFileSync(
      path.join(tmp, 'openspec', 'specs', 'auth.md'),
      'Implemented in `src/missing/file.ts`.'
    );
    const report = await adapter.sync(tmp, false);
    expect(report.drifts.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tmp, '.magneto', 'sdd-drift.md'))).toBe(true);
    expect(report.updatedFiles).toContain(path.join(tmp, '.magneto', 'sdd-drift.md'));
  });
});
