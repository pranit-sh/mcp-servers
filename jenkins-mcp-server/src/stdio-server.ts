#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  GetBuildStageStepLogsSchema,
  GetBuildStageStepsSchema,
  GetLastBuildInfoSchema,
  TriggerPRBuildSchema,
} from "./tools";
import JenkinsHelper from "../helper/jenkins-helper";

const server = new Server(
  {
    name: "jenkins-mcp-server",
    version: "0.0.1",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

const { JENKINS_BASEURL, PIPELINE_NAME } = process.env;

if (!JENKINS_BASEURL || !PIPELINE_NAME) {
  console.error(
    "Missing required environment variables: JENKINS_BASEURL, PIPELINE_NAME.",
  );
  process.exit(1);
}

const jenkinsHelper = new JenkinsHelper([JENKINS_BASEURL, PIPELINE_NAME]);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_lastbuild_info",
        description:
          "Use this tool to get information about last build of a job in jenkins.",
        inputSchema: zodToJsonSchema(GetLastBuildInfoSchema),
      },
      {
        name: "get_buildstage_steps",
        description:
          "Use this tool to get information about steps of a build stage of a job in jenkins.",
        inputSchema: zodToJsonSchema(GetBuildStageStepsSchema),
      },
      {
        name: "get_buildstagestep_logs",
        description:
          "Use this tool to get logs for a step of build stage of a job in jenkins.",
        inputSchema: zodToJsonSchema(GetBuildStageStepLogsSchema),
      },
      {
        name: "trigger_pr_build",
        description: "Use this tool to trigger a build for a job in jenkins.",
        inputSchema: zodToJsonSchema(TriggerPRBuildSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "get_lastbuild_info": {
        const parsedArgs = GetLastBuildInfoSchema.parse(
          request.params.arguments,
        );
        const operationResult = await jenkinsHelper.getLastBuildInfo(
          parsedArgs.multibranchJobIdentifier,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(operationResult) }],
        };
      }

      case "get_buildstage_steps": {
        const parsedArgs = GetBuildStageStepsSchema.parse(
          request.params.arguments,
        );
        const operationResult = await jenkinsHelper.getBuildStageSteps(
          parsedArgs.multibranchJobIdentifier,
          parsedArgs.buildId,
          parsedArgs.stageId,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(operationResult) }],
        };
      }

      case "get_buildstagestep_logs": {
        const parsedArgs = GetBuildStageStepLogsSchema.parse(
          request.params.arguments,
        );
        const operationResult = await jenkinsHelper.getBuildStageStepLogs(
          parsedArgs.multibranchJobIdentifier,
          parsedArgs.buildId,
          parsedArgs.stepId,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(operationResult) }],
        };
      }

      case "trigger_pr_build": {
        const parsedArgs = TriggerPRBuildSchema.parse(request.params.arguments);
        const operationResult = await jenkinsHelper.triggerBuild(
          parsedArgs.multibranchJobIdentifier,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(operationResult) }],
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
