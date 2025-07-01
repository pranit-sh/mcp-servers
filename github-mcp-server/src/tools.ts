import { z } from "zod";

export const SearchPullRequestsSchema = z.object({
  author: z
    .string()
    .describe("GitHub username of the person who created the pull request.")
    .optional(),

  assignee: z
    .string()
    .describe("GitHub username of the person assigned to the pull request.")
    .optional(),

  mentions: z
    .string()
    .describe(
      "GitHub username mentioned in the pull request (e.g., in body or title).",
    )
    .optional(),

  labels: z
    .array(z.string())
    .describe("A list of label names the pull request must have.")
    .optional(),

  states: z
    .array(z.enum(["OPEN", "CLOSED", "MERGED"]))
    .describe("List of pull request states to include in the result.")
    .optional(),

  created_after: z
    .string()
    .describe(
      "Only include PRs created after this date. Format must be an ISO date string, like '2025-06-01'.",
    )
    .optional(),

  created_before: z
    .string()
    .describe(
      "Only include PRs created before this date. Format must be an ISO date string, like '2025-06-28'. Can be inferred from date ranges in user requests.",
    )
    .optional(),

  updated_after: z
    .string()
    .describe(
      "Only include PRs updated after this date. Format must be ISO string, e.g. '2025-06-20'. Useful for filtering recently modified PRs.",
    )
    .optional(),

  updated_before: z
    .string()
    .describe(
      "Only include PRs updated before this date. Format must be ISO string, e.g. '2025-06-25'.",
    )
    .optional(),

  search_keywords: z
    .string()
    .describe("Free text keywords to search in PR title or body.")
    .optional(),

  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Maximum number of pull requests to return."),

  after: z
    .string()
    .optional()
    .describe(
      "Cursor for pagination. Pass the 'endCursor' from previous result.",
    ),
});

export const GetPRDetailsSchema = z.object({
  number: z.number().describe("The number that identifies the pull request."),
});

export const GetPRCommentsSchema = z.object({
  number: z.number().describe("The number that identifies the pull request."),
});

export const GetPRDifferenceSchema = z.object({
  number: z.number().describe("The number that identifies the pull request."),
});

export const CreatePRSchema = z.object({
  head: z.string().describe("The name of the head branch to merge."),

  base: z
    .string()
    .describe("The name of the base branch to merge pull request into."),

  title: z
    .string()
    .describe("A brief title that describes the purpose of the pull request."),

  body: z
    .string()
    .describe("Detailed description of the pull request.")
    .optional(),

  reviewers: z
    .array(z.string())
    .describe("A list of GitHub usernames to request reviews from.")
    .optional(),

  draft: z
    .boolean()
    .describe(
      "Indicates whether the pull request is a draft. Default is false.",
    )
    .optional(),

  assignees: z
    .array(z.string())
    .describe("A list of GitHub usernames to assign to the pull request.")
    .optional(),

  labels: z
    .array(z.string())
    .describe("A list of labels to associate with the pull request.")
    .optional(),
});

export const UpdatePRSchema = z.object({
  number: z
    .number()
    .describe("The number that identifies the pull request to update."),

  title: z.string().describe("The new title for the pull request.").optional(),

  body: z
    .string()
    .describe("The new body/description for the pull request.")
    .optional(),

  state: z
    .enum(["OPEN", "CLOSED"])
    .describe(
      "The new state for the pull request. Use 'CLOSED' to close the PR, 'OPEN' to reopen.",
    )
    .optional(),

  base: z
    .string()
    .describe("The new base branch to merge the pull request into.")
    .optional(),

  assignees: z
    .array(z.string())
    .describe("A new list of GitHub usernames to assign to the pull request.")
    .optional(),

  labels: z
    .array(z.string())
    .describe("A new list of labels to associate with the pull request.")
    .optional(),

  reviewers: z
    .array(z.string())
    .describe("A new list of GitHub usernames to request reviews from.")
    .optional(),
});

export const GetCommitHistorySchema = z.object({
  branch: z.string().default("main").describe("Branch name"),

  limit: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe("Number of commits to fetch per page."),

  after: z
    .string()
    .optional()
    .describe(
      "Cursor for pagination. Pass the 'endCursor' from previous result.",
    ),
});

export const GetFileCommitHistorySchema = z.object({
  filePath: z.string().describe("Path to the file in the repository."),
  branch: z.string().default("main").describe("Branch name"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe("Number of commits to fetch per page."),

  page: z.number().min(1).default(1).describe("Page number for pagination."),
});

export const GetCommitDetailsSchema = z.object({
  sha: z.string().describe("The SHA of the commit to retrieve."),
});

export const GetCommitChecksSchema = z.object({
  sha: z.string().describe("The SHA of the commit.."),
});
