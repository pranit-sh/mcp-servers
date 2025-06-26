import { z } from "zod";

export const CreateJiraIssueSchema = z.object({
  fields: z.object({
    project: z
      .object({
        key: z.string().describe("Project key in which to create the issue"),
      })
      .describe("Project identification"),
    summary: z
      .string()
      .min(1)
      .describe("Short, one-line summary of the issue"),
    description: z
      .string()
      .min(1)
      .optional()
      .describe("Detailed description or steps for the issue"),
    issuetype: z
      .object({
        name: z
          .enum(["Task", "Bug", "Story", "Epic"])
          .describe("Type of the issue (e.g. Task, Bug, Story, Epic)"),
      })
      .describe("Issue type"),
    priority: z
      .object({
        name: z
          .enum(["Low", "Medium", "High"])
          .describe("Priority level for the issue"),
      })
      .optional()
      .describe("Issue priority"),
    labels: z
      .array(z.string())
      .optional()
      .describe("Optional tags to attach to the issue"),
    duedate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format")
      .optional()
      .describe("Due date for the issue in YYYY-MM-DD format"),
  }),
});

export const UpdateJiraIssueSchema = z.object({
  issueKey: z
    .string()
    .describe("Key of the issue to update"),
  summary: z
    .string()
    .min(1)
    .describe("Short, one-line summary of the issue to update")
    .optional(),
  description: z
    .string()
    .min(1)
    .describe("Detailed description or steps for the issue to update")
    .optional(),
  priority: z
    .object({
      name: z
        .enum(["Low", "Medium", "High", "Critical"])
        .describe("Priority level for the issue to update"),
    })
    .describe("Issue priority")
    .optional(),
  labels: z
    .array(z.string())
    .optional()
    .describe("Optional tags to attach to the issue to update"),
  duedate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format")
    .optional()
    .describe("Due date for the issue to update in YYYY-MM-DD format"),
});

export const ListTransitionsSchema = z.object({
  issueKey: z
    .string()
    .describe("Key of the issue for which to list transitions"),
});

export const TransitionSchema = z.object({
  id: z
    .string()
    .describe("ID of the transition to perform"),
  issueKey: z
    .string()
    .describe("Key of the issue to transition"),
});

export const CommentSchema = z.object({
  issueKey: z
    .string()
    .describe("Key of the issue to comment on"),
  body: z
    .string()
    .describe("Comment text"),
});

export const IssueDetailsSchema = z.object({
  issueKey: z
    .string()
    .describe("Key of the issue to retrieve details for"),
});

export const SearchIssuesSchema = z.object({
  jql: z
    .string()
    .describe("JQL query to search for issues"),
  maxResults: z
    .number()
    .optional()
    .describe("Maximum number of results to return"),
  startAt: z
    .number()
    .optional()
    .describe("Index of the first issue to return"),
  fields: z
    .array(z.string())
    .optional()
    .describe("List of fields to return for each issue"),
});