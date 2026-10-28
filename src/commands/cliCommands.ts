import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getActivePackageManager, buildTauriCliCommand } from '../packageManager';
import { TerminalManager } from '../terminalManager';
import { addDependency } from './addDependency';
import {
  showAndroidMenu,
  androidBuildApk,
  androidBuildAab,
  androidDev,
  androidSignAndKeystoreSetup
} from './android';
import {
  tauriClean,
  tauriCargoCheck,
  tauriCargoClippy,
  tauriCargoUpdate
} from './projectCommands';

const OFFICIAL_PLUGINS = [
  { name: 'fs', description: 'Access the file system' },
  { name: 'dialog', description: 'Native system dialogs for open/save files and messages' },
  { name: 'notification', description: 'Send native desktop and mobile notifications' },
  { name: 'http', description: 'Make HTTP requests from frontend / Rust' },
  { name: 'os', description: 'Read OS information and environment' },
  { name: 'clipboard-manager', description: 'Read and write to system clipboard' },
  { name: 'shell', description: 'Execute external commands and spawn processes' },
  { name: 'store', description: 'Persistent key-value storage' },
  { name: 'updater', description: 'In-app auto-updates for desktop applications' },
  { name: 'process', description: 'Access current process information and exit' },
  { name: 'global-shortcut', description: 'Register global keyboard shortcuts' },
  { name: 'autostart', description: 'Automatically launch app at system boot' },
  { name: 'window-state', description: 'Save and restore window size and position' },
  { name: 'sql', description: 'Interface with SQLite, MySQL, and PostgreSQL databases' },
  { name: 'deep-link', description: 'Handle custom URL protocols and deep links' },
  { name: 'stronghold', description: 'Encrypted, secure secret vault storage' },
  { name: 'biometric', description: 'Biometric authentication (FaceID, fingerprint)' },
  { name: 'barcode-scanner', description: 'Scan barcodes and QR codes on mobile' },
  { name: 'nfc', description: 'NFC tag reading and writing' },
  { name: 'positioner', description: 'Position windows relative to screen corners' },
  { name: 'single-instance', description: 'Prevent multiple instances of the app' },
  { name: 'upload', description: 'Upload and download files in background' },
  { name: 'websocket', description: 'WebSocket client connection support' }
];

async function runCli(subcommand: string, args: string[] = []): Promise<void> {
  const pm = await getActivePackageManager();
  const fullCommand = buildTauriCliCommand(pm, subcommand, args);
  TerminalManager.getInstance().runCommand(fullCommand);
}

// 1. Core Commands
export async function tauriDev(): Promise<void> {
  await runCli('dev');
}

export async function tauriBuild(debug = false): Promise<void> {
  if (debug) {
    await runCli('build', ['--debug']);
  } else {
    await runCli('build');
  }
}

export async function tauriBundle(): Promise<void> {
  await runCli('bundle');
}

export async function tauriInit(): Promise<void> {
  const appName = await vscode.window.showInputBox({
    prompt: 'App name (leave empty for default)',
    placeHolder: 'my-tauri-app'
  });
  const windowTitle = await vscode.window.showInputBox({
    prompt: 'Window title (leave empty for default)',
    placeHolder: 'My Tauri App'
  });

  const args: string[] = [];
  if (appName) {
    args.push('--app-name', appName);
  }
  if (windowTitle) {
    args.push('--window-title', windowTitle);
  }

  await runCli('init', args);
}

export async function tauriInfo(): Promise<void> {
  await runCli('info');
}

export async function tauriMigrate(): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    'Migrate Tauri v1 project to Tauri v2? Make sure you have backed up your project or committed to git.',
    'Continue Migration',
    'Cancel'
  );
  if (confirm === 'Continue Migration') {
    await runCli('migrate');
  }
}

// 2. Plugins & Capabilities
export async function tauriAdd(): Promise<void> {
  // Delegate to full Flutter-style add dependency
  await addDependency();
}

export async function tauriRemove(): Promise<void> {
  const pluginName = await vscode.window.showInputBox({
    prompt: 'Enter the name of the plugin to remove',
    placeHolder: 'e.g. notification'
  });

  if (pluginName && pluginName.trim()) {
    await runCli('remove', [pluginName.trim()]);
  }
}

export async function tauriPermission(): Promise<void> {
  const action = await vscode.window.showQuickPick([
    {
      label: '$(file-add) permission new',
      description: 'Create a new permission file',
      id: 'new'
    },
    {
      label: '$(add) permission add',
      description: 'Add a permission to capabilities',
      id: 'add'
    }
  ], {
    placeHolder: 'Select permission action'
  });

  if (!action) {
    return;
  }

  if (action.id === 'new') {
    const name = await vscode.window.showInputBox({
      prompt: 'Permission identifier/name',
      placeHolder: 'my-permission'
    });
    if (name) {
      await runCli('permission', ['new', name]);
    }
  } else {
    const perm = await vscode.window.showInputBox({
      prompt: 'Permission to add (e.g., core:default)',
      placeHolder: 'core:default'
    });
    if (perm) {
      await runCli('permission', ['add', perm]);
    }
  }
}

// 3. Mobile Commands (Android & iOS)
export async function tauriAndroid(): Promise<void> {
  await showAndroidMenu();
}

export async function tauriIos(): Promise<void> {
  const choice = await vscode.window.showQuickPick([
    {
      label: '$(play) ios dev',
      description: 'Run app in development mode on iOS simulator/device',
      id: 'dev'
    },
    {
      label: '$(package) ios build',
      description: 'Build release IPAs for iOS',
      id: 'build'
    },
    {
      label: '$(run) ios run',
      description: 'Run app in production mode on iOS simulator',
      id: 'run'
    },
    {
      label: '$(gear) ios init',
      description: 'Initialize iOS target in the project',
      id: 'init'
    }
  ], {
    placeHolder: 'Select iOS CLI action'
  });

  if (choice) {
    await runCli(`ios ${choice.id}`);
  }
}

// 4. Assets & Security
export async function tauriIcon(): Promise<void> {
  const choice = await vscode.window.showQuickPick([
    {
      label: '$(file-media) Select Image File...',
      description: 'Choose a 512x512+ PNG image on disk',
      id: 'browse'
    },
    {
      label: '$(file) Use default app-icon.png',
      description: 'Looks for app-icon.png in current workspace',
      id: 'default'
    }
  ], {
    placeHolder: 'Generate icons for desktop & mobile'
  });

  if (!choice) {
    return;
  }

  if (choice.id === 'browse') {
    const uri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'Images': ['png', 'jpg', 'jpeg', 'svg']
      },
      openLabel: 'Select Icon Source'
    });

    if (uri && uri.length > 0) {
      await runCli('icon', [uri[0].fsPath]);
    }
  } else {
    await runCli('icon', ['app-icon.png']);
  }
}

export async function tauriSigner(): Promise<void> {
  const choice = await vscode.window.showQuickPick([
    {
      label: '$(key) signer generate',
      description: 'Generate a new private & public key pair for updater',
      id: 'generate'
    },
    {
      label: '$(lock) signer sign',
      description: 'Sign a binary or archive file',
      id: 'sign'
    }
  ], {
    placeHolder: 'Select signer action'
  });

  if (!choice) {
    return;
  }

  if (choice.id === 'generate') {
    await runCli('signer generate');
  } else {
    const fileUri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      openLabel: 'Select file to sign'
    });
    if (fileUri && fileUri.length > 0) {
      await runCli('signer sign', [fileUri[0].fsPath]);
    }
  }
}

// 5. Plugin authoring & completions
export async function tauriPlugin(): Promise<void> {
  const choice = await vscode.window.showQuickPick([
    {
      label: '$(folder-library) plugin new',
      description: 'Initialize a new Tauri plugin project',
      id: 'new'
    },
    {
      label: '$(gear) plugin init',
      description: 'Initialize a Tauri plugin on an existing directory',
      id: 'init'
    },
    {
      label: '$(device-mobile) plugin android',
      description: 'Manage the Android project for a plugin',
      id: 'android'
    },
    {
      label: '$(device-mobile) plugin ios',
      description: 'Manage the iOS project for a plugin',
      id: 'ios'
    }
  ], {
    placeHolder: 'Select plugin action'
  });

  if (!choice) {
    return;
  }

  if (choice.id === 'new') {
    const name = await vscode.window.showInputBox({
      prompt: 'Plugin name',
      placeHolder: 'my-plugin'
    });
    if (name) {
      await runCli('plugin new', [name]);
    }
  } else {
    await runCli(`plugin ${choice.id}`);
  }
}

export async function tauriCompletions(): Promise<void> {
  const shell = await vscode.window.showQuickPick([
    { label: 'bash', id: 'bash' },
    { label: 'zsh', id: 'zsh' },
    { label: 'powershell', id: 'powershell' },
    { label: 'fish', id: 'fish' }
  ], {
    placeHolder: 'Select shell for auto-completions'
  });

  if (shell) {
    await runCli('completions', [shell.id]);
  }
}

// 6. Master QuickPick menu showing all CLI commands & project tools
export async function showTauriCommandPalette(): Promise<void> {
  interface CommandQuickPickItem extends vscode.QuickPickItem {
    action: () => Promise<void>;
  }

  const items: CommandQuickPickItem[] = [
    // Core
    {
      label: '$(play) Tauri: Dev (Run)',
      description: 'tauri dev',
      detail: 'Run your app in development mode with live hot-reloading',
      action: () => tauriDev()
    },
    {
      label: '$(package) Tauri: Build',
      description: 'tauri build',
      detail: 'Compile your app in release mode and generate bundles/installers',
      action: () => tauriBuild(false)
    },
    {
      label: '$(bug) Tauri: Build (Debug)',
      description: 'tauri build --debug',
      detail: 'Compile your app in debug mode (faster compile, unoptimized)',
      action: () => tauriBuild(true)
    },
    {
      label: '$(archive) Tauri: Bundle',
      description: 'tauri bundle',
      detail: 'Generate bundles and installers for an already built app',
      action: () => tauriBundle()
    },

    // Dependencies (Flutter-style)
    {
      label: '$(plug) Tauri: Add Dependency (Crates & Plugins)',
      description: 'crates.io search & official plugins',
      detail: 'Flutter-style dependency manager: search online crates or pick official Tauri plugins',
      action: () => addDependency()
    },

    // Project Maintenance (Clean, Check, Clippy, Update)
    {
      label: '$(trash) Tauri: Clean (cargo clean)',
      description: 'clean target and build caches',
      detail: 'Clean Rust build artifacts in src-tauri/target and frontend dist folders',
      action: () => tauriClean()
    },
    {
      label: '$(check) Tauri: Cargo Check',
      description: 'cargo check',
      detail: 'Quickly check Rust code for compilation errors without generating binaries',
      action: () => tauriCargoCheck()
    },
    {
      label: '$(sparkle) Tauri: Cargo Clippy',
      description: 'cargo clippy',
      detail: 'Run the Rust linter to catch common mistakes and improve your code',
      action: () => tauriCargoClippy()
    },
    {
      label: '$(sync) Tauri: Cargo Update',
      description: 'cargo update',
      detail: 'Update Rust crate dependencies in Cargo.lock to their latest allowed versions',
      action: () => tauriCargoUpdate()
    },

    // Mobile
    {
      label: '$(device-mobile) Tauri: Android (APK, Split per ABI, Sign, Dev...)',
      description: 'tauri android [apk | split-per-abi | aab | sign | dev]',
      detail: 'Build APKs (universal or per-ABI), configure keystore signing, and test on device',
      action: () => showAndroidMenu()
    },
    {
      label: '$(device-mobile) Tauri: iOS...',
      description: 'tauri ios [init | dev | build | run]',
      detail: 'Manage and run your Tauri app on iOS devices and simulators',
      action: () => tauriIos()
    },

    // Diagnostic & Setup
    {
      label: '$(info) Tauri: Info',
      description: 'tauri info',
      detail: 'Show diagnostic list of environment, Rust, Node.js and Tauri versions',
      action: () => tauriInfo()
    },
    {
      label: '$(tools) Tauri: Init',
      description: 'tauri init',
      detail: 'Initialize Tauri in an existing project directory',
      action: () => tauriInit()
    },
    {
      label: '$(trash) Tauri: Remove Plugin',
      description: 'tauri remove <plugin>',
      detail: 'Remove a Tauri plugin from the project',
      action: () => tauriRemove()
    },
    {
      label: '$(shield) Tauri: Permission...',
      description: 'tauri permission new / add',
      detail: 'Manage or create permissions for your app or plugin',
      action: () => tauriPermission()
    },

    // Assets & Security
    {
      label: '$(file-media) Tauri: Generate Icons',
      description: 'tauri icon <image>',
      detail: 'Generate all icons for desktop & mobile from a source image',
      action: () => tauriIcon()
    },
    {
      label: '$(key) Tauri: Signer (Updater Keys)...',
      description: 'tauri signer [generate | sign]',
      detail: 'Generate updater signing keys or sign update binaries',
      action: () => tauriSigner()
    },

    // Advanced & Plugins
    {
      label: '$(extensions) Tauri: Plugin Management...',
      description: 'tauri plugin [new | init | android | ios]',
      detail: 'Develop or manage Tauri plugins',
      action: () => tauriPlugin()
    },
    {
      label: '$(arrow-swap) Tauri: Migrate (v1 to v2)',
      description: 'tauri migrate',
      detail: 'Migrate a Tauri v1 project to Tauri v2',
      action: () => tauriMigrate()
    },
    {
      label: '$(terminal) Tauri: Completions',
      description: 'tauri completions',
      detail: 'Generate shell completion scripts (bash, zsh, powershell, fish)',
      action: () => tauriCompletions()
    }
  ];

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a Tauri v2 command to run',
    matchOnDescription: true,
    matchOnDetail: true
  });

  if (picked) {
    await picked.action();
  }
}
