import { z } from "zod";
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
} from "../tools";
import axios from "axios";
import { GET_PR_DETAILS } from "../graphql/getPRDetails";
import { GET_ALL_PR_COMMENTS } from "../graphql/getAllPRComments";
import { SEARCH_PR_QUERY } from "../graphql/searchPRs";
import { GET_COMMIT_HISTORY } from "../graphql/getCommitHistory";

class GithubHelper {
  private owner: string;
  private repo: string;
  private pat: string;

  private GITHUB_API = "https://github.tools.sap/api/graphql";

  constructor(args: [string, string, string]) {
    [this.owner, this.repo, this.pat] = args;
  }

  async searchPullRequests(body: z.infer<typeof SearchPullRequestsSchema>) {
    try {
      const query = this.buildSearchQuery(body);
      const limit = body.limit ?? 10;
      const after = body.after ?? null;

      const response = await axios.post(
        "https://github.tools.sap/api/graphql",
        {
          query: SEARCH_PR_QUERY,
          variables: {
            query,
            limit,
            after,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.pat}`,
            Accept: "application/json",
          },
        },
      );

      const prs = response.data.data.search.nodes;

      return prs.map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        url: pr.url,
        state: pr.state,
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
        author: pr.author?.login ?? null,
      }));
    } catch (error) {
      const typedError = error as any;
      console.error("Error searching PRs:", typedError);
      const operationResult = typedError.response
        ? typedError.response.data
        : typedError.message;
      return operationResult;
    }
  }

  async getPRDetails(body: z.infer<typeof GetPRDetailsSchema>) {
    try {
      const response = await axios.post(
        this.GITHUB_API,
        {
          query: GET_PR_DETAILS,
          variables: {
            owner: this.owner,
            name: this.repo,
            number: body.number,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.pat}`,
            Accept: "application/json",
          },
        },
      );

      const pr = response.data.data.repository.pullRequest;
      const operationResult = {
        prNumber: pr.number,
        title: pr.title,
        body: pr.body,
        url: pr.url,
        state: pr.state,
        locked: pr.locked,
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
        closedAt: pr.closedAt,
        mergedAt: pr.mergedAt,
        merged: pr.merged,
        mergeable: pr.mergeable,
        mergeStateStatus: pr.mergeStateStatus,
        commentCount: pr.comments?.totalCount ?? 0,
        reviewThreadCount: pr.reviewThreads?.totalCount ?? 0,
        assignees: pr.assignees?.nodes?.map((a) => a.login) ?? [],
        author: pr.author?.login ?? null,
        requestedReviewers:
          pr.reviewRequests?.nodes
            ?.map((node) => node.requestedReviewer?.login)
            ?.filter(Boolean) ?? [],
        commitCount: pr.commits?.totalCount ?? 0,
        lastestCommit: pr.commits?.nodes?.[0]?.commit,
        additions: pr.additions,
        deletions: pr.deletions,
        changedFiles: pr.changedFiles,
        baseRefName: pr.baseRefName,
        headRefName: pr.headRefName,
        mergedBy: pr.mergedBy?.login ?? null,
      };

      return operationResult;
    } catch (error) {
      const typedError = error as any;
      console.error("Error fetching PR details:", typedError);
      const operationResult = typedError.response
        ? typedError.response.data
        : typedError.message;
      return operationResult;
    }
  }

  async getPRComments(body: z.infer<typeof GetPRCommentsSchema>) {
    const response = await axios.post(
      this.GITHUB_API,
      {
        query: GET_ALL_PR_COMMENTS,
        variables: {
          owner: this.owner,
          name: this.repo,
          number: body.number,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.pat}`,
          Accept: "application/json",
        },
      },
    );

    const pr = response.data.data.repository.pullRequest;
    const issue = response.data.data.repository.issue;
    const latestCommit = pr.commits.nodes?.[0]?.commit ?? null;

    const reviewCommentData = pr.reviewThreads.nodes
      .filter(
        (thread) =>
          !thread.isResolved &&
          !thread.isOutdated &&
          thread.commit.oid === latestCommit,
      )
      .flatMap((thread) =>
        thread.comments.nodes.map((comment) => ({
          body: comment.body,
          user: comment.author?.login,
          diff_hunk: comment.diffHunk,
          path: comment.path,
          created_at: comment.createdAt,
        })),
      );

    const commentData = issue.comments.nodes.map((comment) => ({
      body: comment.body,
      user: comment.author?.login,
      created_at: comment.createdAt,
    }));

    const reviewData = pr.reviews.nodes.map((review) => ({
      body: review.body,
      user: review.author?.login,
      state: review.state,
      submitted_at: review.submittedAt,
      commit: review.commit?.oid ?? null,
    }));

    return {
      reviewCommentData,
      commentData,
      reviewData,
    };
  }

  async getPRDifference(body: z.infer<typeof GetPRDifferenceSchema>) {
    const apiUrl = `https://github.tools.sap/${this.owner}/${this.repo}/pulls/${body.number}/files`;
    try {
      const response = await axios.get(apiUrl, {
        headers: {
          Authorization: `Bearer ${this.pat}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        responseType: "text",
      });
      return response.data.map((file: any) => ({
        sha: file.sha,
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
      }));
    } catch (error) {
      const typedError = error as any;
      console.error("Error fetching PR diff:", typedError);
      const operationResult = typedError.response
        ? typedError.response.data
        : typedError.message;
      return operationResult;
    }
  }

  async createPullRequest(body: z.infer<typeof CreatePRSchema>) {
    const apiUrl = `https://github.tools.sap/${this.owner}/${this.repo}/pulls`;
    try {
      const {
        head,
        base,
        title,
        body: pr_body,
        reviewers,
        draft,
        assignees,
        labels,
      } = body;
      const createPayload: any = {};
      if (head) createPayload.head = head;
      if (base) createPayload.base = base;
      if (title) createPayload.title = title;
      if (pr_body) createPayload.body = pr_body;
      if (draft) createPayload.draft = draft;

      const response = await axios.post(apiUrl, createPayload, {
        headers: {
          Authorization: `Bearer ${this.pat}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      const pr_number = response.data.number;

      if (reviewers && Array.isArray(reviewers) && reviewers.length > 0) {
        await axios.post(
          `https://github.tools.sap/api/repos/${this.owner}/${this.repo}/pulls/${pr_number}/requested_reviewers`,
          { reviewers },
          {
            headers: {
              Authorization: `Bearer ${this.pat}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        );
      }

      if (assignees && Array.isArray(assignees) && assignees.length > 0) {
        await axios.post(
          `https://github.tools.sap/api/repos/${this.owner}/${this.repo}/issues/${pr_number}/assignees`,
          { assignees },
          {
            headers: {
              Authorization: `Bearer ${this.pat}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        );
      }

      if (labels && Array.isArray(labels) && labels.length > 0) {
        await axios.post(
          `https://github.tools.sap/api/repos/${this.owner}/${this.repo}/issues/${pr_number}/labels`,
          { labels },
          {
            headers: {
              Authorization: `Bearer ${this.pat}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        );
      }

      return {
        url: response.data.html_url,
      };
    } catch (error) {
      const typedError = error as any;
      console.error("Error creating pull request:", typedError);
      const operationResult = typedError.response
        ? typedError.response.data
        : typedError.message;
      return operationResult;
    }
  }

  async updatePullRequest(body: z.infer<typeof UpdatePRSchema>) {
    const pr_number = body.number;
    const apiUrl = `https://github.tools.sap/api/repos/${this.owner}/${this.repo}/pulls/${pr_number}`;
    try {
      const patchPayload: any = {};
      if (body.title) patchPayload.title = body.title;
      if (body.body) patchPayload.body = body.body;
      if (body.state) patchPayload.state = body.state;
      if (body.base) patchPayload.base = body.base;

      const patchResponse = await axios.patch(apiUrl, patchPayload, {
        headers: {
          Authorization: `Bearer ${this.pat}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      const currentLabels: string[] = (patchResponse.data.labels || []).map(
        (l: any) => (typeof l === "string" ? l : l.name),
      );
      const newLabels: string[] = Array.isArray(body.labels) ? body.labels : [];
      const labelsToAdd = newLabels.filter((l) => !currentLabels.includes(l));
      if (labelsToAdd.length > 0) {
        await axios.post(
          `https://github.tools.sap/api/repos/${this.owner}/${this.repo}/issues/${pr_number}/labels`,
          { labels: labelsToAdd },
          {
            headers: {
              Authorization: `Bearer ${this.pat}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        );
      }

      const currentAssignees: string[] = (
        patchResponse.data.assignees || []
      ).map((a: any) => a.login);
      const newAssignees: string[] = Array.isArray(body.assignees)
        ? body.assignees
        : [];
      const assigneesToAdd = newAssignees.filter(
        (a) => !currentAssignees.includes(a),
      );
      if (assigneesToAdd.length > 0) {
        await axios.post(
          `https://github.tools.sap/api/repos/${this.owner}/${this.repo}/issues/${pr_number}/assignees`,
          { assignees: assigneesToAdd },
          {
            headers: {
              Authorization: `Bearer ${this.pat}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        );
      }

      const reviewersUrl = `https://github.tools.sap/api/repos/${this.owner}/${this.repo}/pulls/${pr_number}/requested_reviewers`;
      const reviewersResp = await axios.get(reviewersUrl, {
        headers: {
          Authorization: `Bearer ${this.pat}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      const currentReviewers: string[] = (reviewersResp.data.users || []).map(
        (u: any) => u.login,
      );
      const newReviewers: string[] = Array.isArray(body.reviewers)
        ? body.reviewers
        : [];
      const reviewersToAdd = newReviewers.filter(
        (r) => !currentReviewers.includes(r),
      );
      if (reviewersToAdd.length > 0) {
        await axios.post(
          `https://github.tools.sap/api/repos/${this.owner}/${this.repo}/pulls/${pr_number}/requested_reviewers`,
          { reviewers: reviewersToAdd },
          {
            headers: {
              Authorization: `Bearer ${this.pat}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          },
        );
      }

      return {
        url: patchResponse.data.html_url,
      };
    } catch (error) {
      const typedError = error as any;
      console.error("Error updating pull request:", typedError);
      const operationResult = typedError.response
        ? typedError.response.data
        : typedError.message;
      return operationResult;
    }
  }

  async getCommitHistory(body: z.infer<typeof GetCommitHistorySchema>) {
    const variables = {
      owner: this.owner,
      name: this.repo,
      branch: body.branch,
      limit: body.limit,
      after: body.after ?? null,
    };

    try {
      const response = await axios.post(
        this.GITHUB_API,
        {
          GET_COMMIT_HISTORY,
          variables,
        },
        {
          headers: {
            Authorization: `Bearer ${this.pat}`,
            Accept: "application/json",
          },
        },
      );

      const result = response.data.data.repository.ref?.target?.history;

      if (!result) {
        throw new Error("No commit history found for given branch");
      }

      return {
        commits: result.nodes.map((commit: any) => ({
          sha: commit.oid,
          message: commit.messageHeadline,
          body: commit.messageBody,
          date: commit.committedDate,
          author: commit.author.name,
          additions: commit.additions,
          deletions: commit.deletions,
          changedFiles: commit.changedFiles,
          url: commit.url,
        })),
        pageInfo: result.pageInfo,
      };
    } catch (error) {
      const typedError = error as any;
      console.error("Error fetching commit history:", typedError);
      return typedError.response?.data || typedError.message;
    }
  }

  async getFileCommitHistory(body: z.infer<typeof GetFileCommitHistorySchema>) {
    const { filePath, branch, limit, page } = body;

    const apiUrl = `https://github.tools.sap/api/repos/${this.owner}/${this.repo}/commits`;
    try {
      const response = await axios.get(apiUrl, {
        headers: {
          Authorization: `Bearer ${this.pat}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        params: {
          path: filePath,
          sha: branch,
          per_page: limit,
          page: page,
        },
      });

      return response.data.map((commit: any) => ({
        sha: commit.sha,
        message: commit.commit.message,
        date: commit.commit.committer.date,
        author: commit.author.login,
        url: commit.html_url,
      }));
    } catch (error) {
      const typedError = error as any;
      console.error("Error fetching commit history for file:", typedError);
      return typedError.response?.data || typedError.message;
    }
  }

  async getCommitDetails(body: z.infer<typeof GetCommitDetailsSchema>) {
    const apiUrl = `https://github.tools.sap/api/repos/${this.owner}/${this.repo}/commits/${body.sha}`;
    try {
      const response = await axios.get(apiUrl, {
        headers: {
          Authorization: `Bearer ${this.pat}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      const commit = response.data;

      return {
        sha: commit.sha,
        message: commit.commit.message,
        date: commit.commit.committer.date,
        author: {
          name: commit.commit.author.name,
          login: commit.author?.login ?? null,
        },
        stats: {
          additions: commit.stats.additions,
          deletions: commit.stats.deletions,
          total: commit.stats.total,
        },
        files: commit.files.map((file: any) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch,
        })),
        url: commit.html_url,
      };
    } catch (error) {
      const typedError = error as any;
      console.error("Error fetching commit details:", typedError);
      return typedError.response?.data || typedError.message;
    }
  }

  async getCommitChecks(body: z.infer<typeof GetCommitChecksSchema>) {
    const apiUrl = `https://github.tools.sap/api/repos/${this.owner}/${this.repo}/commits/${body.sha}/status`;
    try {
      const response = await axios.get(apiUrl, {
        headers: {
          Authorization: `Bearer ${this.pat}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      const data = response.data;

      return {
        state: data.state,
        statuses: data.statuses.map((status) => ({
          state: status.state,
          description: status.description,
          target_url: status.target_url,
          context: status.context,
        })),
        url: data.url,
      };
    } catch (error) {
      const typedError = error as any;
      console.error("Error fetching commit details:", typedError);
      return typedError.response?.data || typedError.message;
    }
  }

  private buildSearchQuery(body: z.infer<typeof SearchPullRequestsSchema>) {
    const parts: string[] = [`repo:${this.owner}/${this.repo}`, "is:pr"];

    if (body.states?.includes("OPEN")) parts.push("is:open");
    if (body.states?.includes("CLOSED")) parts.push("is:closed");
    if (body.states?.includes("MERGED")) parts.push("is:merged");

    if (body.author) parts.push(`author:${body.author}`);
    if (body.assignee) parts.push(`assignee:${body.assignee}`);
    if (body.mentions) parts.push(`mentions:${body.mentions}`);
    if (body.labels) {
      for (const label of body.labels) {
        parts.push(`label:"${label}"`);
      }
    }
    if (body.created_after) parts.push(`created:>=${body.created_after}`);
    if (body.created_before) parts.push(`created:<=${body.created_before}`);
    if (body.updated_after) parts.push(`updated:>=${body.updated_after}`);
    if (body.updated_before) parts.push(`updated:<=${body.updated_before}`);
    if (body.search_keywords) parts.push(body.search_keywords);

    return parts.join(" ");
  }
}

export default GithubHelper;
