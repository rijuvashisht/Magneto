// Sandbox profiles define the isolation level Magneto applies when running
// agents/runners/openclaw. Each profile is enforced at three layers:
//   1. Filesystem access (allowed read/write paths)
//   2. Network access (allowed outbound hosts)
//   3. Process capabilities (syscalls, shell, sudo)

export type SandboxProfile = 'strict' | 'standard' | 'dev' | 'off';

export interface SandboxConstraints {
  profile: SandboxProfile;
  description: string;

  // Filesystem
  filesystem: {
    readOnlyMounts: string[];       // mounted read-only inside sandbox
    readWriteMounts: string[];      // mounted read-write
    deniedPaths: string[];          // explicit deny list
    tmpfsPaths: string[];           // ephemeral memory-only paths
  };

  // Network
  network: {
    mode: 'none' | 'allowlist' | 'open';
    allowedHosts: string[];         // when mode=allowlist
    allowedPorts: number[];
  };

  // Process / capabilities
  process: {
    runAsUser: 'root' | 'magneto' | 'nobody';
    allowShell: boolean;
    allowSudo: boolean;
    allowChildProcesses: boolean;
    cpuLimit: string;               // e.g. "1.0" cores
    memoryLimit: string;            // e.g. "512m"
    pidLimit: number;
    timeoutSeconds: number;
  };

  // Capabilities the runner is allowed to use
  capabilities: {
    canWriteSourceCode: boolean;
    canRunTests: boolean;
    canInstallPackages: boolean;
    canRunShellCommands: boolean;
    canCallExternalAPIs: boolean;
  };
}

const STRICT: SandboxConstraints = {
  profile: 'strict',
  description: 'Read-only audit mode. No writes anywhere. No outbound network except OpenAI/Ollama API. Used for security audits and observe-only tasks.',
  filesystem: {
    readOnlyMounts: ['{projectRoot}'],
    readWriteMounts: ['{projectRoot}/.magneto/cache', '{projectRoot}/.magneto/reports'],
    deniedPaths: ['/etc', '/var', '/usr', '/root', '/home/*/.ssh', '/home/*/.aws', '/home/*/.config'],
    tmpfsPaths: ['/tmp'],
  },
  network: {
    mode: 'allowlist',
    allowedHosts: ['api.openai.com', 'api.anthropic.com', 'generativelanguage.googleapis.com', 'api.osv.dev', 'localhost', '127.0.0.1'],
    allowedPorts: [443, 11434], // 11434 = Ollama
  },
  process: {
    runAsUser: 'nobody',
    allowShell: false,
    allowSudo: false,
    allowChildProcesses: false,
    cpuLimit: '1.0',
    memoryLimit: '512m',
    pidLimit: 64,
    timeoutSeconds: 300,
  },
  capabilities: {
    canWriteSourceCode: false,
    canRunTests: false,
    canInstallPackages: false,
    canRunShellCommands: false,
    canCallExternalAPIs: true,
  },
};

const STANDARD: SandboxConstraints = {
  profile: 'standard',
  description: 'Sandboxed write mode. Can edit project files. No system writes. Network allowlisted. Default for execute mode.',
  filesystem: {
    readOnlyMounts: [],
    readWriteMounts: ['{projectRoot}'],
    deniedPaths: ['/etc', '/var', '/usr', '/root', '/home/*/.ssh', '/home/*/.aws', '/home/*/.config', '/System', '/Library'],
    tmpfsPaths: ['/tmp'],
  },
  network: {
    mode: 'allowlist',
    allowedHosts: [
      'api.openai.com', 'api.anthropic.com', 'generativelanguage.googleapis.com',
      'api.osv.dev', 'api.github.com', 'registry.npmjs.org', 'pypi.org',
      'files.pythonhosted.org', 'repo.maven.apache.org',
      'localhost', '127.0.0.1',
    ],
    allowedPorts: [443, 80, 11434],
  },
  process: {
    runAsUser: 'magneto',
    allowShell: true,
    allowSudo: false,
    allowChildProcesses: true,
    cpuLimit: '2.0',
    memoryLimit: '2g',
    pidLimit: 256,
    timeoutSeconds: 1800,
  },
  capabilities: {
    canWriteSourceCode: true,
    canRunTests: true,
    canInstallPackages: true,
    canRunShellCommands: true,
    canCallExternalAPIs: true,
  },
};

const DEV: SandboxConstraints = {
  profile: 'dev',
  description: 'Light isolation for local development. Project + scoped tooling only. No /etc, /var, /root writes.',
  filesystem: {
    readOnlyMounts: [],
    readWriteMounts: ['{projectRoot}'],
    deniedPaths: ['/etc', '/var/root', '/root', '/home/*/.ssh', '/home/*/.aws'],
    tmpfsPaths: [],
  },
  network: {
    mode: 'open',
    allowedHosts: [],
    allowedPorts: [],
  },
  process: {
    runAsUser: 'magneto',
    allowShell: true,
    allowSudo: false,
    allowChildProcesses: true,
    cpuLimit: '4.0',
    memoryLimit: '4g',
    pidLimit: 1024,
    timeoutSeconds: 7200,
  },
  capabilities: {
    canWriteSourceCode: true,
    canRunTests: true,
    canInstallPackages: true,
    canRunShellCommands: true,
    canCallExternalAPIs: true,
  },
};

const OFF: SandboxConstraints = {
  profile: 'off',
  description: 'No sandboxing. Magneto runs with full host access. Not recommended outside trusted CI.',
  filesystem: {
    readOnlyMounts: [],
    readWriteMounts: ['/'],
    deniedPaths: [],
    tmpfsPaths: [],
  },
  network: { mode: 'open', allowedHosts: [], allowedPorts: [] },
  process: {
    runAsUser: 'root',
    allowShell: true,
    allowSudo: true,
    allowChildProcesses: true,
    cpuLimit: '0',
    memoryLimit: '0',
    pidLimit: 0,
    timeoutSeconds: 0,
  },
  capabilities: {
    canWriteSourceCode: true,
    canRunTests: true,
    canInstallPackages: true,
    canRunShellCommands: true,
    canCallExternalAPIs: true,
  },
};

const PROFILES: Record<SandboxProfile, SandboxConstraints> = {
  strict: STRICT,
  standard: STANDARD,
  dev: DEV,
  off: OFF,
};

export function getProfile(name: SandboxProfile): SandboxConstraints {
  return PROFILES[name];
}

export function listProfiles(): SandboxProfile[] {
  return Object.keys(PROFILES) as SandboxProfile[];
}

export function resolveProfilePaths(constraints: SandboxConstraints, projectRoot: string): SandboxConstraints {
  const expand = (paths: string[]) =>
    paths.map((p) => p.replace(/\{projectRoot\}/g, projectRoot));

  return {
    ...constraints,
    filesystem: {
      ...constraints.filesystem,
      readOnlyMounts: expand(constraints.filesystem.readOnlyMounts),
      readWriteMounts: expand(constraints.filesystem.readWriteMounts),
      deniedPaths: expand(constraints.filesystem.deniedPaths),
      tmpfsPaths: expand(constraints.filesystem.tmpfsPaths),
    },
  };
}
