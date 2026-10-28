import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TerminalManager } from '../terminalManager';

function getCargoManifestFlag(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return '';
  }
  const root = folders[0].uri.fsPath;
  const srcTauriCargo = path.join(root, 'src-tauri', 'Cargo.toml');
  if (fs.existsSync(srcTauriCargo)) {
    return `--manifest-path "${srcTauriCargo}"`;
  }
  const rootCargo = path.join(root, 'Cargo.toml');
  if (fs.existsSync(rootCargo)) {
    return `--manifest-path "${rootCargo}"`;
  }
  return '';
}

/**
 * Clean Rust target and optional frontend build artifacts
 */
export async function tauriClean(): Promise<void> {
  const choice = await vscode.window.showQuickPick([
    {
      label: '$(trash) Clean Rust Build Artifacts (cargo clean)',
      description: 'Removes src-tauri/target directory to free disk space and do fresh build',
      action: 'cargo'
    },
    {
      label: '$(trash) Deep Clean (Rust target + Frontend build caches)',
      description: 'Cleans cargo target and frontend dist/build/cache folders',
      action: 'deep'
    }
  ], {
    placeHolder: 'Select clean scope'
  });

  if (!choice) {
    return;
  }

  const manifestFlag = getCargoManifestFlag();
  let cmd = `cargo clean ${manifestFlag}`.trim();

  if (choice.action === 'deep') {
    // Also remove frontend dist or build folders if they exist
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      const root = folders[0].uri.fsPath;
      const toRemove = ['dist', 'build', '.vite', '.turbo'];
      for (const dir of toRemove) {
        const p = path.join(root, dir);
        if (fs.existsSync(p)) {
          try {
            fs.rmSync(p, { recursive: true, force: true });
          } catch {
            // ignore
          }
        }
      }
    }
    vscode.window.showInformationMessage('Frontend dist/cache cleaned.');
  }

  TerminalManager.getInstance().runCommand(cmd);
  vscode.window.showInformationMessage('Running cargo clean...');
}

/**
 * Quick compiler check without building binaries
 */
export async function tauriCargoCheck(): Promise<void> {
  const manifestFlag = getCargoManifestFlag();
  const cmd = `cargo check ${manifestFlag}`.trim();
  TerminalManager.getInstance().runCommand(cmd);
}

/**
 * Run Rust Clippy linter on Tauri project
 */
export async function tauriCargoClippy(): Promise<void> {
  const manifestFlag = getCargoManifestFlag();
  const cmd = `cargo clippy ${manifestFlag}`.trim();
  TerminalManager.getInstance().runCommand(cmd);
}

/**
 * Update Cargo dependencies
 */
export async function tauriCargoUpdate(): Promise<void> {
  const manifestFlag = getCargoManifestFlag();
  const cmd = `cargo update ${manifestFlag}`.trim();
  TerminalManager.getInstance().runCommand(cmd);
  vscode.window.showInformationMessage('Updating Cargo dependencies...');
}

