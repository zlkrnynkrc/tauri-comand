import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getActivePackageManager, buildTauriCliCommand } from '../packageManager';
import { TerminalManager } from '../terminalManager';

interface PopularCrate {
  name: string;
  description: string;
  defaultFeatures?: string;
}

const POPULAR_CRATES: PopularCrate[] = [
  { name: 'serde', description: 'Serialization and deserialization framework', defaultFeatures: 'derive' },
  { name: 'serde_json', description: 'JSON serialization for Serde' },
  { name: 'tokio', description: 'Event-driven, non-blocking async runtime', defaultFeatures: 'full' },
  { name: 'anyhow', description: 'Flexible and idiomatic error handling' },
  { name: 'thiserror', description: 'Derive macro for custom Error types' },
  { name: 'reqwest', description: 'Ergonomic HTTP client for Rust', defaultFeatures: 'json' },
  { name: 'rusqlite', description: 'Ergonomic SQLite bindings', defaultFeatures: 'bundled' },
  { name: 'log', description: 'Lightweight logging facade' },
  { name: 'tracing', description: 'Structured, event-driven diagnostic logging' },
  { name: 'uuid', description: 'Generate and parse UUIDs', defaultFeatures: 'v4' },
  { name: 'chrono', description: 'Date and time library for Rust' },
  { name: 'dirs', description: 'Platform-specific standard directory paths (home, config, cache)' }
];

const OFFICIAL_TAURI_PLUGINS = [
  { id: 'fs', name: '@tauri-apps/plugin-fs', description: 'Access the file system with permission scopes' },
  { id: 'dialog', name: '@tauri-apps/plugin-dialog', description: 'Native file picker and message dialogs' },
  { id: 'notification', name: '@tauri-apps/plugin-notification', description: 'Send native desktop and mobile push notifications' },
  { id: 'http', name: '@tauri-apps/plugin-http', description: 'Make HTTP requests bypassing webview CORS' },
  { id: 'os', name: '@tauri-apps/plugin-os', description: 'Query operating system info, platform and arch' },
  { id: 'clipboard-manager', name: '@tauri-apps/plugin-clipboard-manager', description: 'Read and write text/images to system clipboard' },
  { id: 'shell', name: '@tauri-apps/plugin-shell', description: 'Spawn child processes and open external URLs' },
  { id: 'store', name: '@tauri-apps/plugin-store', description: 'Persistent key-value JSON storage' },
  { id: 'updater', name: '@tauri-apps/plugin-updater', description: 'In-app auto-updates for desktop applications' },
  { id: 'process', name: '@tauri-apps/plugin-process', description: 'Manage current application process and reboot' },
  { id: 'global-shortcut', name: '@tauri-apps/plugin-global-shortcut', description: 'Register global keyboard shortcuts across the OS' },
  { id: 'autostart', name: '@tauri-apps/plugin-autostart', description: 'Automatically launch app at system boot' },
  { id: 'window-state', name: '@tauri-apps/plugin-window-state', description: 'Save and restore window size, position, and maximize state' },
  { id: 'sql', name: '@tauri-apps/plugin-sql', description: 'Interface with SQLite, MySQL, and PostgreSQL databases' },
  { id: 'deep-link', name: '@tauri-apps/plugin-deep-link', description: 'Handle custom URI schemes and deep links' },
  { id: 'stronghold', name: '@tauri-apps/plugin-stronghold', description: 'Encrypted, secure secret storage vault' },
  { id: 'biometric', name: '@tauri-apps/plugin-biometric', description: 'Biometric authentication (FaceID, fingerprint on mobile)' },
  { id: 'barcode-scanner', name: '@tauri-apps/plugin-barcode-scanner', description: 'Scan barcodes and QR codes on mobile' },
  { id: 'nfc', name: '@tauri-apps/plugin-nfc', description: 'NFC tag reading and writing' },
  { id: 'positioner', name: '@tauri-apps/plugin-positioner', description: 'Position windows relative to screen corners or tray' },
  { id: 'single-instance', name: '@tauri-apps/plugin-single-instance', description: 'Ensure only one instance of the app runs at a time' },
  { id: 'upload', name: '@tauri-apps/plugin-upload', description: 'Upload and download files in background' },
  { id: 'websocket', name: '@tauri-apps/plugin-websocket', description: 'WebSocket client connection' }
];

/**
 * Returns the Cargo.toml argument flag if inside a Tauri project
 */
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
 * Flutter-style Add Dependency master command.
 * Allows searching online crates from crates.io or selecting Tauri plugins!
 */
export async function addDependency(): Promise<void> {
  const categoryChoice = await vscode.window.showQuickPick([
    {
      label: '$(search) Search Online Crates (crates.io)',
      description: 'Search and install any Rust crate from crates.io',
      detail: 'Live query crates.io (like pubspec assist in Flutter), add with cargo add',
      target: 'search-crates'
    },
    {
      label: '$(star) Popular Rust Crates',
      description: 'serde, tokio, anyhow, reqwest, rusqlite, etc.',
      detail: 'Quickly select from commonly used crates in Tauri applications',
      target: 'popular-crates'
    },
    {
      label: '$(plug) Official Tauri v2 Plugins',
      description: 'fs, dialog, notification, sql, store, updater, etc.',
      detail: 'Adds plugin via `tauri add` (updates Cargo.toml, package.json and permissions)',
      target: 'tauri-plugins'
    }
  ], {
    placeHolder: 'Select dependency type to add'
  });

  if (!categoryChoice) {
    return;
  }

  if (categoryChoice.target === 'search-crates') {
    await searchAndAddCratesIo();
  } else if (categoryChoice.target === 'popular-crates') {
    await selectPopularCrate();
  } else if (categoryChoice.target === 'tauri-plugins') {
    await selectTauriPlugin();
  }
}

/**
 * Search crates.io in real-time and let user add selected crate
 */
async function searchAndAddCratesIo(): Promise<void> {
  const query = await vscode.window.showInputBox({
    prompt: 'Search crates.io for Rust dependencies',
    placeHolder: 'e.g. serde, tokio, rusqlite, reqwest, anyhow...'
  });

  if (!query || !query.trim()) {
    return;
  }

  try {
    const url = `https://crates.io/api/v1/crates?q=${encodeURIComponent(query.trim())}&per_page=20`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'vscode-tauri-commands (https://github.com/zlkrnyn/tauri-comand)'
      }
    });

    if (!response.ok) {
      throw new Error(`crates.io API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      crates?: Array<{
        name: string;
        max_version: string;
        description?: string;
        downloads: number;
      }>;
    };

    if (!data.crates || data.crates.length === 0) {
      vscode.window.showInformationMessage(`No crates found matching "${query}".`);
      return;
    }

    const items = data.crates.map(c => ({
      label: `$(package) ${c.name}`,
      description: `v${c.max_version}`,
      detail: `${c.description || 'No description'} (Downloads: ${formatDownloads(c.downloads)})`,
      crateName: c.name,
      version: c.max_version
    }));

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: `Select a crate to add (found ${items.length} results)`,
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!picked) {
      return;
    }

    await promptFeaturesAndInstallCrate(picked.crateName);
  } catch (err: unknown) {
    const error = err as Error;
    // Fallback if network or API failed: allow direct addition
    const manualAdd = await vscode.window.showWarningMessage(
      `Could not reach crates.io (${error.message}). Add crate "${query}" directly?`,
      'Yes, Add via Cargo',
      'Cancel'
    );
    if (manualAdd === 'Yes, Add via Cargo') {
      await promptFeaturesAndInstallCrate(query.trim());
    }
  }
}

/**
 * QuickPick from popular curated crates
 */
async function selectPopularCrate(): Promise<void> {
  const items = POPULAR_CRATES.map(c => ({
    label: `$(package) ${c.name}`,
    description: c.defaultFeatures ? `default features: [${c.defaultFeatures}]` : '',
    detail: c.description,
    crateName: c.name,
    defaultFeatures: c.defaultFeatures
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a popular Rust crate to add to your Tauri project'
  });

  if (!picked) {
    return;
  }

  await promptFeaturesAndInstallCrate(picked.crateName, picked.defaultFeatures);
}

/**
 * Prompts user for optional features and runs `cargo add`
 */
async function promptFeaturesAndInstallCrate(crateName: string, defaultFeatures = ''): Promise<void> {
  const features = await vscode.window.showInputBox({
    prompt: `Optional features for crate "${crateName}" (comma-separated, leave blank for default)`,
    value: defaultFeatures,
    placeHolder: 'e.g. derive, full, json'
  });

  if (features === undefined) {
    return; // cancelled
  }

  const manifestFlag = getCargoManifestFlag();
  let cmd = `cargo add ${crateName}`;
  if (features && features.trim().length > 0) {
    cmd += ` --features ${features.trim()}`;
  }
  if (manifestFlag) {
    cmd += ` ${manifestFlag}`;
  }

  TerminalManager.getInstance().runCommand(cmd);
  vscode.window.showInformationMessage(`Adding "${crateName}" to Cargo.toml...`);
}

/**
 * Select and install official Tauri v2 plugin
 */
async function selectTauriPlugin(): Promise<void> {
  const items = OFFICIAL_TAURI_PLUGINS.map(p => ({
    label: `$(plug) ${p.id}`,
    description: p.name,
    detail: p.description,
    pluginId: p.id
  }));

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select an official Tauri v2 plugin to add',
    matchOnDescription: true,
    matchOnDetail: true
  });

  if (!picked) {
    return;
  }

  const pm = await getActivePackageManager();
  const cmd = buildTauriCliCommand(pm, 'add', [picked.pluginId]);
  TerminalManager.getInstance().runCommand(cmd);

  vscode.window.showInformationMessage(
    `Adding Tauri plugin "${picked.pluginId}" using ${pm}... (Configures Cargo.toml, package.json and permissions)`
  );
}

function formatDownloads(count: number): string {
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(1)}B`;
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return `${count}`;
}

