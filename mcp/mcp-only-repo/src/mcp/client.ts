import * as vscode from "vscode";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { getConfig } from "../config";
import { allTools } from "../tools/index";
import { AgentTool } from "../tools/context";

const connected: Client[] = [];

export interface McpServerStatus {
  name: string;
  connected: boolean;
  tools: string[];
  error?: string;
}

const statuses: McpServerStatus[] = [];
const exposedToolNames = new Set<string>();

let channel: vscode.OutputChannel | undefined;

export function mcpOutput(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel("AI Software Engineer");
  }
  return channel;
}

function textOf(result: any): string {
  const content = result?.content;
  if (!Array.isArray(content)) {
    return JSON.stringify(result ?? null);
  }
  const parts = content
    .filter((c: any) => c?.type === "text")
    .map((c: any) => String(c.text ?? ""));
  const text = parts.join("\n");
  const header = result?.isError ? "MCP tool error:\n" : "";
  return header + (text || JSON.stringify(result));
}

export async function connectMcpServers(): Promise<McpServerStatus[]> {
  const servers = getConfig().mcpServers;
  const log = mcpOutput();

  log.appendLine(
    `Connecting to ${servers.length} configured MCP server(s)...`
  );

  if (servers.length === 0) {
    log.appendLine(
      'No MCP servers configured. Set "aiSoftwareEngineer.mcpServers" in settings.json.'
    );
  }

  for (const cfg of servers) {
    try {
      const transport = new StdioClientTransport({
        command: cfg.command,
        args: cfg.args ?? [],
        env: cfg.env,
      });

      const client = new Client({
        name: "ai-software-engineer",
        version: "0.0.1",
      });
      await client.connect(transport);
      connected.push(client);

      const listed = await client.listTools();
      const tools = listed.tools ?? [];
      const toolNames: string[] = [];

      for (const t of tools) {
        const exposedName = `${cfg.name}_${t.name}`;
        toolNames.push(exposedName);

        if (exposedToolNames.has(exposedName)) {
          continue;
        }
        exposedToolNames.add(exposedName);

        const exposed: AgentTool = {
          name: exposedName,
          description: `[MCP:${cfg.name}] ${t.description ?? ""}`.trim(),
          parameters: (t.inputSchema ?? {
            type: "object",
            properties: {},
          }) as Record<string, unknown>,
          async execute(args) {
            try {
              const res = await client.callTool({
                name: t.name,
                arguments: args,
              });
              return textOf(res);
            } catch (e: any) {
              return `Error calling MCP tool "${t.name}": ${
                e?.message ?? String(e)
              }`;
            }
          },
        };
        allTools.push(exposed);
      }

      statuses.push({ name: cfg.name, connected: true, tools: toolNames });
      log.appendLine(
        `[OK] "${cfg.name}" connected. ${toolNames.length} tool(s): ${toolNames.join(", ")}`
      );
    } catch (e: any) {
      const message = e?.message ?? String(e);
      statuses.push({ name: cfg.name, connected: false, tools: [], error: message });
      log.appendLine(`[FAIL] "${cfg.name}" failed to connect: ${message}`);
      vscode.window.showWarningMessage(
        `MCP server "${cfg.name}" failed to connect: ${message}`
      );
    }
  }

  return statuses;
}

export function getMcpStatus(): McpServerStatus[] {
  return statuses;
}

export async function testMcpConnection(): Promise<McpServerStatus[]> {
  const log = mcpOutput();
  log.show(true);

  if (statuses.length === 0) {
    await connectMcpServers();
  }

  for (const s of statuses) {
    if (s.connected) {
      log.appendLine(
        `[PASS] ${s.name}: ${s.tools.length} tool(s) registered -> ${s.tools.join(", ")}`
      );
    } else {
      log.appendLine(`[FAIL] ${s.name}: ${s.error}`);
    }
  }

  if (statuses.length === 0) {
    log.appendLine(
      'Nothing to test. Add an entry to "aiSoftwareEngineer.mcpServers" in settings.json.'
    );
  }

  const passed = statuses.filter((s) => s.connected).length;
  vscode.window.showInformationMessage(
    `MCP test: ${passed}/${statuses.length} server(s) connected. Details in the "AI Software Engineer" output channel.`
  );

  return statuses;
}

export async function disconnectMcpServers(): Promise<void> {
  for (const client of connected.splice(0)) {
    try {
      await client.close();
    } catch {
      // ignore shutdown errors
    }
  }
  statuses.length = 0;
  exposedToolNames.clear();
}
