import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class TerminalManager {
  private static instance: TerminalManager;
  private terminal: vscode.Terminal | null = null;
  private readonly terminalName = 'Tauri';

  private constructor() {
    vscode.window.onDidCloseTerminal(closedTerminal => {
      if (this.terminal && closedTerminal === this.terminal) {
        this.terminal = null;
      }
    });
  }

  public static getInstance(): TerminalManager {
    if (!TerminalManager.instance) {
      TerminalManager.instance = new TerminalManager();
    }
    return TerminalManager.instance;
  }

  /**
   * Determine the best working directory for running Tauri CLI commands.
   * If a workspace is open, checks for src-tauri or workspace root.
   */
  public getWorkingDirectory(): string | undefined {
    const config = vscode.workspace.getConfiguration('tauri');
    const customPath = config.get<string>('customPath');

    if (customPath && fs.existsSync(customPath)) {
      return customPath;
    }

    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return undefined;
    }

    const rootPath = folders[0].uri.fsPath;

    // Check if src-tauri exists in root, or in a subfolder
    if (fs.existsSync(path.join(rootPath, 'src-tauri')) || fs.existsSync(path.join(rootPath, 'tauri.conf.json'))) {
      return rootPath;
    }

    return rootPath;
  }

  /**
   * Run a shell command in the integrated terminal.
   */
  public runCommand(command: string, cwd?: string, forceNewTerminal = false): vscode.Terminal {
    const workingDir = cwd || this.getWorkingDirectory();

    if (forceNewTerminal || !this.terminal) {
      this.terminal = vscode.window.createTerminal({
        name: this.terminalName,
        cwd: workingDir
      });
    }

    this.terminal.show(true);
    if (workingDir && !cwd) {
      // If terminal was already running in a different cwd, cd can be useful,
      // but creating or using terminal with proper cwd is usually handled.
    }
    this.terminal.sendText(command);
    return this.terminal;
  }
}

