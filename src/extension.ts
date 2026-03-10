import * as vscode from 'vscode';
import { GraphPanel } from './GraphPanel';

export function activate(context: vscode.ExtensionContext) {
  const command = vscode.commands.registerCommand('canUSeeMe.openGraph', () => {
    GraphPanel.createOrShow(context.extensionUri);
  });

  context.subscriptions.push(command);
}

export function deactivate() {}
