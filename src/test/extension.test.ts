import * as assert from 'assert';
import * as vscode from 'vscode';
import { buildTauriCliCommand, PACKAGE_MANAGERS } from '../packageManager';

suite('Tauri v2 Extension Test Suite', () => {
  vscode.window.showInformationMessage('Starting Tauri Extension Tests...');

  test('buildTauriCliCommand constructs expected CLI strings for each package manager', () => {
    // pnpm
    assert.strictEqual(buildTauriCliCommand('pnpm', 'dev'), 'pnpm tauri dev');
    assert.strictEqual(buildTauriCliCommand('pnpm', 'build', ['--debug']), 'pnpm tauri build --debug');

    // npm
    assert.strictEqual(buildTauriCliCommand('npm', 'dev'), 'npm run tauri -- dev');
    assert.strictEqual(buildTauriCliCommand('npm', 'icon', ['icon.png']), 'npm run tauri -- icon icon.png');

    // yarn
    assert.strictEqual(buildTauriCliCommand('yarn', 'init'), 'yarn tauri init');

    // bun
    assert.strictEqual(buildTauriCliCommand('bun', 'info'), 'bun tauri info');

    // cargo
    assert.strictEqual(buildTauriCliCommand('cargo', 'android', ['dev']), 'cargo tauri android dev');
  });

  test('PACKAGE_MANAGERS createCommand constructs valid commands', () => {
    assert.strictEqual(PACKAGE_MANAGERS.pnpm.createCommand('my-app'), 'pnpm create tauri-app my-app');
    assert.strictEqual(PACKAGE_MANAGERS.npm.createCommand('my-app'), 'npm create tauri-app@latest my-app');
    assert.strictEqual(PACKAGE_MANAGERS.yarn.createCommand('my-app'), 'yarn create tauri-app my-app');
    assert.strictEqual(PACKAGE_MANAGERS.bun.createCommand('my-app'), 'bun create tauri-app my-app');
    assert.strictEqual(PACKAGE_MANAGERS.cargo.createCommand('my-app'), 'cargo create-tauri-app my-app');
  });

  test('All core, android, and dependency commands are registered in VS Code', async () => {
    const allCommands = await vscode.commands.getCommands(true);

    const expectedCommands = [
      'tauri-comand.createProject',
      'tauri-comand.runCommand',
      'tauri-comand.selectPackageManager',
      'tauri-comand.dev',
      'tauri-comand.build',
      'tauri-comand.buildDebug',
      'tauri-comand.clean',
      'tauri-comand.cargoCheck',
      'tauri-comand.cargoClippy',
      'tauri-comand.cargoUpdate',
      'tauri-comand.addDependency',
      'tauri-comand.info',
      'tauri-comand.add',
      'tauri-comand.remove',
      'tauri-comand.android',
      'tauri-comand.androidBuildApk',
      'tauri-comand.androidBuildApkSplit',
      'tauri-comand.androidBuildAab',
      'tauri-comand.androidSign',
      'tauri-comand.ios',
      'tauri-comand.icon',
      'tauri-comand.signer'
    ];

    for (const cmd of expectedCommands) {
      assert.ok(
        allCommands.includes(cmd),
        `Command ${cmd} should be registered in VS Code`
      );
    }
  });
});
