import Fastify from "fastify";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { streamableHttp } from "fastify-mcp";
import { zodToJsonSchema } from "zod-to-json-schema";
import { GetFigmaImageSchema } from "./tools";
import FigmaHelper from "./helper/figma-helper";
import dotenv from "dotenv";

dotenv.config();

const { FIGMA_ACCESSTOKEN } = process.env;

if (!FIGMA_ACCESSTOKEN) {
  console.error("Missing required environment variables: FIGMA_ACCESSTOKEN.");
  process.exit(1);
}

const figmaHelper = new FigmaHelper([FIGMA_ACCESSTOKEN]);

function createMcpServer() {
  const mcp = new McpServer(
    { name: "figma-mcp-server", version: "0.0.1" },
    { capabilities: { resources: {}, tools: {} } },
  );

  mcp.tool(
    "get_figma_image",
    {
      description: "Use this tool to retrieve an image from Figma.",
      inputSchema: zodToJsonSchema(GetFigmaImageSchema),
    },
    async (args) => {
      const { fileKey, nodeId } = GetFigmaImageSchema.parse(args);
      const imageUrl = await figmaHelper.getFigmaImage(fileKey, nodeId);
      return {
        content: [{ type: "image", data: imageUrl, mimeType: "image/png" }],
      };
    },
  );

  return mcp.server;
}

async function start() {
  const app = Fastify({ logger: true });

  await app.register(streamableHttp, {
    mcpEndpoint: "/mcp",
    stateful: false,
    createServer: createMcpServer,
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen({ host: "0.0.0.0", port });
  console.log(`✅ MCP server listening on http://0.0.0.0:${port}/mcp`);
}

start().catch((err) => {
  console.error("Error launching server:", err);
  process.exit(1);
});
