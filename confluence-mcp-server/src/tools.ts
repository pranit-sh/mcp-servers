import { z } from "zod";

export const CreateConfluencePageSchema = z.object({
  title: z
    .string()
    .min(1)
    .describe("Title of the new Confluence page"),
  content: z
    .string()
    .min(1)
    .describe("Content of the new Confluence page in Confluence Storage Format (XHTML-based). Use <ac:structured-macro> for code blocks, headings, lists, and rich formatting as needed."),
});

export const UpdateConfluencePageSchema = z.object({
  pageId: z
    .string()
    .describe("ID of the Confluence page to update"),
  title: z
    .string()
    .min(1)
    .describe("Title for the Confluence page"),
  content: z
    .string()
    .min(1)
    .describe("New content for the Confluence page in Confluence Storage Format (XHTML-based). Use <ac:structured-macro> for code blocks, headings, lists, and rich formatting as needed.")
    .optional(),
});

export const GetConfluencePageSchema = z.object({
  pageId: z
    .string()
    .describe("ID of the Confluence page to retrieve"),
});

export const DeleteConfluencePageSchema = z.object({
  pageId: z
    .string()
    .describe("ID of the Confluence page to delete"),
});

export const CommentConfluencePageSchema = z.object({
  pageId: z
    .string()
    .describe("ID of the Confluence page to comment on"),
  content: z
    .string()
    .describe("Comment text to add to the Confluence page in Confluence Storage Format (XHTML-based). Use <ac:structured-macro> for code blocks, headings, lists, and rich formatting as needed."),
});

export const GetCommentsSchema = z.object({
  pageId: z
    .string()
    .describe("ID of the Confluence page to retrieve comments for"),
});

export const DeleteCommentSchema = z.object({
  commentId: z
    .string()
    .describe("ID of the comment to delete"),
});

export const SearchConfluencePagesSchema = z.object({
  query: z
    .string()
    .describe("Confluence Query Language query to find Confluence pages"),
});