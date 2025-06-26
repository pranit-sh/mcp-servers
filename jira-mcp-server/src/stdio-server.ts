#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CommentSchema,
  CreateJiraIssueSchema,
  IssueDetailsSchema,
  ListTransitionsSchema,
  SearchIssuesSchema,
  TransitionSchema,
  UpdateJiraIssueSchema,
} from "./tools";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import JiraHelper from "./helper/jira-helper";

const server = new Server(
  {
    name: "jira-mcp-server",
    version: "0.0.1",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

const { JIRA_BASEURL, JIRA_USERNAME, JIRA_APITOKEN } = process.env;

if (!JIRA_BASEURL || !JIRA_USERNAME || !JIRA_APITOKEN) {
  console.error(
    "Missing required environment variables: JIRA_BASEURL, JIRA_USERNAME, JIRA_APITOKEN.",
  );
  process.exit(1);
}

const jiraHelper = new JiraHelper([JIRA_BASEURL, JIRA_USERNAME, JIRA_APITOKEN]);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_jira_issue",
        description:
          "Use this tool to create a new issue in Jira when a task, bug, or feature needs to be tracked.",
        inputSchema: zodToJsonSchema(CreateJiraIssueSchema),
      },
      {
        name: "list_transitions",
        description:
          "Use this to retrieve all available transitions status details (name and id) for a given Jira issue.",
        inputSchema: zodToJsonSchema(ListTransitionsSchema),
      },
      {
        name: "transition_issue",
        description:
          "Use this to move a Jira issue to a new status, such as from 'In Progress' to 'Done'.",
        inputSchema: zodToJsonSchema(TransitionSchema),
      },
      {
        name: "update_jira_issue",
        description:
          "Use this to update fields on an existing Jira issue, like title, description, or priority.",
        inputSchema: zodToJsonSchema(UpdateJiraIssueSchema),
      },
      {
        name: "comment_issue",
        description: "Use this to add a comment to a Jira issue.",
        inputSchema: zodToJsonSchema(CommentSchema),
      },
      {
        name: "get_jira_issue",
        description:
          "Use this to retrieve full details of a specific Jira issue by its key.",
        inputSchema: zodToJsonSchema(IssueDetailsSchema),
      },
      {
        name: "search_issues",
        description:
          "Use this to search for Jira issues using JQL (Jira Query Language) based on custom criteria.",
        inputSchema: zodToJsonSchema(SearchIssuesSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "create_jira_issue":
        const parsedArgs = CreateJiraIssueSchema.parse(
          request.params.arguments,
        );
        const operationResult = await jiraHelper.createJiraIssue(parsedArgs);
        return {
          content: [
            { type: "text", text: JSON.stringify(operationResult, null, 2) },
          ],
        };

      case "update_jira_issue":
        const parsedUpdateArgs = UpdateJiraIssueSchema.parse(
          request.params.arguments,
        );
        const updateOperationResult =
          await jiraHelper.updateJiraIssue(parsedUpdateArgs);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(updateOperationResult, null, 2),
            },
          ],
        };

      case "get_jira_issue":
        const parsedIssueArgs = IssueDetailsSchema.parse(
          request.params.arguments,
        );
        const issueOperationResult =
          await jiraHelper.getJiraIssue(parsedIssueArgs);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(issueOperationResult, null, 2),
            },
          ],
        };

      case "list_transitions":
        const parsedListArgs = ListTransitionsSchema.parse(
          request.params.arguments,
        );
        const listOperationResult =
          await jiraHelper.listTransitions(parsedListArgs);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(listOperationResult, null, 2),
            },
          ],
        };

      case "transition_issue":
        const parsedTransitionArgs = TransitionSchema.parse(
          request.params.arguments,
        );
        const transitionOperationResult =
          await jiraHelper.transitionIssue(parsedTransitionArgs);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(transitionOperationResult, null, 2),
            },
          ],
        };

      case "comment_issue":
        const parsedCommentArgs = CommentSchema.parse(request.params.arguments);
        const commentOperationResult =
          await jiraHelper.addComment(parsedCommentArgs);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(commentOperationResult, null, 2),
            },
          ],
        };

      case "search_issues":
        const parsedSearchArgs = SearchIssuesSchema.parse(
          request.params.arguments,
        );
        const searchOperationResult =
          await jiraHelper.searchIssues(parsedSearchArgs);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(searchOperationResult, null, 2),
            },
          ],
        };

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
