import { z } from "zod";

export const GetRelevantDocumentsSchema = z.object({
  query: z
    .string()
    .describe("Query to search in documents."),
});

export const DeleteDocumentsSchema = z.object({
  fileIds: z
    .array(z.string())
    .describe("Array of File Ids of the documents to delete."),
});

export const IngestFileUrlSchema = z.object({
  data: z
    .string()
    .describe("File URL to ingest."),
  auth: z
    .object({
      username: z.string().describe("Username for basic authentication"),
      password: z.string().describe("Password for basic authentication"),
    })
    .describe("Optional authentication details for the URL, if required.")
    .optional(),
  name: z
    .string()
    .describe("Name of the document to ingest.")
    .optional(),
});

export const IngestConfluencePageSchema = z.object({
  baseurl: z
    .string()
    .describe("Confluence base URL."),
  pageId: z
    .string()
    .describe("ID of the Confluence page to ingest."),
  auth: z
    .object({
      username: z.string().describe("Username for basic authentication"),
      password: z.string().describe("Password for basic authentication"),
    })
    .describe("Optional authentication details for the URL, if required.")
});