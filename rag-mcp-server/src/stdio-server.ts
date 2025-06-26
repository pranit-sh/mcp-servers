#!/usr/bin/env node

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getAnyExtractor } from "any-extractor";

import {
  DeleteDocumentsSchema,
  GetRelevantDocumentsSchema,
  IngestConfluencePageSchema,
  IngestFileUrlSchema,
} from "./tools";
import { z } from "zod";
import HanaHelper from "./helper/hana-helper";
import EmbeddingHelper from "./helper/embedding-helper";
import { cleanString } from "./helper/utils";

const server = new Server(
  {
    name: "rag-mcp-server",
    version: "0.0.1",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

const { HANA_ENDPOINT, HANA_USERNAME, HANA_PASSWORD, PROJECTID } = process.env;

if (!HANA_ENDPOINT || !HANA_USERNAME || !HANA_PASSWORD || PROJECTID) {
  console.error(
    "Missing required environment variables: HANA_ENDPOINT, HANA_USERNAME, HANA_PASSWORD and PROJECTID.",
  );
  process.exit(1);
}

const hanaHelper = new HanaHelper([
  HANA_ENDPOINT,
  HANA_USERNAME,
  HANA_PASSWORD,
  PROJECTID,
] as [string, string, string, string]);
const embeddingHelper = new EmbeddingHelper();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "fetch_relevant_documents",
      description: "Fetch relevant information from ingested documents.",
      inputSchema: zodToJsonSchema(GetRelevantDocumentsSchema),
    },
    {
      name: "list_ingested_documents",
      description: "List file IDs of all ingested documents.",
    },
    {
      name: "ingest_file_url",
      description: "Ingest a file into the system using its URL.",
      inputSchema: zodToJsonSchema(IngestFileUrlSchema),
    },
    {
      name: "delete_document",
      description: "Delete a document from the system.",
      inputSchema: zodToJsonSchema(DeleteDocumentsSchema),
    },
    {
      name: "ingest_confluence_page",
      description: "Ingest content of a confluence page into the system.",
      inputSchema: zodToJsonSchema(IngestConfluencePageSchema),
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    switch (name) {
      case "fetch_relevant_documents": {
        const { query } = GetRelevantDocumentsSchema.parse(args);
        const embedding = (await embeddingHelper.embedData(query)) as number[];
        const relevantDocuments =
          await hanaHelper.getSimilarDocuments(embedding);
        return {
          content: [
            { type: "text", text: JSON.stringify(relevantDocuments, null, 2) },
          ],
        };
      }

      case "list_ingested_documents": {
        const documents = await hanaHelper.getIngestedFiles();
        return {
          content: [
            { type: "text", text: `Documents: ${JSON.stringify(documents)}` },
          ],
        };
      }

      case "ingest_file_url": {
        const { data, auth } = IngestFileUrlSchema.parse(args);
        const anyExtractor = getAnyExtractor();
        const chunker = new RecursiveCharacterTextSplitter({
          chunkSize: 1500,
          chunkOverlap: 200,
        });

        const basicAuth = auth
          ? Buffer.from(`${auth.username}:${auth.password}`).toString("base64")
          : null;
        const textContent = await anyExtractor.parseFile(data, basicAuth);
        const chunks = await chunker.splitText(cleanString(textContent));
        const vectors = (await embeddingHelper.embedData(chunks)) as number[][];
        const dataToInsert = chunks.map((chunk, index) => ({
          fileId: data,
          pageContent: chunk,
          metadata: { source: data, chunkIndex: index },
          vector: vectors[index],
        }));

        await hanaHelper.insertChunks(dataToInsert);
        await hanaHelper.insertMeta(data, dataToInsert.length);
        return {
          content: [
            { type: "text", text: `File ${data} ingested successfully.` },
          ],
        };
      }

      case "ingest_confluence_page": {
        const { baseurl, pageId, auth } =
          IngestConfluencePageSchema.parse(args);
        const anyExtractor = getAnyExtractor({
          confluence: {
            baseUrl: baseurl,
            email: auth.username,
            apiKey: auth.password,
          },
        });
        const chunker = new RecursiveCharacterTextSplitter({
          chunkSize: 1500,
          chunkOverlap: 200,
        });

        const textContent = await anyExtractor.parseConfluenceDoc(pageId);
        const chunks = await chunker.splitText(cleanString(textContent));
        const vectors = (await embeddingHelper.embedData(chunks)) as number[][];
        const dataToInsert = chunks.map((chunk, index) => ({
          fileId: pageId,
          pageContent: chunk,
          metadata: { source: pageId, chunkIndex: index },
          vector: vectors[index],
        }));

        await hanaHelper.insertChunks(dataToInsert);
        await hanaHelper.insertMeta(pageId, dataToInsert.length);
        return {
          content: [
            {
              type: "text",
              text: `Confluence page ${pageId} ingested successfully.`,
            },
          ],
        };
      }

      case "delete_document": {
        const { fileIds } = DeleteDocumentsSchema.parse(args);
        await Promise.all(
          fileIds.map(async (fileId) => {
            await hanaHelper.deleteDocument(fileId);
            await hanaHelper.deleteMeta(fileId);
          }),
        );
        return {
          content: [
            {
              type: "text",
              text: `Deleted documents with file IDs: ${JSON.stringify(fileIds)}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid input: ${JSON.stringify(error.errors, null, 2)}`,
      );
    }
    throw error;
  }
});

// Start the server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Server is running and connected to the transport.");
}

runServer().catch((error) => {
  console.error("Error starting the server:", error);
  process.exit(1);
});
