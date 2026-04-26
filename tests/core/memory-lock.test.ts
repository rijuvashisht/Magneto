import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  lockMemory,
  unlockMemory,
  verifyMemory,
  isMemoryLocked,
  isRuntimeActive,
  markRuntimeActive,
  clearRuntimeActive,
  assertMemoryWritable,
  hashContent,
  lockFilePath,
  sigFilePath,
  memoryDir,
} from '../../src/core/memory-lock';

function makeTmpProject(memoryFiles: Record<string, string> = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'magneto-mlock-'));
  const memDir = path.join(root, '.magneto', 'memory');
  fs.mkdirSync(memDir, { recursive: true });
  for (const [name, content] of Object.entries(memoryFiles)) {
    const full = path.join(memDir, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf-8');
  }
  return root;
}

describe('memory-lock zero-trust system', () => {
  it('locks memory and creates manifest + signature', () => {
    const root = makeTmpProject({
      'graph.json': '{"nodes":[]}',
      'sessions/task-1.json': '{"task":"analyze"}',
    });

    const manifest = lockMemory(root);

    expect(manifest.mode).toBe('locked');
    expect(manifest.files).toHaveLength(2);
    expect(manifest.files[0].sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(fs.existsSync(lockFilePath(root))).toBe(true);
    expect(fs.existsSync(sigFilePath(root))).toBe(true);
    expect(isMemoryLocked(root)).toBe(true);

    fs.rmSync(root, { recursive: true });
  });

  it('detects tampering when a memory file is modified after lock', () => {
    const root = makeTmpProject({ 'g.json': '{"a":1}' });
    lockMemory(root);

    // chmod back to writable to simulate attacker bypassing perms
    const file = path.join(memoryDir(root), 'g.json');
    fs.chmodSync(file, 0o600);
    fs.writeFileSync(file, '{"a":2}', 'utf-8');

    const result = verifyMemory(root);
    expect(result.fileHashesValid).toBe(false);
    expect(result.tamperedFiles).toContain('g.json');

    fs.rmSync(root, { recursive: true });
  });

  it('detects unrecorded files added after lock (injection attempt)', () => {
    const root = makeTmpProject({ 'g.json': '{}' });
    lockMemory(root);

    // Inject a new file into memory dir
    fs.writeFileSync(path.join(memoryDir(root), 'malicious.json'), '{"injected":true}');

    const result = verifyMemory(root);
    expect(result.unrecordedFiles).toContain('malicious.json');

    fs.rmSync(root, { recursive: true });
  });

  it('detects HMAC signature tampering on the manifest itself', () => {
    const root = makeTmpProject({ 'g.json': '{}' });
    lockMemory(root);

    // Tamper with manifest content (not the files)
    fs.chmodSync(lockFilePath(root), 0o600);
    const manifest = JSON.parse(fs.readFileSync(lockFilePath(root), 'utf-8'));
    manifest.lockedBy.uid = 0; // pretend we're root
    fs.writeFileSync(lockFilePath(root), JSON.stringify(manifest, null, 2));

    const result = verifyMemory(root);
    expect(result.signatureValid).toBe(false);

    fs.rmSync(root, { recursive: true });
  });

  it('refuses to unlock when files have been tampered', () => {
    const root = makeTmpProject({ 'g.json': '{"v":1}' });
    lockMemory(root);

    const file = path.join(memoryDir(root), 'g.json');
    fs.chmodSync(file, 0o600);
    fs.writeFileSync(file, '{"v":2}', 'utf-8');

    expect(() => unlockMemory(root)).toThrow(/tampering detected/i);

    fs.rmSync(root, { recursive: true });
  });

  it('successfully unlocks an intact memory', () => {
    const root = makeTmpProject({ 'g.json': '{"v":1}' });
    lockMemory(root);

    expect(isMemoryLocked(root)).toBe(true);
    const result = unlockMemory(root);
    expect(result.mode).toBe('unlocked');
    expect(isMemoryLocked(root)).toBe(false);

    fs.rmSync(root, { recursive: true });
  });

  it('refuses to lock while a task is running', () => {
    const root = makeTmpProject({ 'g.json': '{}' });
    markRuntimeActive(root, 'task-running');

    expect(() => lockMemory(root)).toThrow(/while a task is running/i);

    clearRuntimeActive(root);
    fs.rmSync(root, { recursive: true });
  });

  it('refuses to unlock while a task is running', () => {
    const root = makeTmpProject({ 'g.json': '{}' });
    lockMemory(root);
    markRuntimeActive(root, 'task-x');

    expect(() => unlockMemory(root)).toThrow(/offline mode/i);

    clearRuntimeActive(root);
    fs.rmSync(root, { recursive: true });
  });

  it('assertMemoryWritable rejects when locked', () => {
    const root = makeTmpProject({ 'g.json': '{}' });
    lockMemory(root);

    expect(() => assertMemoryWritable(root)).toThrow(/locked/i);

    fs.rmSync(root, { recursive: true });
  });

  it('assertMemoryWritable rejects when runtime active even if unlocked', () => {
    const root = makeTmpProject({ 'g.json': '{}' });
    markRuntimeActive(root, 'task-y');

    expect(() => assertMemoryWritable(root)).toThrow(/while a task is running/i);

    clearRuntimeActive(root);
    fs.rmSync(root, { recursive: true });
  });

  it('assertMemoryWritable allows write when unlocked and no runtime', () => {
    const root = makeTmpProject({ 'g.json': '{}' });
    expect(() => assertMemoryWritable(root)).not.toThrow();
    fs.rmSync(root, { recursive: true });
  });

  it('isRuntimeActive returns false for stale lock with dead PID', () => {
    const root = makeTmpProject({ 'g.json': '{}' });
    const stalePath = path.join(root, '.magneto', 'state', 'runtime.lock');
    fs.mkdirSync(path.dirname(stalePath), { recursive: true });
    fs.writeFileSync(stalePath, JSON.stringify({ taskId: 't', pid: 999999, startedAt: '2020-01-01' }));

    expect(isRuntimeActive(root)).toBe(false);
    fs.rmSync(root, { recursive: true });
  });

  it('hashContent produces consistent SHA-256 hex digests', () => {
    expect(hashContent('hello')).toBe(hashContent(Buffer.from('hello')));
    expect(hashContent('hello')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashContent('a')).not.toBe(hashContent('b'));
  });
});
