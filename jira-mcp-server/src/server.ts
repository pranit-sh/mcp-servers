import Fastify from "fastify";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { streamableHttp } from "fastify-mcp";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  CommentSchema,
  CreateJiraIssueSchema,
  IssueDetailsSchema,
  ListTransitionsSchema,
  SearchIssuesSchema,
  TransitionSchema,
  UpdateJiraIssueSchema
} from "./tools";
import JiraHelper from "./helper/jira-helper";
import dotenv from "dotenv";

dotenv.config();

const { JIRA_BASEURL, JIRA_USERNAME, JIRA_API_TOKEN } = process.env;
if (!JIRA_BASEURL || !JIRA_USERNAME || !JIRA_API_TOKEN) {
  console.error("Please set JIRA_BASEURL, JIRA_USERNAME, and JIRA_API_TOKEN in your .env file.");
  process.exit(1);
}

const jiraHelper = new JiraHelper([
  JIRA_BASEURL,
  JIRA_USERNAME,
  JIRA_API_TOKEN,
] as [string, string, string]);


function createMcpServer() {
  const mcp = new McpServer(
    { name: "jira-mcp-server", version: "0.0.1" },
    { capabilities: { resources: {}, tools: {} } }
  );

  mcp.tool("create_jira_issue", {
    description: "Create a new Jira issue",
    inputSchema: zodToJsonSchema(CreateJiraIssueSchema)
  }, async (args) => {
    const res = await jiraHelper.createJiraIssue(CreateJiraIssueSchema.parse(args));
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });
  
  mcp.tool("update_jira_issue", {
    description: "Update an existing Jira issue",
    inputSchema: zodToJsonSchema(UpdateJiraIssueSchema)
  }, async (args) => {
    const res = await jiraHelper.updateJiraIssue(UpdateJiraIssueSchema.parse(args));
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });
  
  mcp.tool("get_jira_issue", {
    description: "Retrieve details for a Jira issue",
    inputSchema: zodToJsonSchema(IssueDetailsSchema)
  }, async (args) => {
    const res = await jiraHelper.getJiraIssue(IssueDetailsSchema.parse(args));
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });
  
  mcp.tool("list_transitions", {
    description: "List possible Jira transitions for an issue",
    inputSchema: zodToJsonSchema(ListTransitionsSchema)
  }, async (args) => {
    const res = await jiraHelper.listTransitions(ListTransitionsSchema.parse(args));
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });
  
  mcp.tool("transition_issue", {
    description: "Transition a Jira issue to a new status",
    inputSchema: zodToJsonSchema(TransitionSchema)
  }, async (args) => {
    const res = await jiraHelper.transitionIssue(TransitionSchema.parse(args));
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });
  
  mcp.tool("comment_issue", {
    description: "Add a comment to a Jira issue",
    inputSchema: zodToJsonSchema(CommentSchema)
  }, async (args) => {
    const res = await jiraHelper.addComment(CommentSchema.parse(args));
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });
  
  mcp.tool("search_issues", {
    description: "Search Jira issues using JQL",
    inputSchema: zodToJsonSchema(SearchIssuesSchema)
  }, async (args) => {
    const res = await jiraHelper.searchIssues(SearchIssuesSchema.parse(args));
    return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  });

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


start().catch(err => {
  console.error("Error launching server:", err);
  process.exit(1);
});
