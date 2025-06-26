#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
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

const server = new Server(
  {
    name: "confluence-mcp-server",
    version: "0.0.1",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

const {
  CONFLUENCE_BASEURL,
  CONFLUENCE_USERNAME,
  CONFLUENCE_APITOKEN,
  CONFLUENCE_SPACEKEY,
} = process.env;

if (
  !CONFLUENCE_BASEURL ||
  !CONFLUENCE_USERNAME ||
  !CONFLUENCE_APITOKEN ||
  !CONFLUENCE_SPACEKEY
) {
  console.error(
    "Please set CONFLUENCE_BASEURL, CONFLUENCE_USERNAME, CONFLUENCE_APITOKEN and CONFLUENCE_SPACEKEY in your .env file.",
  );
  process.exit(1);
}

const confluenceHelper = new ConfluenceHelper([
  CONFLUENCE_BASEURL,
  CONFLUENCE_SPACEKEY,
  CONFLUENCE_USERNAME,
  CONFLUENCE_APITOKEN,
] as [string, string, string, string]);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_confluence_page",
        description: "Use this tool to create a new page in Confluence.",
        inputSchema: zodToJsonSchema(CreateConfluencePageSchema),
      },
      {
        name: "update_confluence_page",
        description: "Use this tool to update an existing page in Confluence.",
        inputSchema: zodToJsonSchema(UpdateConfluencePageSchema),
      },
      {
        name: "get_confluence_page",
        description:
          "Use this tool to retrieve a specific page from Confluence.",
        inputSchema: zodToJsonSchema(GetConfluencePageSchema),
      },
      {
        name: "delete_confluence_page",
        description: "Use this tool to delete a specific page from Confluence.",
        inputSchema: zodToJsonSchema(DeleteConfluencePageSchema),
      },
      {
        name: "comment_confluence_page",
        description:
          "Use this tool to add a comment on a specific Confluence page.",
        inputSchema: zodToJsonSchema(CommentConfluencePageSchema),
      },
      {
        name: "get_comments",
        description:
          "Use this tool to retrieve comments from a specific Confluence page.",
        inputSchema: zodToJsonSchema(GetCommentsSchema),
      },
      {
        name: "delete_comment",
        description:
          "Use this tool to delete a specific comment from a Confluence page.",
        inputSchema: zodToJsonSchema(DeleteCommentSchema),
      },
      {
        name: "search_confluence_pages",
        description:
          "Use this tool to search for pages in Confluence based on a query.",
        inputSchema: zodToJsonSchema(SearchConfluencePagesSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "create_confluence_page": {
        const createPageArgs = CreateConfluencePageSchema.parse(
          request.params.arguments,
        );
        const createResult =
          await confluenceHelper.createConfluencePage(createPageArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(createResult, null, 2) },
          ],
        };
      }

      case "update_confluence_page": {
        const updatePageArgs = UpdateConfluencePageSchema.parse(
          request.params.arguments,
        );
        const updateResult =
          await confluenceHelper.updateConfluencePage(updatePageArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(updateResult, null, 2) },
          ],
        };
      }

      case "get_confluence_page": {
        const getPageArgs = GetConfluencePageSchema.parse(
          request.params.arguments,
        );
        const page = await confluenceHelper.getConfluencePage(getPageArgs);
        return {
          content: [{ type: "text", text: JSON.stringify(page, null, 2) }],
        };
      }

      case "delete_confluence_page": {
        const deletePageArgs = DeleteConfluencePageSchema.parse(
          request.params.arguments,
        );
        const deleteResult =
          await confluenceHelper.deleteConfluencePage(deletePageArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(deleteResult, null, 2) },
          ],
        };
      }

      case "comment_confluence_page": {
        const commentArgs = CommentConfluencePageSchema.parse(
          request.params.arguments,
        );
        const commentResult =
          await confluenceHelper.commentConfluencePage(commentArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(commentResult, null, 2) },
          ],
        };
      }

      case "get_comments": {
        const getCommentsArgs = GetCommentsSchema.parse(
          request.params.arguments,
        );
        const comments = await confluenceHelper.getComments(getCommentsArgs);
        return {
          content: [{ type: "text", text: JSON.stringify(comments, null, 2) }],
        };
      }

      case "delete_comment": {
        const deleteCommentArgs = DeleteCommentSchema.parse(
          request.params.arguments,
        );
        const deleteCommentResult =
          await confluenceHelper.deleteComment(deleteCommentArgs);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(deleteCommentResult, null, 2),
            },
          ],
        };
      }

      case "search_confluence_pages": {
        const searchArgs = SearchConfluencePagesSchema.parse(
          request.params.arguments,
        );
        const searchResults =
          await confluenceHelper.searchConfluencePages(searchArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(searchResults, null, 2) },
          ],
        };
      }

      default:
        throw new Error(`Tool ${request.params.name} is not implemented.`);
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
