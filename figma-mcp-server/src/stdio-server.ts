#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { GetFigmaImageSchema } from "./tools";
import { z } from "zod";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import FigmaHelper from "./helper/figma-helper";

const server = new Server(
  {
    name: "figma-mcp-server",
    version: "0.0.1",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

const { FIGMA_ACCESSTOKEN } = process.env;

if (!FIGMA_ACCESSTOKEN) {
  console.error("Missing required environment variables: FIGMA_ACCESSTOKEN.");
  process.exit(1);
}

const figmaHelper = new FigmaHelper([FIGMA_ACCESSTOKEN]);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_figma_image",
        description: "Use this tool to retrieve an image from Figma.",
        inputSchema: zodToJsonSchema(GetFigmaImageSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "get_figma_image": {
        const { fileKey, nodeId } = GetFigmaImageSchema.parse(
          request.params.arguments,
        );
        const imageUrl = await figmaHelper.getFigmaImage(fileKey, nodeId);
        return {
          content: [{ type: "image", url: imageUrl }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
    }
    throw error;
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer()
  .then(() => {
    console.log("Server is running...");
  })
  .catch((error) => {
    console.error("Error starting server:", error);
    process.exit(1);
  });
