import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, any>) => Promise<string>;
}

function resolveInsideWorkspace(filePath: string): string {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    throw new Error("No workspace folder open");
  }
  const root = folder.uri.fsPath;
  const resolved = path.resolve(root, filePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Access denied: path is outside the workspace");
  }
  return resolved;
}

export const listFilesTool: AgentTool = {
  name: "list_files",
  description: "List files and folders in the workspace (or a subfolder)",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative folder path, '' for root" },
    },
    required: [],
  },
  async execute(args) {
    const dir = resolveInsideWorkspace(args.path ?? "");
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .join("\n");
  },
};

export const readFileTool: AgentTool = {
  name: "read_file",
  description: "Read the full content of a file in the workspace",
  parameters: {
    type: "object",
    properties: {
      path: { type: "string", description: "Relative file path" },
    },
    required: ["path"],
  },
  async execute(args) {
    const file = resolveInsideWorkspace(args.path);
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    return doc.getText();
  },
};

export const searchCodeTool: AgentTool = {
  name: "search_code",
  description: "Search for a text or regex pattern across workspace files",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Text to search for" },
    },
    required: ["query"],
  },
  async execute(args) {
    const results: string[] = [];
    const files = await vscode.workspace.findFiles("**/*", "**/node_modules/**");
    for (const uri of files.slice(0, 100)) {
      const doc = await vscode.workspace.openTextDocument(uri);
      const text = doc.getText();
      const lines = text.split("\n");
      lines.forEach((line, i) => {
        if (line.includes(args.query) && results.length < 50) {
          const rel = vscode.workspace.asRelativePath(uri);
          results.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    return results.length ? results.join("\n") : "No matches found";
  },
};

export const contextTools: AgentTool[] = [
  listFilesTool,
  readFileTool,
  searchCodeTool,
];
