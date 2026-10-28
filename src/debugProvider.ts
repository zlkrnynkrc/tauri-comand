import * as vscode from 'vscode';
import { tauriDev } from './commands/cliCommands';

export class TauriDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
  /**
   * Provide initial debug configurations when user creates launch.json
   */
  provideDebugConfigurations(
    _folder: vscode.WorkspaceFolder | undefined,
    _token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration[]> {
    return [
      {
        name: 'Tauri: Dev',
        type: 'tauri',
        request: 'launch'
      }
    ];
  }

  /**
   * Intercept resolveDebugConfiguration.
   * If type is 'tauri', we execute `tauri dev` directly in the terminal!
   */
  resolveDebugConfiguration(
    _folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    _token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    if (!config.type && !config.request && !config.name) {
      // Empty launch configuration, provide default
      config.type = 'tauri';
      config.name = 'Tauri: Dev';
      config.request = 'launch';
    }

    if (config.type === 'tauri') {
      // Launch tauri dev
      tauriDev();
      // Return null to cancel VS Code's internal debugger attach since we run it in terminal
      return null;
    }

    return config;
  }
}

