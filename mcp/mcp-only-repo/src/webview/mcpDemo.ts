import * as vscode from "vscode";
import { runMcpDemo, DemoStep } from "../mcp/demo";

export async function openMcpDemo(context: vscode.ExtensionContext): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    "aiSoftwareEngineerMcpDemo",
    "MCP Demo",
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  panel.webview.html = getHtml();

  const steps = await runMcpDemo();
  panel.webview.postMessage({ type: "steps", steps });
}

function getHtml(): string {
  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Demo</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      margin: 0;
      padding: 16px;
    }
    h2 { font-size: 14px; opacity: 0.7; margin: 0 0 14px; }
    .bubble {
      max-width: 88%;
      padding: 8px 12px;
      margin: 6px 0;
      border-radius: 8px;
      white-space: pre-wrap;
      word-break: break-word;
      border: 1px solid transparent;
    }
    .user {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      margin-left: auto;
    }
    .agent {
      background: var(--vscode-editorWidget-background);
      border-color: var(--vscode-editorWidget-border);
    }
    .tool {
      background: var(--vscode-textCodeBlock-background);
      border-color: var(--vscode-panel-border);
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
    }
    .meta {
      font-size: 11px;
      opacity: 0.6;
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.7;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <h2>MCP demo - agent using tools from an MCP server</h2>
  <div id="chat"></div>
  <script>
    const vscode = acquireVsCodeApi();
    const chat = document.getElementById("chat");

    window.addEventListener("message", (event) => {
      const msg = event.data;
      if (msg.type !== "steps") return;
      chat.innerHTML = "";
      for (const s of msg.steps) {
        const div = document.createElement("div");
        div.className = "bubble " + s.who;
        const badge = document.createElement("div");
        badge.className = "badge";
        badge.textContent = s.who === "tool" ? "mcp server response" : s.who;
        div.appendChild(badge);
        const text = document.createElement("div");
        text.textContent = s.text;
        div.appendChild(text);
        if (s.meta) {
          const m = document.createElement("div");
          m.className = "meta";
          m.textContent = s.meta;
          div.appendChild(m);
        }
        chat.appendChild(div);
      }
    });
  </script>
</body>
</html>`;
}
