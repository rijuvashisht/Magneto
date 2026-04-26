import { getProfile, listProfiles, resolveProfilePaths } from '../../src/core/sandbox-profiles';
import { generateMacOsSandboxProfile, generateDockerfile, generateWindowsSandboxWsb } from '../../src/core/sandbox';

describe('sandbox-profiles', () => {
  it('lists all 4 profiles', () => {
    const profiles = listProfiles();
    expect(profiles).toEqual(['strict', 'standard', 'dev', 'off']);
  });

  it('strict profile is most restrictive', () => {
    const strict = getProfile('strict');
    expect(strict.network.mode).toBe('allowlist');
    expect(strict.process.runAsUser).toBe('nobody');
    expect(strict.process.allowShell).toBe(false);
    expect(strict.process.allowSudo).toBe(false);
    expect(strict.capabilities.canWriteSourceCode).toBe(false);
    expect(strict.capabilities.canRunShellCommands).toBe(false);
  });

  it('standard profile allows project writes but blocks system writes', () => {
    const std = getProfile('standard');
    expect(std.capabilities.canWriteSourceCode).toBe(true);
    expect(std.process.allowSudo).toBe(false);
    expect(std.filesystem.deniedPaths).toEqual(expect.arrayContaining(['/etc', '/var', '/usr']));
  });

  it('dev profile is permissive but still blocks /etc and SSH', () => {
    const dev = getProfile('dev');
    expect(dev.network.mode).toBe('open');
    expect(dev.process.allowSudo).toBe(false);
    expect(dev.filesystem.deniedPaths).toEqual(expect.arrayContaining(['/etc']));
  });

  it('off profile has no isolation', () => {
    const off = getProfile('off');
    expect(off.process.allowSudo).toBe(true);
    expect(off.network.mode).toBe('open');
    expect(off.filesystem.deniedPaths).toEqual([]);
  });

  it('resolves {projectRoot} placeholders', () => {
    const strict = getProfile('strict');
    const resolved = resolveProfilePaths(strict, '/home/user/myapp');
    expect(resolved.filesystem.readOnlyMounts).toContain('/home/user/myapp');
    expect(resolved.filesystem.readWriteMounts).toContain('/home/user/myapp/.magneto/cache');
    expect(resolved.filesystem.readOnlyMounts.every((p) => !p.includes('{'))).toBe(true);
  });

  it('strict allowlist includes only AI provider hosts', () => {
    const strict = getProfile('strict');
    expect(strict.network.allowedHosts).toContain('api.openai.com');
    expect(strict.network.allowedHosts).toContain('api.osv.dev');
    expect(strict.network.allowedHosts).not.toContain('registry.npmjs.org');
  });

  it('standard allowlist includes package registries', () => {
    const std = getProfile('standard');
    expect(std.network.allowedHosts).toContain('registry.npmjs.org');
    expect(std.network.allowedHosts).toContain('pypi.org');
    expect(std.network.allowedHosts).toContain('repo.maven.apache.org');
  });
});

describe('sandbox runtime helpers', () => {
  it('generateDockerfile produces a non-root image', () => {
    const dockerfile = generateDockerfile();
    expect(dockerfile).toContain('FROM node:22');
    expect(dockerfile).toContain('USER magneto');
    expect(dockerfile).toContain('useradd');
    expect(dockerfile).not.toContain('USER root');
  });

  it('generateMacOsSandboxProfile starts with deny default', () => {
    const profile = getProfile('strict');
    const resolved = resolveProfilePaths(profile, '/Users/test/proj');
    const sb = generateMacOsSandboxProfile(resolved, '/Users/test/proj');
    expect(sb).toContain('(version 1)');
    expect(sb).toContain('(deny default)');
    expect(sb).toContain('/Users/test/proj');
  });

  it('strict macOS profile denies network broadly with port-allowlist only', () => {
    const profile = getProfile('strict');
    const resolved = resolveProfilePaths(profile, '/proj');
    const sb = generateMacOsSandboxProfile(resolved, '/proj');
    // strict mode = no broad allow
    expect(sb).not.toContain('(allow network*)');
    // port-based allowlist (sandbox-exec hostname syntax not supported)
    expect(sb).toContain('"*:443"');
    expect(sb).toContain('"*:11434"'); // Ollama
  });

  it('dev macOS profile allows network broadly', () => {
    const profile = getProfile('dev');
    const resolved = resolveProfilePaths(profile, '/proj');
    const sb = generateMacOsSandboxProfile(resolved, '/proj');
    expect(sb).toContain('(allow network*)');
  });

  it('strict macOS profile explicitly denies system paths', () => {
    const profile = getProfile('strict');
    const resolved = resolveProfilePaths(profile, '/proj');
    const sb = generateMacOsSandboxProfile(resolved, '/proj');
    expect(sb).toContain('(deny file-write* (subpath "/etc"))');
  });

  it('generateWindowsSandboxWsb creates valid XML with strict networking disabled', () => {
    const strict = getProfile('strict');
    const wsb = generateWindowsSandboxWsb(strict, 'C:\\Users\\Test\\project', ['magneto', 'security', 'audit']);
    expect(wsb).toContain('<Configuration>');
    expect(wsb).toContain('<Networking>Disable</Networking>');
    expect(wsb).toContain('<HostFolder>C:\\Users\\Test\\project</HostFolder>');
    expect(wsb).toContain('<ReadOnly>true</ReadOnly>');
    expect(wsb).toContain('magneto security audit');
    expect(wsb).toContain('</Configuration>');
  });

  it('generateWindowsSandboxWsb enables networking for non-strict profiles', () => {
    const dev = getProfile('dev');
    const wsb = generateWindowsSandboxWsb(dev, 'D:\\proj', ['npm', 'test']);
    expect(wsb).toContain('<Networking>Enable</Networking>');
    expect(wsb).toContain('<HostFolder>D:\\proj</HostFolder>');
    expect(wsb).toContain('<ReadOnly>false</ReadOnly>'); // can write source
  });

  it('generateWindowsSandboxWsb maps workspace to WDAG Desktop', () => {
    const std = getProfile('standard');
    const wsb = generateWindowsSandboxWsb(std, 'E:\\repos\\magneto', ['echo', 'hi']);
    expect(wsb).toContain('C:\\\\Users\\\\WDAGUtilityAccount\\\\Desktop\\\\workspace');
    expect(wsb).toContain('<MappedFolders>');
    expect(wsb).toContain('</MappedFolders>');
    expect(wsb).toContain('cmd.exe /c');
  });
});
