import * as vscode from 'vscode';
import { detectPackageManager } from './packageManager';

export class TauriStatusBarItem {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = 'tauri-comand.runCommand';
    this.update();
  }

  public update(): void {
    const config = vscode.workspace.getConfiguration('tauri');
    const configuredPm = config.get<string>('packageManager', 'auto');
    const detectedPm = detectPackageManager();

    const pm = configuredPm !== 'auto' ? configuredPm : (detectedPm || 'auto');

    this.statusBarItem.text = `$(rocket) Tauri (${pm})`;
    this.statusBarItem.tooltip = `Tauri v2 CLI (${pm}) - Click to run commands`;
    this.statusBarItem.show();
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}

