import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawn, spawnSync } from 'child_process';
import { SandboxProfile, SandboxConstraints, getProfile, resolveProfilePaths } from './sandbox-profiles';
import { logger } from '../utils/logger';

export type SandboxRuntime = 'docker' | 'podman' | 'sandbox-exec' | 'bwrap' | 'none';

export interface SandboxStatus {
  available: SandboxRuntime[];
  preferred: SandboxRuntime;
  platform: NodeJS.Platform;
  imageBuilt: boolean;
  imageName: string;
}

export interface SandboxRunResult {
  exitCode: number;
  durationMs: number;
  runtime: SandboxRuntime;
  profile: SandboxProfile;
}

const IMAGE_NAME = 'magneto-sandbox:0.28.0';

// ─── Detection ───────────────────────────────────────────────────────────────

function which(cmd: string): boolean {
  try {
    const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'pipe' });
    return result.status === 0;
  } catch {
    return false;
  }
}

export function detectSandboxRuntimes(): SandboxRuntime[] {
  const available: SandboxRuntime[] = [];
  if (which('docker')) {
    // also check daemon is running
    const ping = spawnSync('docker', ['info'], { stdio: 'pipe' });
    if (ping.status === 0) available.push('docker');
  }
  if (which('podman')) available.push('podman');
  if (process.platform === 'darwin' && fs.existsSync('/usr/bin/sandbox-exec')) available.push('sandbox-exec');
  if (process.platform === 'linux' && which('bwrap')) available.push('bwrap');
  if (available.length === 0) available.push('none');
  return available;
}

export function preferredRuntime(): SandboxRuntime {
  const available = detectSandboxRuntimes();
  // Containers > native sandbox > none
  if (available.includes('docker')) return 'docker';
  if (available.includes('podman')) return 'podman';
  if (available.includes('sandbox-exec')) return 'sandbox-exec';
  if (available.includes('bwrap')) return 'bwrap';
  return 'none';
}

export function isImageBuilt(image: string = IMAGE_NAME, runtime: SandboxRuntime = preferredRuntime()): boolean {
  if (runtime !== 'docker' && runtime !== 'podman') return false;
  const result = spawnSync(runtime, ['image', 'inspect', image], { stdio: 'pipe' });
  return result.status === 0;
}

export function getSandboxStatus(): SandboxStatus {
  const available = detectSandboxRuntimes();
  const preferred = preferredRuntime();
  return {
    available,
    preferred,
    platform: process.platform,
    imageBuilt: isImageBuilt(IMAGE_NAME, preferred),
    imageName: IMAGE_NAME,
  };
}

// ─── Sandbox image generation ────────────────────────────────────────────────

export function generateDockerfile(): string {
  return `# Magneto Sandbox Image
# Minimal Debian + Node 22 + non-root 'magneto' user
# Used by: magneto sandbox run / magneto run --sandbox

FROM node:22-bookworm-slim

# Install minimum tooling, no curl/wget/sudo
RUN apt-get update && apt-get install -y --no-install-recommends \\
      ca-certificates git python3 \\
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged user
RUN groupadd --system magneto \\
 && useradd --system --gid magneto --shell /usr/sbin/nologin --create-home --home-dir /home/magneto magneto

# Install magneto-ai globally (matches host version at build time)
RUN npm install -g magneto-ai

# Drop privileges
USER magneto
WORKDIR /workspace

# No shell entrypoint by default — caller specifies command
CMD ["magneto", "--help"]
`;
}

export function writeDockerfileTemplate(targetDir: string): string {
  const dockerfile = path.join(targetDir, 'Dockerfile');
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(dockerfile, generateDockerfile(), 'utf-8');
  return dockerfile;
}

export async function buildSandboxImage(runtime: SandboxRuntime = preferredRuntime()): Promise<boolean> {
  if (runtime !== 'docker' && runtime !== 'podman') {
    logger.info(`[sandbox] No container runtime available (have: ${runtime}). Skipping image build.`);
    return false;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'magneto-sandbox-'));
  writeDockerfileTemplate(tmpDir);

  logger.info(`[sandbox] Building ${IMAGE_NAME} via ${runtime}...`);
  const result = spawnSync(runtime, ['build', '-t', IMAGE_NAME, tmpDir], { stdio: 'inherit' });

  fs.rmSync(tmpDir, { recursive: true, force: true });

  if (result.status === 0) {
    logger.info(`[sandbox] ✓ Image built: ${IMAGE_NAME}`);
    return true;
  }
  logger.info(`[sandbox] ✗ Build failed (exit ${result.status})`);
  return false;
}

// ─── macOS sandbox-exec profile generator ──────────────────────────────────

export function generateMacOsSandboxProfile(constraints: SandboxConstraints, projectRoot: string): string {
  const lines: string[] = [];
  lines.push('(version 1)');
  lines.push('(deny default)');
  lines.push('(allow process-fork)');
  lines.push('(allow process-exec)');
  lines.push('(allow signal (target self))');
  lines.push('(allow sysctl-read)');
  lines.push('(allow mach-lookup)');
  lines.push('(allow ipc-posix-shm)');

  // Read-only system paths required for Node to run
  const systemReadable = [
    '/usr/bin', '/usr/lib', '/usr/local', '/bin', '/sbin', '/System/Library',
    '/Library/Frameworks', '/private/etc/ssl', '/private/var/db/timezone',
    '/private/var/folders', // Node's mkdtemp
  ];
  for (const p of systemReadable) {
    lines.push(`(allow file-read* (subpath "${p}"))`);
  }

  // Project read access
  for (const p of constraints.filesystem.readOnlyMounts) {
    lines.push(`(allow file-read* (subpath "${p}"))`);
  }

  // Project write access
  for (const p of constraints.filesystem.readWriteMounts) {
    lines.push(`(allow file-read* (subpath "${p}"))`);
    lines.push(`(allow file-write* (subpath "${p}"))`);
  }

  // Tmpfs / scratch
  for (const p of constraints.filesystem.tmpfsPaths) {
    lines.push(`(allow file-read* (subpath "${p}"))`);
    lines.push(`(allow file-write* (subpath "${p}"))`);
  }

  // Explicit deny (overrides any earlier allow)
  for (const p of constraints.filesystem.deniedPaths) {
    if (p.includes('*')) continue; // sandbox-exec doesn't support glob
    lines.push(`(deny file-write* (subpath "${p}"))`);
  }

  // Network — macOS sandbox-exec only supports port-based filtering, not hostnames.
  // For hostname allowlisting use the Docker container runtime instead.
  if (constraints.network.mode === 'open') {
    lines.push('(allow network*)');
  } else if (constraints.network.mode === 'allowlist') {
    lines.push('(allow network-outbound (remote unix-socket))');
    lines.push('(allow network-bind (local ip))');
    // DNS resolution
    lines.push('(allow network-outbound (remote ip "*:53"))');
    lines.push('(allow network-outbound (remote ip "localhost:*"))');
    // Allow whitelisted ports broadly — hostname filtering not supported here
    const ports = constraints.network.allowedPorts.length > 0 ? constraints.network.allowedPorts : [443, 80];
    for (const port of ports) {
      lines.push(`(allow network-outbound (remote ip "*:${port}"))`);
    }
  }
  // strict 'none' mode = no network rules added at all = all denied

  // Suppress Node's startup probes
  lines.push('(allow file-read-data (path "/dev/random"))');
  lines.push('(allow file-read-data (path "/dev/urandom"))');
  lines.push('(allow file-read-data (path "/dev/null"))');
  lines.push('(allow file-write-data (path "/dev/null"))');

  return lines.join('\n');
}

// ─── Run command inside sandbox ──────────────────────────────────────────────

export interface SandboxRunOptions {
  profile: SandboxProfile;
  command: string[];
  projectRoot: string;
  env?: Record<string, string>;
  runtime?: SandboxRuntime;
}

export async function runInSandbox(options: SandboxRunOptions): Promise<SandboxRunResult> {
  const start = Date.now();
  let runtime = options.runtime ?? preferredRuntime();
  const constraints = resolveProfilePaths(getProfile(options.profile), options.projectRoot);

  // Auto-fall-back: if docker/podman is preferred but the image isn't built,
  // fall back to the native sandbox if available rather than failing
  if ((runtime === 'docker' || runtime === 'podman') && !isImageBuilt(IMAGE_NAME, runtime)) {
    const available = detectSandboxRuntimes();
    if (process.platform === 'darwin' && available.includes('sandbox-exec')) {
      logger.info(`[sandbox] ${IMAGE_NAME} not built — falling back to macOS sandbox-exec`);
      logger.info(`[sandbox] Run 'magneto sandbox build' to enable container isolation.`);
      runtime = 'sandbox-exec';
    } else if (process.platform === 'linux' && available.includes('bwrap')) {
      logger.info(`[sandbox] ${IMAGE_NAME} not built — falling back to bubblewrap`);
      runtime = 'bwrap';
    }
  }

  logger.info(`[sandbox] Profile: ${options.profile} (${constraints.description})`);
  logger.info(`[sandbox] Runtime: ${runtime}`);

  if (options.profile === 'off') {
    return runUnsandboxed(options.command, options.env, start, options.profile);
  }

  switch (runtime) {
    case 'docker':
    case 'podman':
      return runViaContainer(runtime, constraints, options, start);
    case 'sandbox-exec':
      return runViaSandboxExec(constraints, options, start);
    case 'bwrap':
      return runViaBwrap(constraints, options, start);
    case 'none':
      logger.info('[sandbox] ⚠  No isolation runtime available. Running unsandboxed.');
      return runUnsandboxed(options.command, options.env, start, options.profile);
  }
}

function runUnsandboxed(command: string[], env: Record<string, string> | undefined, start: number, profile: SandboxProfile): Promise<SandboxRunResult> {
  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 0,
        durationMs: Date.now() - start,
        runtime: 'none',
        profile,
      });
    });
  });
}

function runViaContainer(
  runtime: 'docker' | 'podman',
  constraints: SandboxConstraints,
  options: SandboxRunOptions,
  start: number
): Promise<SandboxRunResult> {
  return new Promise((resolve) => {
    const args: string[] = ['run', '--rm', '-i'];

    // Resource limits
    if (constraints.process.cpuLimit !== '0') args.push('--cpus', constraints.process.cpuLimit);
    if (constraints.process.memoryLimit !== '0') args.push('--memory', constraints.process.memoryLimit);
    if (constraints.process.pidLimit > 0) args.push('--pids-limit', String(constraints.process.pidLimit));

    // Network
    if (constraints.network.mode === 'none') args.push('--network', 'none');
    else if (constraints.network.mode === 'allowlist') {
      // For allowlist we use a custom bridge in real deployments. For now, document the limitation.
      args.push('--network', 'bridge');
    }

    // Read-only root filesystem with tmpfs mounts
    args.push('--read-only');
    for (const p of constraints.filesystem.tmpfsPaths) args.push('--tmpfs', `${p}:rw,noexec,nosuid,size=64m`);
    args.push('--tmpfs', '/tmp:rw,noexec,nosuid,size=64m');
    args.push('--tmpfs', '/home/magneto:rw,nosuid,size=128m');

    // Mounts
    for (const p of constraints.filesystem.readOnlyMounts) args.push('-v', `${p}:${p}:ro`);
    for (const p of constraints.filesystem.readWriteMounts) args.push('-v', `${p}:${p}:rw`);

    // Working directory
    args.push('-w', options.projectRoot);

    // Drop capabilities, no privilege escalation, secure default
    args.push('--cap-drop', 'ALL');
    args.push('--security-opt', 'no-new-privileges');
    if (!constraints.process.allowSudo) args.push('--user', constraints.process.runAsUser === 'root' ? '0' : '1000');

    // Environment passthrough (only key API keys)
    const envKeys = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'OLLAMA_HOST', 'OLLAMA_MODEL'];
    for (const key of envKeys) {
      if (process.env[key]) args.push('-e', `${key}=${process.env[key]}`);
    }
    for (const [k, v] of Object.entries(options.env ?? {})) {
      args.push('-e', `${k}=${v}`);
    }

    // Image and command
    args.push(IMAGE_NAME);
    args.push(...options.command);

    logger.debug(`[sandbox] ${runtime} ${args.join(' ')}`);

    const child = spawn(runtime, args, { stdio: 'inherit' });
    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 0,
        durationMs: Date.now() - start,
        runtime,
        profile: options.profile,
      });
    });
  });
}

function runViaSandboxExec(
  constraints: SandboxConstraints,
  options: SandboxRunOptions,
  start: number
): Promise<SandboxRunResult> {
  const profileContent = generateMacOsSandboxProfile(constraints, options.projectRoot);
  const profilePath = path.join(os.tmpdir(), `magneto-sandbox-${Date.now()}.sb`);
  fs.writeFileSync(profilePath, profileContent, 'utf-8');

  return new Promise((resolve) => {
    const child = spawn('sandbox-exec', ['-f', profilePath, ...options.command], {
      stdio: 'inherit',
      env: { ...process.env, ...options.env },
      cwd: options.projectRoot,
    });
    child.on('close', (code) => {
      try { fs.unlinkSync(profilePath); } catch { /* ignore */ }
      resolve({
        exitCode: code ?? 0,
        durationMs: Date.now() - start,
        runtime: 'sandbox-exec',
        profile: options.profile,
      });
    });
  });
}

function runViaBwrap(
  constraints: SandboxConstraints,
  options: SandboxRunOptions,
  start: number
): Promise<SandboxRunResult> {
  return new Promise((resolve) => {
    const args: string[] = [
      '--die-with-parent',
      '--unshare-pid',
      '--unshare-ipc',
      '--unshare-uts',
      '--proc', '/proc',
      '--dev', '/dev',
      '--ro-bind', '/usr', '/usr',
      '--ro-bind', '/lib', '/lib',
      '--ro-bind', '/lib64', '/lib64',
      '--ro-bind', '/bin', '/bin',
      '--ro-bind', '/sbin', '/sbin',
      '--ro-bind', '/etc/resolv.conf', '/etc/resolv.conf',
      '--ro-bind', '/etc/ssl', '/etc/ssl',
      '--tmpfs', '/tmp',
      '--tmpfs', '/home',
    ];

    for (const p of constraints.filesystem.readOnlyMounts) args.push('--ro-bind', p, p);
    for (const p of constraints.filesystem.readWriteMounts) args.push('--bind', p, p);

    if (constraints.network.mode === 'none') args.push('--unshare-net');

    args.push('--chdir', options.projectRoot);
    args.push(...options.command);

    const child = spawn('bwrap', args, {
      stdio: 'inherit',
      env: { ...process.env, ...options.env },
    });
    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 0,
        durationMs: Date.now() - start,
        runtime: 'bwrap',
        profile: options.profile,
      });
    });
  });
}
