import * as fs from 'fs';
import * as path from 'path';
import {
  buildSandboxImage,
  detectSandboxRuntimes,
  generateDockerfile,
  generateMacOsSandboxProfile,
  getSandboxStatus,
  preferredRuntime,
  runInSandbox,
} from '../core/sandbox';
import { getProfile, listProfiles, resolveProfilePaths, SandboxProfile } from '../core/sandbox-profiles';
import { logger } from '../utils/logger';

export async function sandboxStatusCommand(): Promise<void> {
  const status = getSandboxStatus();

  console.log('');
  console.log('[sandbox] Magneto Sandbox Status');
  console.log('');
  console.log(`  Platform:      ${status.platform}`);
  console.log(`  Available:     ${status.available.join(', ')}`);
  console.log(`  Preferred:     ${status.preferred}`);
  console.log(`  Image built:   ${status.imageBuilt ? 'yes' : 'no'} (${status.imageName})`);
  console.log('');
  console.log('  Profiles:');
  for (const name of listProfiles()) {
    const p = getProfile(name);
    console.log(`    ${name.padEnd(10)} — ${p.description}`);
  }
  console.log('');

  if (status.preferred === 'none') {
    console.log('  ⚠  No isolation runtime detected.');
    console.log('     Install Docker, Podman, or (Linux) bubblewrap for sandboxed execution.');
  } else if (!status.imageBuilt && (status.preferred === 'docker' || status.preferred === 'podman')) {
    console.log(`  ℹ  Run 'magneto sandbox build' to build the ${status.imageName} image.`);
  } else {
    console.log('  ✅ Sandbox is ready. Use --sandbox <profile> on magneto run.');
  }
}

export async function sandboxBuildCommand(): Promise<void> {
  const runtime = preferredRuntime();
  if (runtime !== 'docker' && runtime !== 'podman') {
    logger.info(`[sandbox] Cannot build image — no container runtime found (have: ${runtime})`);
    logger.info('[sandbox] Install Docker (https://docs.docker.com/get-docker/) or Podman.');
    process.exitCode = 1;
    return;
  }
  const ok = await buildSandboxImage(runtime);
  if (!ok) process.exitCode = 1;
}

export async function sandboxInitCommand(): Promise<void> {
  const projectRoot = process.cwd();
  const sandboxDir = path.join(projectRoot, '.magneto', 'sandbox');
  fs.mkdirSync(sandboxDir, { recursive: true });

  // Write Dockerfile template for transparency / customisation
  const dockerfilePath = path.join(sandboxDir, 'Dockerfile');
  fs.writeFileSync(dockerfilePath, generateDockerfile(), 'utf-8');

  // Write profile JSON files for each profile
  for (const name of listProfiles()) {
    const profile = resolveProfilePaths(getProfile(name), projectRoot);
    fs.writeFileSync(
      path.join(sandboxDir, `${name}.profile.json`),
      JSON.stringify(profile, null, 2),
      'utf-8'
    );
  }

  // Generate macOS sandbox-exec profile if on darwin
  if (process.platform === 'darwin') {
    for (const name of listProfiles()) {
      if (name === 'off') continue;
      const profile = resolveProfilePaths(getProfile(name), projectRoot);
      fs.writeFileSync(
        path.join(sandboxDir, `${name}.macos.sb`),
        generateMacOsSandboxProfile(profile, projectRoot),
        'utf-8'
      );
    }
  }

  logger.info(`[sandbox] ✓ Initialized .magneto/sandbox/`);
  logger.info(`[sandbox]   Dockerfile        — customizable container image definition`);
  logger.info(`[sandbox]   *.profile.json    — resolved constraint manifests for each profile`);
  if (process.platform === 'darwin') {
    logger.info(`[sandbox]   *.macos.sb        — sandbox-exec policy files`);
  }
  logger.info(`[sandbox]`);
  logger.info(`[sandbox] Next: 'magneto sandbox build' to build the container image.`);
}

export async function sandboxRunCommand(
  command: string[],
  options: { profile?: string } = {}
): Promise<void> {
  const profile = (options.profile ?? 'standard') as SandboxProfile;
  if (!listProfiles().includes(profile)) {
    logger.info(`[sandbox] Unknown profile: ${profile}. Available: ${listProfiles().join(', ')}`);
    process.exitCode = 1;
    return;
  }

  if (command.length === 0) {
    logger.info('[sandbox] No command specified. Usage: magneto sandbox run [--profile <p>] -- <command>');
    process.exitCode = 1;
    return;
  }

  const result = await runInSandbox({
    profile,
    command,
    projectRoot: process.cwd(),
  });

  logger.info(`[sandbox] ✓ Completed in ${result.durationMs}ms (runtime=${result.runtime}, profile=${result.profile}, exit=${result.exitCode})`);
  if (result.exitCode !== 0) process.exitCode = result.exitCode;
}

export async function sandboxShellCommand(options: { profile?: string } = {}): Promise<void> {
  const profile = (options.profile ?? 'dev') as SandboxProfile;
  await sandboxRunCommand(['/bin/bash'], { profile });
}

export async function sandboxDoctorCommand(): Promise<void> {
  const status = getSandboxStatus();
  const runtimes = detectSandboxRuntimes();

  console.log('');
  console.log('[sandbox] Doctor — runtime checks');
  console.log('');

  const checks: Array<{ name: string; ok: boolean; detail: string }> = [
    {
      name: 'Container runtime available',
      ok: runtimes.includes('docker') || runtimes.includes('podman'),
      detail: runtimes.includes('docker') ? 'docker available'
            : runtimes.includes('podman') ? 'podman available'
            : 'install docker or podman for container isolation',
    },
    {
      name: 'Native sandbox available',
      ok: runtimes.includes('sandbox-exec') || runtimes.includes('bwrap'),
      detail: runtimes.includes('sandbox-exec') ? 'macOS sandbox-exec ready'
            : runtimes.includes('bwrap') ? 'Linux bubblewrap ready'
            : 'no native sandbox available on this platform',
    },
    {
      name: 'Magneto sandbox image built',
      ok: status.imageBuilt,
      detail: status.imageBuilt ? status.imageName : "run 'magneto sandbox build'",
    },
    {
      name: 'At least one isolation method works',
      ok: status.preferred !== 'none',
      detail: status.preferred,
    },
  ];

  for (const c of checks) {
    const icon = c.ok ? '✓' : '✗';
    console.log(`  ${icon} ${c.name.padEnd(38)} ${c.detail}`);
  }

  console.log('');
  const failed = checks.filter((c) => !c.ok).length;
  if (failed === 0) {
    console.log('  ✅ All checks passed — sandbox is ready');
  } else {
    console.log(`  ⚠  ${failed} check(s) failed — see above`);
    process.exitCode = 1;
  }
}
