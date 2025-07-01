#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  CreatePRSchema,
  GetCommitChecksSchema,
  GetCommitDetailsSchema,
  GetCommitHistorySchema,
  GetFileCommitHistorySchema,
  GetPRCommentsSchema,
  GetPRDetailsSchema,
  GetPRDifferenceSchema,
  SearchPullRequestsSchema,
  UpdatePRSchema,
} from "./tools";
import GithubHelper from "./helper/github-helper";
import { z } from "zod";

const server = new Server(
  {
    name: "github-mcp-server",
    version: "0.0.1",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

const { OWNER, REPO, GITHUB_PAT } = process.env;

if (!OWNER || !REPO || !GITHUB_PAT) {
  console.error(
    "Missing required environment variables: OWNER, REPO, GITHUB_PAT",
  );
  process.exit(1);
}

const githubHelper = new GithubHelper([OWNER, REPO, GITHUB_PAT]);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_pull_requests",
        description: `Use this tool to search GitHub pull requests with flexible filters such as author, state, labels, date ranges, keywords, and more. Supports queries like "my open PRs", "PRs assigned to Alice", or "merged PRs this month".`,
        inputSchema: zodToJsonSchema(SearchPullRequestsSchema),
      },
      {
        name: "get_pr_details",
        description: "Use this tool to get details of a github pull request.",
        inputSchema: zodToJsonSchema(GetPRDetailsSchema),
      },
      {
        name: "get_pr_comments",
        description:
          "Use this tool to get comments made on github pull request.",
        inputSchema: zodToJsonSchema(GetPRDetailsSchema),
      },
      {
        name: "get_pr_file_changes",
        description:
          "Use this tool to get the file changes of a github pull request.",
        inputSchema: zodToJsonSchema(GetPRDetailsSchema),
      },
      {
        name: "create_pr",
        description: "Use this tool to create a pull request.",
        inputSchema: zodToJsonSchema(CreatePRSchema),
      },
      {
        name: "update_pr",
        description:
          "Use this tool to update a pull request, adding labels, assignees or reviewers.",
        inputSchema: zodToJsonSchema(UpdatePRSchema),
      },
      {
        name: "get_commit_history",
        description: "Use this tool to get commit history for a branch.",
        inputSchema: zodToJsonSchema(GetCommitHistorySchema),
      },
      {
        name: "get_file_commit_history",
        description: "Use this tool to get commit history for a file.",
        inputSchema: zodToJsonSchema(GetFileCommitHistorySchema),
      },
      {
        name: "get_commit_details",
        description: "Use this tool to get commit details from commit hash.",
        inputSchema: zodToJsonSchema(GetCommitDetailsSchema),
      },
      {
        name: "get_commit_checks",
        description: "Use this tool to get checks details for a commit.",
        inputSchema: zodToJsonSchema(GetCommitChecksSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "search_pull_requests": {
        const parsedArgs = SearchPullRequestsSchema.parse(
          request.params.arguments,
        );
        const operationResult =
          await githubHelper.searchPullRequests(parsedArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(operationResult, null, 2) },
          ],
        };
      }

      case "get_pr_details": {
        const parsedArgs = GetPRDetailsSchema.parse(request.params.arguments);
        const operationResult = await githubHelper.getPRDetails(parsedArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(operationResult, null, 2) },
          ],
        };
      }

      case "get_pr_comments": {
        const parsedArgs = GetPRCommentsSchema.parse(request.params.arguments);
        const operationResult = await githubHelper.getPRComments(parsedArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(operationResult, null, 2) },
          ],
        };
      }

      case "get_pr_file_changes": {
        const parsedArgs = GetPRDifferenceSchema.parse(
          request.params.arguments,
        );
        const operationResult = await githubHelper.getPRDifference(parsedArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(operationResult, null, 2) },
          ],
        };
      }

      case "create_pr": {
        const parsedArgs = CreatePRSchema.parse(request.params.arguments);
        const operationResult =
          await githubHelper.createPullRequest(parsedArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(operationResult, null, 2) },
          ],
        };
      }

      case "update_pr": {
        const parsedArgs = UpdatePRSchema.parse(request.params.arguments);
        const operationResult =
          await githubHelper.updatePullRequest(parsedArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(operationResult, null, 2) },
          ],
        };
      }

      case "get_commit_history": {
        const parsedArgs = GetCommitHistorySchema.parse(
          request.params.arguments,
        );
        const operationResult = await githubHelper.getCommitHistory(parsedArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(operationResult, null, 2) },
          ],
        };
      }

      case "get_file_commit_history": {
        const parsedArgs = GetFileCommitHistorySchema.parse(
          request.params.arguments,
        );
        const operationResult =
          await githubHelper.getFileCommitHistory(parsedArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(operationResult, null, 2) },
          ],
        };
      }

      case "get_commit_details": {
        const parsedArgs = GetCommitDetailsSchema.parse(
          request.params.arguments,
        );
        const operationResult = await githubHelper.getCommitDetails(parsedArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(operationResult, null, 2) },
          ],
        };
      }

      case "get_commit_checks": {
        const parsedArgs = GetCommitChecksSchema.parse(
          request.params.arguments,
        );
        const operationResult = await githubHelper.getCommitChecks(parsedArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(operationResult, null, 2) },
          ],
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
