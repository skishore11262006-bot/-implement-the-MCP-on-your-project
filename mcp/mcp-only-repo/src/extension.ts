import * as vscode from "vscode";
import { saveApiKey } from "./config";
import { openMcpDemo } from "./webview/mcpDemo";
import {
  connectMcpServers,
  disconnectMcpServers,
  testMcpConnection,
} from "./mcp/client";

export function activate(context: vscode.ExtensionContext) {
  connectMcpServers().catch((e) => {
    console.error("MCP connection failed:", e);
  });

  const setApiKeyCommand = vscode.commands.registerCommand(
    "ai-software-engineer.setApiKey",
    () => saveApiKey(context)
  );

  const testMcpCommand = vscode.commands.registerCommand(
    "ai-software-engineer.testMcp",
    () => testMcpConnection()
  );

  const demoMcpCommand = vscode.commands.registerCommand(
    "ai-software-engineer.demoMcp",
    () => openMcpDemo(context)
  );

  context.subscriptions.push(
    setApiKeyCommand,
    testMcpCommand,
    demoMcpCommand
  );
}

export async function deactivate(): Promise<void> {
  await disconnectMcpServers();
}
