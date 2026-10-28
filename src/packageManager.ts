import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { PackageManager, PackageManagerOption } from './types';

export const PACKAGE_MANAGERS: Record<PackageManager, PackageManagerOption> = {
  pnpm: {
    id: 'pnpm',
    label: '$(package) pnpm',
    description: 'Fast, disk space efficient package manager',
    detail: 'pnpm create tauri-app / pnpm tauri <command>',
    createCommand: (name: string) => name ? `pnpm create tauri-app ${name}` : 'pnpm create tauri-app',
    runPrefix: (subcommand: string, args: string[] = []) => {
      const allArgs = [subcommand, ...args].filter(Boolean).join(' ');
      return `pnpm tauri ${allArgs}`;
    }
  },
  npm: {
    id: 'npm',
    label: '$(package) npm',
    description: 'Default Node.js package manager',
    detail: 'npm create tauri-app@latest / npm run tauri <command>',
    createCommand: (name: string) => name ? `npm create tauri-app@latest ${name}` : 'npm create tauri-app@latest',
    runPrefix: (subcommand: string, args: string[] = []) => {
      const allArgs = [subcommand, ...args].filter(Boolean).join(' ');
      return `npm run tauri -- ${allArgs}`;
    }
  },
  yarn: {
    id: 'yarn',
    label: '$(package) yarn',
    description: 'Yarn package manager',
    detail: 'yarn create tauri-app / yarn tauri <command>',
    createCommand: (name: string) => name ? `yarn create tauri-app ${name}` : 'yarn create tauri-app',
    runPrefix: (subcommand: string, args: string[] = []) => {
      const allArgs = [subcommand, ...args].filter(Boolean).join(' ');
      return `yarn tauri ${allArgs}`;
    }
  },
  bun: {
    id: 'bun',
    label: '$(package) bun',
    description: 'All-in-one JavaScript runtime & toolkit',
    detail: 'bun create tauri-app / bun tauri <command>',
    createCommand: (name: string) => name ? `bun create tauri-app ${name}` : 'bun create tauri-app',
    runPrefix: (subcommand: string, args: string[] = []) => {
      const allArgs = [subcommand, ...args].filter(Boolean).join(' ');
      return `bun tauri ${allArgs}`;
    }
  },
  cargo: {
    id: 'cargo',
    label: '$(tools) cargo',
    description: 'Rust package manager & build tool',
    detail: 'cargo create-tauri-app / cargo tauri <command>',
    createCommand: (name: string) => name ? `cargo create-tauri-app ${name}` : 'cargo create-tauri-app',
    runPrefix: (subcommand: string, args: string[] = []) => {
      const allArgs = [subcommand, ...args].filter(Boolean).join(' ');
      return `cargo tauri ${allArgs}`;
    }
  }
};

/**
 * Detect the package manager based on lockfiles in the workspace root.
 */
export function detectPackageManager(workspacePath?: string): PackageManager | null {
  if (!workspacePath) {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return null;
    }
    workspacePath = folders[0].uri.fsPath;
  }

  try {
    if (fs.existsSync(path.join(workspacePath, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (fs.existsSync(path.join(workspacePath, 'yarn.lock'))) {
      return 'yarn';
    }
    if (fs.existsSync(path.join(workspacePath, 'bun.lockb')) || fs.existsSync(path.join(workspacePath, 'bun.lock'))) {
      return 'bun';
    }
    if (fs.existsSync(path.join(workspacePath, 'package-lock.json'))) {
      return 'npm';
    }
    if (fs.existsSync(path.join(workspacePath, 'Cargo.toml')) && !fs.existsSync(path.join(workspacePath, 'package.json'))) {
      return 'cargo';
    }
    if (fs.existsSync(path.join(workspacePath, 'package.json'))) {
      return 'npm';
    }
  } catch {
    // ignore filesystem errors
  }

  return null;
}

/**
 * Get current configured or detected package manager.
 */
export async function getActivePackageManager(): Promise<PackageManager> {
  const config = vscode.workspace.getConfiguration('tauri');
  const configured = config.get<string>('packageManager', 'auto');

  if (configured && configured !== 'auto' && configured in PACKAGE_MANAGERS) {
    return configured as PackageManager;
  }

  const detected = detectPackageManager();
  if (detected) {
    return detected;
  }

  // If not detected, prompt the user
  const selected = await promptPackageManagerSelection('Select a Package Manager for Tauri');
  if (selected) {
    await config.update('packageManager', selected, vscode.ConfigurationTarget.Workspace);
    return selected;
  }

  return 'npm'; // fallback
}

/**
 * Show QuickPick for user to select a package manager.
 */
export async function promptPackageManagerSelection(title = 'Select Package Manager'): Promise<PackageManager | undefined> {
  const items = Object.values(PACKAGE_MANAGERS).map(pm => ({
    label: pm.label,
    description: pm.description,
    detail: pm.detail,
    id: pm.id
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: title,
    title
  });

  return picked?.id;
}

/**
 * Formats a Tauri command according to the active package manager.
 */
export function buildTauriCliCommand(pm: PackageManager, subcommand: string, args: string[] = []): string {
  const manager = PACKAGE_MANAGERS[pm] || PACKAGE_MANAGERS.npm;
  return manager.runPrefix(subcommand, args);
}

