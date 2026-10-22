import * as vscode from "vscode";

const SECTION = "aiSoftwareEngineer";
const SECRET_KEY = "aiSoftwareEngineer.apiKey";

export type Provider = "ollama" | "openai" | "anthropic";

export interface McpServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export function getConfig() {
  const cfg = vscode.workspace.getConfiguration(SECTION);
  return {
    provider: cfg.get<Provider>("provider", "ollama"),
    model: cfg.get<string>("model", "qwen2.5-coder:3b"),
    ollamaUrl: cfg.get<string>("ollamaUrl", "http://localhost:11434"),
    maxIterations: cfg.get<number>("maxIterations", 15),
    mcpServers: cfg.get<McpServerConfig[]>("mcpServers", []),
  };
}

export async function saveApiKey(
  context: vscode.ExtensionContext
): Promise<void> {
  const input = await vscode.window.showInputBox({
    prompt: "Enter API key (stored in VS Code SecretStorage)",
    password: true,
  });
  if (input) {
    await context.secrets.store(SECRET_KEY, input);
    vscode.window.showInformationMessage("API key saved securely.");
  }
}

export async function getApiKey(
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  return context.secrets.get(SECRET_KEY);
}

export async function clearApiKey(
  context: vscode.ExtensionContext
): Promise<void> {
  await context.secrets.delete(SECRET_KEY);
}