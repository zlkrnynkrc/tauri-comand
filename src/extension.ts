import * as vscode from 'vscode';
import { createTauriProject } from './commands/create';
import {
  showTauriCommandPalette,
  tauriDev,
  tauriBuild,
  tauriBundle,
  tauriInit,
  tauriInfo,
  tauriAdd,
  tauriRemove,
  tauriPermission,
  tauriAndroid,
  tauriIos,
  tauriIcon,
  tauriSigner,
  tauriPlugin,
  tauriCompletions,
  tauriMigrate
} from './commands/cliCommands';
import { addDependency } from './commands/addDependency';
import {
  androidBuildApk,
  androidBuildAab,
  androidSignAndKeystoreSetup
} from './commands/android';
import {
  tauriClean,
  tauriCargoCheck,
  tauriCargoClippy,
  tauriCargoUpdate
} from './commands/projectCommands';
import { promptPackageManagerSelection } from './packageManager';
import { TauriStatusBarItem } from './statusBar';
import { TauriDebugConfigurationProvider } from './debugProvider';

export function activate(context: vscode.ExtensionContext) {
  // Status Bar
  const statusBar = new TauriStatusBarItem();
  context.subscriptions.push(statusBar);

  // Update status bar when configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('tauri.packageManager')) {
        statusBar.update();
      }
    })
  );

  // Debug Provider
  const debugProvider = new TauriDebugConfigurationProvider();
  context.subscriptions.push(
    vscode.debug.registerDebugConfigurationProvider('tauri', debugProvider)
  );

  // Command Registrations
  const commands = [
    // Project Creation & Package Manager
    vscode.commands.registerCommand('tauri-comand.createProject', () => createTauriProject()),
    vscode.commands.registerCommand('tauri-comand.selectPackageManager', async () => {
      const pm = await promptPackageManagerSelection('Select Preferred Package Manager for Tauri');
      if (pm) {
        const config = vscode.workspace.getConfiguration('tauri');
        await config.update('packageManager', pm, vscode.ConfigurationTarget.Global);
        statusBar.update();
        vscode.window.showInformationMessage(`Tauri package manager set to: ${pm}`);
      }
    }),

    // Master CLI Menu
    vscode.commands.registerCommand('tauri-comand.runCommand', () => showTauriCommandPalette()),

    // Core CLI Commands
    vscode.commands.registerCommand('tauri-comand.dev', () => tauriDev()),
    vscode.commands.registerCommand('tauri-comand.build', () => tauriBuild(false)),
    vscode.commands.registerCommand('tauri-comand.buildDebug', () => tauriBuild(true)),
    vscode.commands.registerCommand('tauri-comand.bundle', () => tauriBundle()),
    vscode.commands.registerCommand('tauri-comand.init', () => tauriInit()),
    vscode.commands.registerCommand('tauri-comand.info', () => tauriInfo()),
    vscode.commands.registerCommand('tauri-comand.migrate', () => tauriMigrate()),

    // Dependencies (Flutter-style Crates & Plugins)
    vscode.commands.registerCommand('tauri-comand.addDependency', () => addDependency()),
    vscode.commands.registerCommand('tauri-comand.add', () => tauriAdd()),
    vscode.commands.registerCommand('tauri-comand.remove', () => tauriRemove()),
    vscode.commands.registerCommand('tauri-comand.permission', () => tauriPermission()),

    // Project Maintenance (Clean, Check, Clippy, Update)
    vscode.commands.registerCommand('tauri-comand.clean', () => tauriClean()),
    vscode.commands.registerCommand('tauri-comand.cargoCheck', () => tauriCargoCheck()),
    vscode.commands.registerCommand('tauri-comand.cargoClippy', () => tauriCargoClippy()),
    vscode.commands.registerCommand('tauri-comand.cargoUpdate', () => tauriCargoUpdate()),

    // Android
    vscode.commands.registerCommand('tauri-comand.android', () => tauriAndroid()),
    vscode.commands.registerCommand('tauri-comand.androidBuildApk', () => androidBuildApk(false)),
    vscode.commands.registerCommand('tauri-comand.androidBuildApkSplit', () => androidBuildApk(true)),
    vscode.commands.registerCommand('tauri-comand.androidBuildAab', () => androidBuildAab()),
    vscode.commands.registerCommand('tauri-comand.androidSign', () => androidSignAndKeystoreSetup()),

    // iOS
    vscode.commands.registerCommand('tauri-comand.ios', () => tauriIos()),

    // Assets & Security
    vscode.commands.registerCommand('tauri-comand.icon', () => tauriIcon()),
    vscode.commands.registerCommand('tauri-comand.signer', () => tauriSigner()),

    // Advanced & Plugins
    vscode.commands.registerCommand('tauri-comand.plugin', () => tauriPlugin()),
    vscode.commands.registerCommand('tauri-comand.completions', () => tauriCompletions())
  ];

  context.subscriptions.push(...commands);
}

export function deactivate() {}
