// Registry + factory for SDD adapters.
import { SddAdapter, SddFramework, SddFrameworkInfo } from './types';
import { OpenSpecAdapter } from './openspec-adapter';
import { SpecKitAdapter } from './speckit-adapter';
import { BmadAdapter } from './bmad-adapter';

const ADAPTERS: Record<SddFramework, () => SddAdapter> = {
  openspec: () => new OpenSpecAdapter(),
  speckit: () => new SpecKitAdapter(),
  bmad: () => new BmadAdapter(),
};

export function getAdapter(framework: SddFramework): SddAdapter {
  const factory = ADAPTERS[framework];
  if (!factory) throw new Error(`Unknown SDD framework: ${framework}`);
  return factory();
}

export function listFrameworks(): SddFrameworkInfo[] {
  return (Object.keys(ADAPTERS) as SddFramework[]).map((id) => getAdapter(id).info);
}

export function defaultFramework(): SddFramework {
  // Aligns with the article's TL;DR: when in doubt, OpenSpec.
  return 'openspec';
}
