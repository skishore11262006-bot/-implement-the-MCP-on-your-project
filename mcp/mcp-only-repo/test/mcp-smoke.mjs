import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const targetDir = process.argv[2] ?? process.cwd();
const serverArgs = process.argv.slice(3);

const command = "npx";
const args = serverArgs.length
  ? serverArgs
  : ["-y", "@modelcontextprotocol/server-filesystem", targetDir];

function log(...parts) {
  console.log("[mcp-smoke]", ...parts);
}

async function main() {
  log("connecting to:", command, args.join(" "));

  const transport = new StdioClientTransport({ command, args, stderr: "inherit" });
  const client = new Client({ name: "mcp-smoke-test", version: "0.0.1" });

  const timer = setTimeout(() => {
    log("TIMEOUT: no response in 90s");
    process.exit(1);
  }, 90_000);

  try {
    await client.connect(transport);
    log("connected OK");

    const listed = await client.listTools();
    const tools = listed.tools ?? [];
    log(`tools found (${tools.length}):`, tools.map((t) => t.name).join(", "));

    if (tools.length === 0) {
      log("FAIL: server exposed no tools");
      process.exitCode = 1;
      return;
    }

    const dirTool = tools.find((t) => /^list_directory$/.test(t.name));
    const fileTool = tools.find((t) => /^read_text_file$|^read_file$/.test(t.name));

    let pick = dirTool ?? fileTool ?? tools[0];
    let args = { path: targetDir };

    if (!dirTool && fileTool) {
      const { readdirSync } = await import("fs");
      const { join } = await import("path");
      const firstFile = readdirSync(targetDir).find((f) => !f.startsWith("."));
      pick = fileTool;
      args = { path: join(targetDir, firstFile ?? "package.json") };
    }

    log("calling tool:", pick.name, "with", JSON.stringify(args));

    const res = await client.callTool({
      name: pick.name,
      arguments: args,
    });

    const text = (res.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    log("isError:", Boolean(res.isError));
    log("result:\n" + (text || JSON.stringify(res)));

    if (res.isError) {
      log("FAIL: tool returned an error");
      process.exitCode = 1;
      return;
    }

    log("MCP SMOKE TEST: PASS");
  } catch (e) {
    log("FAIL:", e?.message ?? String(e));
    process.exitCode = 1;
  } finally {
    clearTimeout(timer);
    try {
      await client.close();
    } catch {}
  }
}

main();
