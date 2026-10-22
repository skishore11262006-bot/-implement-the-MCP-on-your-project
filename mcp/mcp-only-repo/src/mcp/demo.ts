import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import { connectMcpServers, getMcpStatus, mcpOutput } from "./client";
import { allTools } from "../tools/index";
import { AgentTool } from "../tools/context";

export interface DemoStep {
  who: "user" | "agent" | "tool";
  text: string;
  meta?: string;
}

function isMcpTool(tool: AgentTool): boolean {
  return tool.description.startsWith("[MCP:");
}

function pickTool(root: string): { tool: AgentTool; args: Record<string, any> } | undefined {
  const mcpTools = allTools.filter(isMcpTool);
  if (mcpTools.length === 0) {
    return undefined;
  }

  const listTool = mcpTools.find((t) => /list_directory$/.test(t.name));
  if (listTool) {
    return { tool: listTool, args: { path: root } };
  }

  const readTool = mcpTools.find((t) => /read_(text_)?file$/.test(t.name));
  if (readTool) {
    return { tool: readTool, args: { path: path.join(root, "package.json") } };
  }

  return { tool: mcpTools[0], args: {} };
}

export async function runMcpDemo(): Promise<DemoStep[]> {
  const steps: DemoStep[] = [];
  const log = mcpOutput();
  log.show(true);
  log.appendLine("========== MCP DEMO START ==========");

  const prompt = "List the files in my project folder.";
  steps.push({ who: "user", text: prompt });
  log.appendLine(`[user] ${prompt}`);

  let status = getMcpStatus();
  if (status.length === 0) {
    status = await connectMcpServers();
  }

  if (status.length === 0) {
    const msg =
      'No MCP servers configured. Add "aiSoftwareEngineer.mcpServers" to .vscode/settings.json first.';
    steps.push({ who: "agent", text: msg, meta: "MCP not configured" });
    log.appendLine(`[agent] ${msg}`);
    log.appendLine("========== MCP DEMO END ==========");
    return steps;
  }

  const mcpTools = allTools.filter(isMcpTool);
  const specList = mcpTools
    .map(
      (t) =>
        `- ${t.name}\n    ${t.description}\n    input: ${JSON.stringify(t.parameters).slice(0, 220)}`
    )
    .join("\n");

  const agentText =
    `Connected to ${status.length} MCP server(s) and received ${mcpTools.length} tool(s).\n` +
    `They are now first-class tools in my toolbelt:\n${specList}`;
  steps.push({ who: "agent", text: agentText, meta: "MCP tools registered" });
  log.appendLine(`[agent] ${agentText}`);

  const picked = pickTool(
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd()
  );

  if (!picked) {
    const msg = "No MCP tools are available to call.";
    steps.push({ who: "agent", text: msg, meta: "no MCP tools" });
    log.appendLine(`[agent] ${msg}`);
    log.appendLine("========== MCP DEMO END ==========");
    return steps;
  }

  const callText = `${picked.tool.name} ${JSON.stringify(picked.args)}`;
  steps.push({ who: "agent", text: `Calling MCP tool:\n${callText}`, meta: "tool call" });
  log.appendLine(`[tool call] ${callText}`);

  let result = "";
  try {
    result = await picked.tool.execute(picked.args);
  } catch (e: any) {
    result = `Error: ${e?.message ?? String(e)}`;
  }

  steps.push({ who: "tool", text: result, meta: "MCP server response" });
  log.appendLine(`[tool result]\n${result}`);

  const summary = buildSummary(picked.tool.name, result);
  steps.push({ who: "agent", text: summary, meta: "final answer" });
  log.appendLine(`[agent] ${summary}`);
  log.appendLine("========== MCP DEMO END ==========");

  return steps;
}

function buildSummary(toolName: string, result: string): string {
  const lines = result
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const count = lines.length;
  const preview = lines.slice(0, 8).join("\n");
  return (
    `Done. I called the MCP tool \`${toolName}\` and got ${count} entr${
      count === 1 ? "y" : "ies"
    } back from the MCP server:\n${preview}` +
    (count > 8 ? `\n... and ${count - 8} more` : "")
  );
}

export async function listWorkspaceFiles(): Promise<string[]> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    return [];
  }
  return fs.readdir(root);
}
