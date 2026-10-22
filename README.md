This is the **MCP layer** of an AI software-engineer agent I built as a VS Code extension.

The agent can use tools it never shipped with, because they arrive from an **MCP server** over stdio. The MCP server's tools are registered into the agent's tool registry as normal tools, so the LLM sees them like any other function and can call them without knowing MCP exists.

```
user prompt
    |
    v
LLM (tool spec list, now including filesystem_* tools)
    |
    v  tool_call: filesystem_list_directory {"path": "..."}
    |
    v
MCP client  --JSON-RPC over stdio-->  MCP server (npx @modelcontextprotocol/server-filesystem)
    |
    v  tool result
    |
    v
LLM reads the result and answers
```

---

## What is MCP in 30 seconds

**Model Context Protocol** is an open protocol for exposing tools, resources and prompts to LLM apps. It is the "USB-C for AI tools": one protocol, and any MCP server becomes usable by any MCP-aware client.

Transport used here: **stdio** — the client spawns the server as a child process and talks JSON-RPC over its stdin/stdout.

The lifecycle is always the same:

| Step | Protocol call | What happens |
|---|---|---|
| 1 | (spawn) | client starts `npx @modelcontextprotocol/server-filesystem <dir>` |
| 2 | `initialize` + `notifications/initialized` | handshake, capability negotiation |
| 3 | `tools/list` | server returns its tools + JSON Schemas |
| 4 | `tools/call` | client invokes a tool with arguments |
| 5 | `close` | transport closed, child process terminated |

---

## Quick start

**Requirements**

- Node.js 18+ (for `npx`)
- VS Code 1.85+
- The official SDK: `@modelcontextprotocol/sdk`

**1. Install**

```bash
npm install @modelcontextprotocol/sdk
```

**2. Configure a server**

Add this to `.vscode/settings.json` (or your user settings):

```json
{
  "aiSoftwareEngineer.mcpServers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${workspaceFolder}"]
    }
  ]
}
```

`name` is the prefix for every tool that server contributes: `filesystem_read_text_file`, `filesystem_list_directory`, ...

> Use an absolute path instead of `${workspaceFolder}` if your editor does not resolve variables inside array settings.

**3. Run**

Open the folder in VS Code and press `F5` → *Run Extension*.

---

## Commands

| Command | What it does |
|---|---|
| `AI Software Engineer: Test MCP Connection` | connects, lists every tool, prints PASS/FAIL to the **AI Software Engineer** output channel |
| `AI Software Engineer: MCP Demo (Record This)` | opens a panel that replays the whole flow: prompt → toolbelt → tool call → server response → answer |
| `AI Software Engineer: Set API Key` | stores a key in VS Code SecretStorage |

Success looks like this in the output channel:

```
Connecting to 1 configured MCP server(s)...
[OK] "filesystem" connected. 14 tool(s): filesystem_read_file, filesystem_list_directory, ...
[PASS] filesystem: 14 tool(s) registered
```

Failure looks like this (and shows a warning toast):

```
[FAIL] "filesystem" failed to connect: spawn npx ENOENT
```

---

## Asking the agent to use MCP tools

```
Use the MCP filesystem tools (not the built-in list_files tool) to list every file in my project folder.
```

```
Use the MCP filesystem read tool to open package.json and tell me the project name and version.
```

The grey line under the reply shows which tools actually ran:

```
tools: filesystem_list_directory | iterations: 2
```

If it says `tools: list_files`, the model picked the built-in tool — re-ask and name the MCP server explicitly.

---

## Implementing MCP in your own project

### 1. Install the SDK

```bash
npm install @modelcontextprotocol/sdk
```

### 2. Connect and list the tools

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem", rootDir],
});

const client = new Client({ name: "my-agent", version: "0.0.1" });

await client.connect(transport);           // initialize + notifications/initialized

const { tools } = await client.listTools();
// tools[i].name, tools[i].description, tools[i].inputSchema
```

`StdioClientTransport` takes `command`, `args` and `env`. Use `env` to pass API keys to servers that need them (never hardcode them in settings).

### 3. Turn each MCP tool into a normal tool

This is the whole trick. MCP tools are described by a JSON Schema; your LLM adapter expects the same shape, so you can pass them straight through.

```ts
for (const t of tools) {
  const exposed = {
    name: `${serverName}_${t.name}`,
    description: `[MCP:${serverName}] ${t.description ?? ""}`,
    parameters: t.inputSchema ?? { type: "object", properties: {} },

    async execute(args: Record<string, any>) {
      try {
        const res = await client.callTool({ name: t.name, arguments: args });
        const text = (res.content ?? [])
          .filter((c: any) => c.type === "text")
          .map((c: any) => c.text)
          .join("\n");
        return res.isError ? `MCP tool error:\n${text}` : (text || JSON.stringify(res));
      } catch (e: any) {
        return `Error calling MCP tool "${t.name}": ${e?.message ?? String(e)}`;
      }
    },
  };

  allTools.push(exposed);
}
```

`allTools` is just your agent's registry array — the same one your orchestrator passes to the LLM.

### 4. The LLM sees them as normal tools

```ts
const toolSpecs = allTools.map((t) => ({
  name: t.name,
  description: t.description,
  parameters: t.parameters,   // <- MCP inputSchema, unchanged
}));

const reply = await adapter.chat(messages, toolSpecs);

for (const call of reply.tool_calls ?? []) {
  const tool = allTools.find((t) => t.name === call.function.name);
  const result = await tool?.execute(JSON.parse(call.function.arguments || "{}"));
  messages.push({
    role: "tool",
    content: result ?? "Error: unknown tool",
    tool_call_id: call.id,
    name: call.function.name,
  });
}
```

The MCP prefix keeps the namespaces from colliding with built-in tools.

### 5. Clean up

```ts
export async function deactivate() {
  for (const client of connected.splice(0)) {
    try { await client.close(); } catch { /* ignore */ }
  }
}
```

Without this the child process stays alive after the extension host exits.

---

## Project structure (MCP part)

```
src/
  mcp/
    client.ts        ← connect, list tools, register them, disconnect  (the core)
    demo.ts          ← scripted trace used by the demo command
  webview/
    mcpDemo.ts       ← renders the demo trace in a VS Code panel
  config.ts          ← reads aiSoftwareEngineer.mcpServers from settings
  tools/
    context.ts       ← the AgentTool interface shared by built-in and MCP tools
    index.ts         ← the tool registry MCP tools are pushed into
  extension.ts       ← activation, commands, lifecycle
test/
  mcp-smoke.mjs      ← headless check: connect -> list -> call -> PASS
  mcp-demo.mjs       ← narrated terminal demo of the protocol
```

---

## Testing it without VS Code

```bash
node test/mcp-smoke.mjs "C:\path\to\your\folder"   # headless PASS/FAIL
node test/mcp-demo.mjs "C:\path\to\your\folder"    # narrated protocol walkthrough
```

The smoke test does the full round trip: spawn → handshake → `tools/list` → `tools/call` → assert no error → `PASS`.

---

## Servers worth trying

| Server | Command | Gives the agent |
|---|---|---|
| filesystem | `npx -y @modelcontextprotocol/server-filesystem <dir>` | read/write/search files |
| github | `npx -y @modelcontextprotocol/server-github` | issues, PRs, repos |
| postgres | `npx -y @modelcontextprotocol/server-postgres` | query a database |
| fetch | `npx -y @modelcontextprotocol/server-fetch` | fetch a URL |
| puppeteer | `npx -y @modelcontextprotocol/server-puppeteer` | drive a real browser |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `spawn npx ENOENT` | `npx` not on PATH for the extension host | use the absolute path to `npx.cmd`, or `command: "node"` with `args: ["<path>/server.js"]` |
| Connected but 0 tools | server needs a directory argument | pass the allowed root as the last arg |
| `${workspaceFolder}` not resolved | editor did not substitute it | use an absolute path |
| Server prints to stderr | normal — it logs startup info | ignore, or pipe stderr if it floods the log |
| Model never calls MCP tools | it prefers the built-in ones | name the MCP server in the prompt, or make the built-in tool names different |
| Tool returns `isError` | server-side failure | read the text content, it carries the real message |

---

## Why this is useful

Because MCP is a protocol, not a vendor SDK, **the agent code does not change when you add a server.** Adding GitHub, Postgres or a browser is one JSON object in settings — no new adapter, no new code path, no special-case branching in the orchestrator. The tool registry is the only seam.
