import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import sizeOf from 'image-size';

let statusBar: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBar);

  vscode.window.onDidChangeActiveTextEditor(updateStatusBar);
  vscode.workspace.onDidOpenTextDocument(() => updateStatusBar(vscode.window.activeTextEditor));
  updateStatusBar(vscode.window.activeTextEditor);
}

function updateStatusBar(editor: vscode.TextEditor | undefined) {
  if (!editor || !editor.document) return;

  const filePath = editor.document.uri.fsPath;
  const ext = path.extname(filePath).toLowerCase();

  const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext);
  if (!isImage) {
    statusBar.hide();
    return;
  }

  try {
    const buffer = fs.readFileSync(filePath);

    let width: number | undefined, height: number | undefined;

    if (ext === '.svg') {
      const svgContent = buffer.toString();
      ({ width, height } = getSvgDimensions(svgContent));
    } else {
      const dimensions = sizeOf(buffer);
      width = dimensions.width;
      height = dimensions.height;
    }

    if (width && height) {
      statusBar.text = `📐 ${width} × ${height}`;
      statusBar.show();
    } else {
      statusBar.hide();
    }
  } catch {
    statusBar.hide();
  }
}

function getSvgDimensions(svgContent: string): { width?: number; height?: number } {
  const widthMatch = RegExp(/<svg[^>]*\swidth="([\d.]+)(px)?"/i).exec(svgContent);
  const heightMatch = RegExp(/<svg[^>]*\sheight="([\d.]+)(px)?"/i).exec(svgContent);
  const viewBoxMatch = RegExp(/viewBox="([\d.]+\s[\d.]+\s[\d.]+\s[\d.]+)"/i).exec(svgContent);

  let width = widthMatch ? parseFloat(widthMatch[1]) : undefined;
  let height = heightMatch ? parseFloat(heightMatch[1]) : undefined;

  if ((!width || !height) && viewBoxMatch) {
    const [, , w, h] = viewBoxMatch[1].split(/\s+/).map(Number);
    width = width ?? w;
    height = height ?? h;
  }

  return { width, height };
}

export function deactivate() {
  statusBar.dispose();
}
