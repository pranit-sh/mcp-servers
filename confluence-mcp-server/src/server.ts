import Fastify from "fastify";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { streamableHttp } from "fastify-mcp";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  CommentConfluencePageSchema,
  CreateConfluencePageSchema,
  DeleteCommentSchema,
  DeleteConfluencePageSchema,
  GetCommentsSchema,
  GetConfluencePageSchema,
  SearchConfluencePagesSchema,
  UpdateConfluencePageSchema,
} from "./tools.js";
import ConfluenceHelper from "./helper/confluence-helper.js";
import dotenv from "dotenv";

dotenv.config();

const {
  CONFLUENCE_BASEURL,
  CONFLUENCE_USERNAME,
  CONFLUENCE_API_TOKEN,
  CONFLUENCE_SPACEKEY,
} = process.env;

if (
  !CONFLUENCE_BASEURL ||
  !CONFLUENCE_USERNAME ||
  !CONFLUENCE_API_TOKEN ||
  !CONFLUENCE_SPACEKEY
) {
  console.error(
    "Please set CONFLUENCE_BASEURL, CONFLUENCE_USERNAME, CONFLUENCE_API_TOKEN and CONFLUENCE_SPACEKEY in your .env file.",
  );
  process.exit(1);
}

const confluenceHelper = new ConfluenceHelper([
  CONFLUENCE_BASEURL,
  CONFLUENCE_SPACEKEY,
  CONFLUENCE_USERNAME,
  CONFLUENCE_API_TOKEN,
] as [string, string, string, string]);

function createMcpServer() {
  const mcp = new McpServer(
    { name: "confluence-mcp-server", version: "0.0.1" },
    { capabilities: { resources: {}, tools: {} } },
  );

  mcp.tool(
    "create_confluence_page",
    {
      description: "Use this tool to create a new page in Confluence.",
      inputSchema: zodToJsonSchema(CreateConfluencePageSchema),
    },
    async (args) => {
      const res = await confluenceHelper.createConfluencePage(
        CreateConfluencePageSchema.parse(args),
      );
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  mcp.tool(
    "update_confluence_page",
    {
      description: "Use this tool to update an existing page in Confluence.",
      inputSchema: zodToJsonSchema(UpdateConfluencePageSchema),
    },
    async (args) => {
      const res = await confluenceHelper.updateConfluencePage(
        UpdateConfluencePageSchema.parse(args),
      );
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  mcp.tool(
    "get_confluence_page",
    {
      description: "Use this tool to retrieve a specific page from Confluence.",
      inputSchema: zodToJsonSchema(GetConfluencePageSchema),
    },
    async (args) => {
      const res = await confluenceHelper.getConfluencePage(
        GetConfluencePageSchema.parse(args),
      );
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  mcp.tool(
    "delete_confluence_page",
    {
      description: "Use this tool to delete a specific page from Confluence.",
      inputSchema: zodToJsonSchema(DeleteConfluencePageSchema),
    },
    async (args) => {
      const res = await confluenceHelper.deleteConfluencePage(
        DeleteConfluencePageSchema.parse(args),
      );
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  mcp.tool(
    "comment_confluence_page",
    {
      description:
        "Use this tool to add a comment on a specific Confluence page.",
      inputSchema: zodToJsonSchema(CommentConfluencePageSchema),
    },
    async (args) => {
      const res = await confluenceHelper.commentConfluencePage(
        CommentConfluencePageSchema.parse(args),
      );
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  mcp.tool(
    "get_comments",
    {
      description:
        "Use this tool to retrieve comments from a specific Confluence page.",
      inputSchema: zodToJsonSchema(GetCommentsSchema),
    },
    async (args) => {
      const res = await confluenceHelper.getComments(
        GetCommentsSchema.parse(args),
      );
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  mcp.tool(
    "delete_comment",
    {
      description:
        "Use this tool to delete a specific comment from a Confluence page.",
      inputSchema: zodToJsonSchema(DeleteCommentSchema),
    },
    async (args) => {
      const res = await confluenceHelper.deleteComment(
        DeleteCommentSchema.parse(args),
      );
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
      };
    },
  );

  mcp.tool(
    "search_confluence_pages",
    {
      description:
        "Use this tool to search for pages in Confluence based on a query.",
      inputSchema: zodToJsonSchema(SearchConfluencePagesSchema),
    },
    async (args) => {
      const res = await confluenceHelper.searchConfluencePages(
        SearchConfluencePagesSchema.parse(args),
      );
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
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
