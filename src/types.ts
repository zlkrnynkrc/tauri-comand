export type PackageManager = 'pnpm' | 'npm' | 'yarn' | 'bun' | 'cargo';

export interface PackageManagerOption {
  id: PackageManager;
  label: string;
  description: string;
  detail: string;
  createCommand: (projectName: string) => string;
  runPrefix: (subcommand: string, args?: string[]) => string;
}

export interface TauriCommandItem {
  id: string;
  label: string;
  description: string;
  detail?: string;
  category: 'Core' | 'Plugins' | 'Mobile' | 'Assets & Security' | 'Advanced';
  command: string;
  action?: () => Promise<void>;
}

