import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { PACKAGE_MANAGERS, promptPackageManagerSelection } from '../packageManager';
import { TerminalManager } from '../terminalManager';
import { PackageManager } from '../types';

export async function createTauriProject(): Promise<void> {
  // Step 1: Select Package Manager (from https://v2.tauri.app/start/)
  const selectedPm = await promptPackageManagerSelection('Select Package Manager for new Tauri v2 project');
  if (!selectedPm) {
    return;
  }

  const pmOption = PACKAGE_MANAGERS[selectedPm];

  // Step 2: Project Name
  const projectName = await vscode.window.showInputBox({
    prompt: 'Enter the project name',
    placeHolder: 'tauri-app',
    value: 'tauri-app',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Project name cannot be empty';
      }
      if (!/^[\w-]+$/.test(value)) {
        return 'Project name should only contain letters, numbers, hyphens, and underscores';
      }
      return null;
    }
  });

  if (!projectName) {
    return;
  }

  // Step 3: Choose Destination Directory
  const workspaceFolders = vscode.workspace.workspaceFolders;
  let targetDirectory: string | undefined;

  if (workspaceFolders && workspaceFolders.length > 0) {
    const currentWorkspacePath = workspaceFolders[0].uri.fsPath;
    const choice = await vscode.window.showQuickPick([
      {
        label: '$(folder) Inside Current Workspace',
        description: currentWorkspacePath,
        detail: `Creates project at: ${path.join(currentWorkspacePath, projectName)}`,
        target: currentWorkspacePath
      },
      {
        label: '$(file-directory-create) Choose Another Location...',
        description: 'Browse disk for destination directory',
        detail: 'Select folder where the project directory will be created',
        target: 'browse'
      }
    ], {
      placeHolder: 'Select destination directory'
    });

    if (!choice) {
      return;
    }

    if (choice.target === 'browse') {
      const uri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Project Parent Directory'
      });
      if (!uri || uri.length === 0) {
        return;
      }
      targetDirectory = uri[0].fsPath;
    } else {
      targetDirectory = choice.target;
    }
  } else {
    // No workspace open, ask to select directory
    const uri = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select Project Parent Directory'
    });
    if (!uri || uri.length === 0) {
      return;
    }
    targetDirectory = uri[0].fsPath;
  }

  // Step 4: Template Option (Interactive vs Preset)
  const templateMode = await vscode.window.showQuickPick([
    {
      label: '$(terminal) Interactive Wizard (Recommended)',
      description: 'Choose UI framework and language interactively in terminal',
      detail: 'Runs standard create-tauri-app with interactive prompts for React, Vue, Svelte, Solid, Vanilla, etc.',
      mode: 'interactive'
    },
    {
      label: '$(sparkle) React (TypeScript)',
      description: '--template react-ts',
      detail: 'Quickly scaffold a React + TypeScript Tauri app',
      mode: 'react-ts'
    },
    {
      label: '$(sparkle) Vue (TypeScript)',
      description: '--template vue-ts',
      detail: 'Quickly scaffold a Vue 3 + TypeScript Tauri app',
      mode: 'vue-ts'
    },
    {
      label: '$(sparkle) Svelte (TypeScript)',
      description: '--template svelte-ts',
      detail: 'Quickly scaffold a Svelte + TypeScript Tauri app',
      mode: 'svelte-ts'
    },
    {
      label: '$(sparkle) Vanilla (TypeScript)',
      description: '--template vanilla-ts',
      detail: 'Scaffold a Vanilla TypeScript Tauri app',
      mode: 'vanilla-ts'
    }
  ], {
    placeHolder: 'Select project setup method'
  });

  if (!templateMode) {
    return;
  }

  // Build the creation command
  let createCmd = '';
  if (templateMode.mode === 'interactive') {
    createCmd = pmOption.createCommand(projectName);
  } else {
    // Non-interactive flag-based command
    const tpl = templateMode.mode;
    switch (selectedPm) {
      case 'npm':
        createCmd = `npm create tauri-app@latest ${projectName} -- --template ${tpl} --manager npm`;
        break;
      case 'pnpm':
        createCmd = `pnpm create tauri-app ${projectName} --template ${tpl} --manager pnpm`;
        break;
      case 'yarn':
        createCmd = `yarn create tauri-app ${projectName} --template ${tpl} --manager yarn`;
        break;
      case 'bun':
        createCmd = `bunx create-tauri-app ${projectName} --template ${tpl} --manager bun`;
        break;
      case 'cargo':
        createCmd = `cargo create-tauri-app ${projectName} --template ${tpl} --manager cargo`;
        break;
    }
  }

  // Update setting to remember chosen package manager
  const config = vscode.workspace.getConfiguration('tauri');
  await config.update('packageManager', selectedPm, vscode.ConfigurationTarget.Global);

  // Run the command in terminal
  const terminalManager = TerminalManager.getInstance();
  terminalManager.runCommand(createCmd, targetDirectory, true);

  const fullProjectPath = path.join(targetDirectory, projectName);

  vscode.window.showInformationMessage(
    `Creating Tauri project "${projectName}" using ${selectedPm}... Follow any interactive prompts in the terminal.`,
    'Open Project in New Window'
  ).then(selection => {
    if (selection === 'Open Project in New Window') {
      const projectUri = vscode.Uri.file(fullProjectPath);
      vscode.commands.executeCommand('vscode.openFolder', projectUri, true);
    }
  });
}

