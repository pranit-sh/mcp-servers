import Fastify from "fastify";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { streamableHttp } from "fastify-mcp";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getAnyExtractor } from "any-extractor";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {
  DeleteDocumentsSchema,
  GetRelevantDocumentsSchema,
  IngestConfluencePageSchema,
  IngestFileUrlSchema,
} from "./tools";
import HanaHelper from "./helper/hana-helper";
import EmbeddingHelper from "./helper/embedding-helper";
import { cleanString } from "./helper/utils";
import dotenv from "dotenv";

dotenv.config();

const { HANA_ENDPOINT, HANA_USERNAME, HANA_PASSWORD, PROJECTID } = process.env;

if (!HANA_ENDPOINT || !HANA_USERNAME || !HANA_PASSWORD || !PROJECTID) {
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

function createMcpServer() {
  const mcp = new McpServer(
    { name: "rag-mcp-server", version: "0.0.1" },
    { capabilities: { resources: {}, tools: {} } },
  );

  mcp.tool(
    "fetch_relevant_documents",
    {
      description: "Fetch relevant information from ingested documents.",
      inputSchema: zodToJsonSchema(GetRelevantDocumentsSchema),
    },
    async (args) => {
      const { query } = GetRelevantDocumentsSchema.parse(args);
      const embedding = (await embeddingHelper.embedData(query)) as number[];
      const relevantDocuments = await hanaHelper.getSimilarDocuments(embedding);
      return {
        content: [
          { type: "text", text: JSON.stringify(relevantDocuments, null, 2) },
        ],
      };
    },
  );

  mcp.tool(
    "list_ingested_documents",
    {
      description: "List file IDs of all ingested documents.",
    },
    async () => {
      const documents = await hanaHelper.getIngestedFiles();
      return {
        content: [
          { type: "text", text: `Documents: ${JSON.stringify(documents)}` },
        ],
      };
    },
  );

  mcp.tool(
    "ingest_file_url",
    {
      description: "Ingest a file into the system using its URL.",
      inputSchema: zodToJsonSchema(IngestFileUrlSchema),
    },
    async (args) => {
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
    },
  );

  mcp.tool(
    "ingest_confluence_page",
    {
      description: "Ingest a Confluence page into the system.",
      inputSchema: zodToJsonSchema(IngestConfluencePageSchema),
    },
    async (args) => {
      const { baseurl, pageId, auth } = IngestConfluencePageSchema.parse(args);
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
    },
  );

  mcp.tool(
    "delete_document",
    {
      description: "Delete a document from the system.",
      inputSchema: zodToJsonSchema(DeleteDocumentsSchema),
    },
    async (args) => {
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
