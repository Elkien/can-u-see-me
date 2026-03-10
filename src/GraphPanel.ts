import * as vscode from 'vscode';
import { scanWorkspace } from './scanner';

export class GraphPanel {
  public static currentPanel: GraphPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private readonly _workspacePath: string;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, workspacePath: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (GraphPanel.currentPanel) {
      GraphPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'canUSeeMe',
      'Can U See Me — Dependency Graph',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    GraphPanel.currentPanel = new GraphPanel(panel, extensionUri, workspacePath);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, workspacePath: string) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._workspacePath = workspacePath;
    this._panel.webview.html = this._getHtml();

    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleMessage(message),
      null,
      this._disposables
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  private _handleMessage(message: { type: string; id?: string }) {
    switch (message.type) {
      case 'ready':
        this._runScan();
        break;
      case 'nodeSelected':
        vscode.window.setStatusBarMessage(`Selected: ${message.id}`, 3000);
        break;
      case 'selectionCleared':
        break;
    }
  }

  private _runScan() {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Can U See Me: Scanning workspace…',
        cancellable: false,
      },
      async () => {
        const graphData = scanWorkspace(this._workspacePath);
        this._panel.webview.postMessage({ type: 'loadGraph', data: graphData });
      }
    );
  }

  public dispose() {
    GraphPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      this._disposables.pop()?.dispose();
    }
  }

  private _getHtml(): string {
    const webview = this._panel.webview;
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'webview.js')
    );

    return /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src ${webview.cspSource}; style-src 'unsafe-inline';" />
  <title>Can U See Me</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0d1117; overflow: hidden; }
    #cy { width: 100vw; height: 100vh; }
    #search-panel {
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #search-input {
      background: #161b22;
      border: 1px solid #30363d;
      color: #e6edf3;
      padding: 6px 10px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      border-radius: 4px;
      outline: none;
      width: 260px;
    }
    #search-input:focus { border-color: #58a6ff; }
    #search-input::placeholder { color: #484f58; }
    #search-count {
      color: #8b949e;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      min-width: 90px;
    }
  </style>
</head>
<body>
  <div id="search-panel">
    <input id="search-input" type="text" placeholder="Search file…" autocomplete="off" spellcheck="false" />
    <span id="search-count"></span>
  </div>
  <div id="cy"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
