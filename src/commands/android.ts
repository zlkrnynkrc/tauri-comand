import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getActivePackageManager, buildTauriCliCommand } from '../packageManager';
import { TerminalManager } from '../terminalManager';

async function runCli(subcommand: string, args: string[] = []): Promise<void> {
  const pm = await getActivePackageManager();
  const fullCommand = buildTauriCliCommand(pm, subcommand, args);
  TerminalManager.getInstance().runCommand(fullCommand);
}

/**
 * Android universal or per-ABI APK build
 */
export async function androidBuildApk(splitPerAbi = false): Promise<void> {
  const args = ['--apk'];
  if (splitPerAbi) {
    args.push('--split-per-abi');
  }
  await runCli('android build', args);
  vscode.window.showInformationMessage(
    splitPerAbi
      ? 'Building split APKs per ABI (armeabi-v7a, arm64-v8a, x86, x86_64)...'
      : 'Building universal Android APK...'
  );
}

/**
 * Android AAB build (for Google Play Store)
 */
export async function androidBuildAab(): Promise<void> {
  await runCli('android build', ['--aab']);
  vscode.window.showInformationMessage('Building Android App Bundle (AAB) for Google Play...');
}

export async function androidDev(): Promise<void> {
  await runCli('android dev');
}

export async function androidRun(): Promise<void> {
  await runCli('android run');
}

export async function androidInit(): Promise<void> {
  await runCli('android init');
}

/**
 * Locate src-tauri/gen/android directory if present in workspace
 */
function getAndroidGenDir(): string | null {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return null;
  }
  const root = folders[0].uri.fsPath;
  const genAndroid = path.join(root, 'src-tauri', 'gen', 'android');
  if (fs.existsSync(genAndroid)) {
    return genAndroid;
  }
  return null;
}

/**
 * Configure Android Keystore & signing (keystore.properties)
 */
export async function androidSignAndKeystoreSetup(): Promise<void> {
  const choice = await vscode.window.showQuickPick([
    {
      label: '$(key) Generate New Keystore (keytool)',
      description: 'Create a new .jks signing key and configure keystore.properties',
      detail: 'Runs keytool to generate RSA 2048-bit key, writes keystore.properties for Gradle',
      action: 'generate'
    },
    {
      label: '$(file-text) Configure Existing Keystore',
      description: 'Link an existing .jks or .keystore to Gradle',
      detail: 'Prompts for path, alias, passwords and creates src-tauri/gen/android/keystore.properties',
      action: 'configure'
    },
    {
      label: '$(eye) View Current Keystore Config',
      description: 'Check src-tauri/gen/android/keystore.properties',
      detail: 'Inspect the current Android signing configuration',
      action: 'view'
    },
    {
      label: '$(package) Build Signed APK / AAB',
      description: 'Run production build using configured keystore',
      detail: 'Builds release APK or AAB signed with your keystore',
      action: 'build'
    }
  ], {
    placeHolder: 'Select Android Signing / Keystore Action'
  });

  if (!choice) {
    return;
  }

  const genDir = getAndroidGenDir();
  const folders = vscode.workspace.workspaceFolders;
  const rootDir = folders && folders.length > 0 ? folders[0].uri.fsPath : '';

  if (choice.action === 'generate') {
    const alias = await vscode.window.showInputBox({
      prompt: 'Keystore key alias',
      value: 'upload',
      placeHolder: 'upload'
    });
    if (!alias) {
      return;
    }

    const defaultKeystorePath = rootDir ? path.join(rootDir, 'upload-keystore.jks') : 'upload-keystore.jks';
    const keystorePath = await vscode.window.showInputBox({
      prompt: 'Keystore destination path',
      value: defaultKeystorePath
    });
    if (!keystorePath) {
      return;
    }

    const storePassword = await vscode.window.showInputBox({
      prompt: 'Store password',
      password: true,
      placeHolder: 'Enter store password'
    });
    if (!storePassword) {
      return;
    }

    const keyPassword = await vscode.window.showInputBox({
      prompt: 'Key password (press Enter to use store password)',
      password: true,
      value: storePassword
    });

    const keytoolCmd = `keytool -genkey -v -keystore "${keystorePath}" -keyalg RSA -keysize 2048 -validity 10000 -alias ${alias} -storepass ${storePassword} -keypass ${keyPassword || storePassword}`;
    TerminalManager.getInstance().runCommand(keytoolCmd);

    // Write keystore.properties
    if (genDir) {
      saveKeystoreProperties(genDir, alias, storePassword, keyPassword || storePassword, keystorePath);
    } else {
      vscode.window.showInformationMessage(
        'Keystore generation initiated. Once "tauri android init" is run, configure keystore.properties in src-tauri/gen/android.'
      );
    }
  } else if (choice.action === 'configure') {
    const selectedFile = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      filters: { 'Keystore files': ['jks', 'keystore'] },
      openLabel: 'Select Keystore File'
    });

    if (!selectedFile || selectedFile.length === 0) {
      return;
    }

    const keystoreFile = selectedFile[0].fsPath;

    const alias = await vscode.window.showInputBox({
      prompt: 'Key alias in keystore',
      value: 'upload'
    });
    if (!alias) {
      return;
    }

    const storePassword = await vscode.window.showInputBox({
      prompt: 'Store password',
      password: true
    });
    if (!storePassword) {
      return;
    }

    const keyPassword = await vscode.window.showInputBox({
      prompt: 'Key password',
      password: true,
      value: storePassword
    });

    let targetDir = genDir;
    if (!targetDir && rootDir) {
      targetDir = path.join(rootDir, 'src-tauri', 'gen', 'android');
      fs.mkdirSync(targetDir, { recursive: true });
    }

    if (targetDir) {
      saveKeystoreProperties(targetDir, alias, storePassword, keyPassword || storePassword, keystoreFile);
    }
  } else if (choice.action === 'view') {
    if (!genDir) {
      vscode.window.showWarningMessage('src-tauri/gen/android directory not found. Have you run "tauri android init"?');
      return;
    }
    const propsPath = path.join(genDir, 'keystore.properties');
    if (!fs.existsSync(propsPath)) {
      vscode.window.showInformationMessage('keystore.properties does not exist yet. Run "Configure Existing Keystore" or "Generate New Keystore".');
      return;
    }
    const doc = await vscode.workspace.openTextDocument(propsPath);
    await vscode.window.showTextDocument(doc);
  } else if (choice.action === 'build') {
    const format = await vscode.window.showQuickPick([
      { label: '$(package) Universal APK', id: 'apk-universal' },
      { label: '$(package) Split APKs per ABI', id: 'apk-split' },
      { label: '$(archive) AAB App Bundle', id: 'aab' }
    ], { placeHolder: 'Select build format' });

    if (format?.id === 'apk-universal') {
      await androidBuildApk(false);
    } else if (format?.id === 'apk-split') {
      await androidBuildApk(true);
    } else if (format?.id === 'aab') {
      await androidBuildAab();
    }
  }
}

function saveKeystoreProperties(
  targetDir: string,
  alias: string,
  storePass: string,
  keyPass: string,
  filePath: string
): void {
  const content = `# Android Keystore signing configuration for Tauri v2
keyAlias=${alias}
storePassword=${storePass}
keyPassword=${keyPass}
storeFile=${filePath}
`;
  const propsPath = path.join(targetDir, 'keystore.properties');
  fs.writeFileSync(propsPath, content, 'utf-8');
  vscode.window.showInformationMessage(
    `Saved Android keystore properties to: ${propsPath}`,
    'Open File'
  ).then(selection => {
    if (selection === 'Open File') {
      vscode.workspace.openTextDocument(propsPath).then(doc => vscode.window.showTextDocument(doc));
    }
  });
}

/**
 * Main Android menu QuickPick
 */
export async function showAndroidMenu(): Promise<void> {
  const choice = await vscode.window.showQuickPick([
    {
      label: '$(play) Android: Dev',
      description: 'tauri android dev',
      detail: 'Run development mode on connected Android device or emulator with live reload',
      action: () => androidDev()
    },
    {
      label: '$(package) Android: Build APK (Split per ABI)',
      description: 'tauri android build --apk --split-per-abi',
      detail: 'Build separate, size-optimized APKs for armeabi-v7a, arm64-v8a, x86, x86_64',
      action: () => androidBuildApk(true)
    },
    {
      label: '$(package) Android: Build APK (Universal)',
      description: 'tauri android build --apk',
      detail: 'Build a single universal APK containing binaries for all architectures',
      action: () => androidBuildApk(false)
    },
    {
      label: '$(archive) Android: Build AAB (Google Play)',
      description: 'tauri android build --aab',
      detail: 'Build release Android App Bundle (AAB) required for Google Play Store upload',
      action: () => androidBuildAab()
    },
    {
      label: '$(key) Android: Sign & Keystore Setup...',
      description: 'Configure keystore.properties & signing keys',
      detail: 'Generate RSA keystore with keytool or configure existing credentials for Gradle release',
      action: () => androidSignAndKeystoreSetup()
    },
    {
      label: '$(run) Android: Run Production',
      description: 'tauri android run',
      detail: 'Run production build directly on connected Android device',
      action: () => androidRun()
    },
    {
      label: '$(gear) Android: Init Target',
      description: 'tauri android init',
      detail: 'Initialize Android target files and Gradle structure in the project',
      action: () => androidInit()
    }
  ], {
    placeHolder: 'Select an Android action for Tauri v2'
  });

  if (choice) {
    await choice.action();
  }
}

