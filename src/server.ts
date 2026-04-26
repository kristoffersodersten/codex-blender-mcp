#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { registerBlenderTools } from "./tools.js";

const server = new McpServer({
  name: "codex-blender-mcp",
  version: "0.1.0"
});

registerBlenderTools(server, loadConfig());

const transport = new StdioServerTransport();
await server.connect(transport);
