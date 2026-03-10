import * as vscode from 'vscode';
import { GraphPanel } from './GraphPanel';

export function activate(context: vscode.ExtensionContext) {
  const command = vscode.commands.registerCommand('canUSeeMe.openGraph', () => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showErrorMessage('Can U See Me: no workspace folder open.');
      return;
    }
    const workspacePath = folders[0].uri.fsPath;
    GraphPanel.createOrShow(context.extensionUri, workspacePath);
  });

  context.subscriptions.push(command);
}

export function deactivate() {}
