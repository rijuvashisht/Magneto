import { resolveProjectRoot } from '../utils/paths';
import { logger } from '../utils/logger';
import {
  lockMemory,
  unlockMemory,
  verifyMemory,
  isMemoryLocked,
  isRuntimeActive,
  readManifest,
  lockFilePath,
} from '../core/memory-lock';
import * as fs from 'fs';

export async function memoryLockCommand(options: {
  requireRoot?: boolean;
  noOwner?: boolean;
} = {}): Promise<void> {
  const root = resolveProjectRoot();

  if (isMemoryLocked(root)) {
    logger.info('[zero-trust] Memory is already locked. Use `magneto memory verify` to check integrity.');
    return;
  }

  try {
    const manifest = lockMemory(root, {
      requireRootToUnlock: options.requireRoot ?? false,
      requireOwnerToUnlock: !options.noOwner,
      rejectOnHashMismatch: true,
    });
    logger.info(`[zero-trust]   Files sealed:   ${manifest.files.length}`);
    logger.info(`[zero-trust]   Locked by:      ${manifest.lockedBy.user}@${manifest.lockedBy.hostname} (uid ${manifest.lockedBy.uid})`);
    logger.info(`[zero-trust]   Unlock policy:  ${manifest.policy.requireRootToUnlock ? 'root only' : manifest.policy.requireOwnerToUnlock ? 'owner only' : 'open'}`);
    logger.info('[zero-trust]   Runtime writes: DENIED (always)');
  } catch (err) {
    logger.error(`[zero-trust] Lock failed: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

export async function memoryUnlockCommand(options: { force?: boolean } = {}): Promise<void> {
  const root = resolveProjectRoot();
  try {
    unlockMemory(root, { force: options.force ?? false });
  } catch (err) {
    logger.error(`[zero-trust] Unlock failed: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

export async function memoryVerifyCommand(): Promise<void> {
  const root = resolveProjectRoot();

  if (!fs.existsSync(lockFilePath(root))) {
    logger.error('[zero-trust] No memory.lock found. Run `magneto memory lock` first.');
    process.exitCode = 1;
    return;
  }

  try {
    const result = verifyMemory(root);

    console.log('');
    console.log('[zero-trust] Memory Integrity Verification');
    console.log('');
    console.log(`  Signature:        ${result.signatureValid ? '✓ VALID' : '✗ INVALID — manifest tampered'}`);
    console.log(`  File hashes:      ${result.fileHashesValid ? '✓ ALL MATCH' : '✗ MISMATCH'}`);
    console.log(`  Total files:      ${result.totalFiles}`);
    console.log(`  Tampered:         ${result.tamperedFiles.length}`);
    console.log(`  Missing:          ${result.missingFiles.length}`);
    console.log(`  Unrecorded:       ${result.unrecordedFiles.length}  (potential injection)`);

    if (result.tamperedFiles.length > 0) {
      console.log('');
      console.log('  Tampered files:');
      for (const f of result.tamperedFiles) console.log(`    ✗ ${f}`);
    }
    if (result.missingFiles.length > 0) {
      console.log('');
      console.log('  Missing files:');
      for (const f of result.missingFiles) console.log(`    ✗ ${f}`);
    }
    if (result.unrecordedFiles.length > 0) {
      console.log('');
      console.log('  Unrecorded files (NOT in manifest — injected after lock):');
      for (const f of result.unrecordedFiles) console.log(`    ⚠  ${f}`);
    }

    console.log('');
    const ok = result.signatureValid && result.fileHashesValid && result.unrecordedFiles.length === 0;
    if (ok) {
      console.log('  ✅ Memory is intact — no tampering detected');
    } else {
      console.log('  ❌ Memory integrity compromised — DO NOT USE without investigation');
      process.exitCode = 1;
    }
  } catch (err) {
    logger.error(`[zero-trust] Verify failed: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

export async function memoryStatusCommand(): Promise<void> {
  const root = resolveProjectRoot();
  const locked = isMemoryLocked(root);
  const runtime = isRuntimeActive(root);

  console.log('');
  console.log('[zero-trust] Memory Status');
  console.log('');
  console.log(`  Lock state:       ${locked ? '🔒 LOCKED' : '🔓 unlocked'}`);
  console.log(`  Runtime active:   ${runtime ? 'YES — writes blocked' : 'no'}`);
  console.log(`  Writes allowed:   ${!locked && !runtime ? 'yes' : 'NO'}`);

  if (locked) {
    try {
      const manifest = readManifest(root);
      console.log('');
      console.log(`  Locked at:        ${manifest.lockedAt}`);
      console.log(`  Locked by:        ${manifest.lockedBy.user}@${manifest.lockedBy.hostname} (uid ${manifest.lockedBy.uid})`);
      console.log(`  Files sealed:     ${manifest.files.length}`);
      console.log(`  Policy:`);
      console.log(`    runtime writes:        ${manifest.policy.allowRuntimeWrites ? 'allowed' : 'DENIED (zero-trust)'}`);
      console.log(`    owner required:        ${manifest.policy.requireOwnerToUnlock ? 'yes' : 'no'}`);
      console.log(`    root required:         ${manifest.policy.requireRootToUnlock ? 'yes' : 'no'}`);
      console.log(`    reject on hash mismatch: ${manifest.policy.rejectOnHashMismatch ? 'yes' : 'no'}`);
    } catch (err) {
      console.log(`  ⚠  Could not read manifest: ${(err as Error).message}`);
    }
  }
  console.log('');
}
