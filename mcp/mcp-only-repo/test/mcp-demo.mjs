import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const targetDir = process.argv[2] ?? process.cwd();

const C = {
  dim: (s) => `\u001b[2m${s}\u001b[0m`,
  bold: (s) => `\u001b[1m${s}\u001b[0m`,
  green: (s) => `\u001b[32m${s}\u001b[0m`,
  cyan: (s) => `\u001b[36m${s}\u001b[0m`,
  yellow: (s) => `\u001b[33m${s}\u001b[0m`,
};

function step(n, title) {
  console.log(`\n${C.bold(C.cyan(`STEP ${n}`))} ${C.bold(title)}`);
}
function ok(msg) {
  console.log(`  ${C.green("OK")}  ${msg}`);
}
function detail(msg) {
  console.log(`      ${C.dim(msg)}`);
}
function fail(msg) {
  console.log(`  ${C.yellow("FAIL")} ${msg}`);
}

async function main() {
  console.log(
    C.bold("MCP DEMO - Model Context Protocol over stdio") +
      "\n" +
      C.dim("server: @modelcontextprotocol/server-filesystem") +
      "\n" +
      C.dim(`root:   ${targetDir}`)
  );

  step(1, "Spawn the MCP server as a child process (stdio transport)");
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", targetDir],
    stderr: "ignore",
  });
  detail("npx -y @modelcontextprotocol/server-filesystem " + targetDir);

  const client = new Client({ name: "ai-software-engineer", version: "0.0.1" });

  step(2, "Handshake (initialize + notifications/initialized)");
  await client.connect(transport);
  const caps = client.getServerCapabilities();
  ok(`connected - server capabilities: ${JSON.stringify(caps ?? {})}`);

  step(3, "tools/list - ask the server what tools it exposes");
  const listed = await client.listTools();
  const tools = listed.tools ?? [];
  ok(`${tools.length} tool(s) exposed`);
  for (const t of tools) {
    detail(`${t.name}  ${(t.description ?? "").slice(0, 70)}`);
  }

  step(4, "tools/call - actually invoke a tool");
  const pick = tools.find((t) => t.name === "list_directory") ?? tools[0];
  detail(`${pick.name} ${JSON.stringify({ path: targetDir })}`);
  const res = await client.callTool({
    name: pick.name,
    arguments: { path: targetDir },
  });
  const text = (res.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  if (res.isError) {
    fail(text || "tool returned an error");
  } else {
    ok(`tool returned ${text.split("\n").length} line(s)`);
    for (const line of text.split("\n").slice(0, 12)) {
      detail(line);
    }
  }

  step(5, "Close the transport");
  await client.close();
  ok("server process terminated");

  console.log(`\n${C.bold(C.green("MCP DEMO COMPLETE - protocol verified"))}\n`);
}

main().catch((e) => {
  console.error(`\n${C.yellow("DEMO FAILED")}: ${e?.message ?? e}`);
  process.exit(1);
});
