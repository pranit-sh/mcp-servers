import { z } from "zod";
import axios from "axios";
import { CommentSchema, CreateJiraIssueSchema, IssueDetailsSchema, ListTransitionsSchema, SearchIssuesSchema, TransitionSchema, UpdateJiraIssueSchema } from "../tools";

class JiraHelper {
  private baseUrl: string;
  private username: string;
  private apiToken: string;

  constructor(args: [string, string, string]) {
    [this.baseUrl, this.username, this.apiToken] = args;
  }

  private getAuth() {
    return {
      username: this.username,
      password: this.apiToken,
    };
  }

  async createJiraIssue(body: z.infer<typeof CreateJiraIssueSchema>) {
    const apiUrl = `${this.baseUrl}/rest/api/2/issue`;

    try {
      const response = await axios.post(apiUrl, body, { auth: this.getAuth() });
      const operationResult = {
        status: 'success',
        data: {
          issueKey: response.data.key,
          issueId: response.data.id,
        }
      };
      return operationResult;
    } catch (error) {
      const typedError = error as any;
      console.error("Error creating Jira issue:", typedError);
      const operationResult = {
        status: 'error',
        error: typedError.response ? typedError.response.data : typedError.message,
      };
      return operationResult;
    }
  }

  async updateJiraIssue(body: z.infer<typeof UpdateJiraIssueSchema>) {
    const apiUrl = `${this.baseUrl}/rest/api/2/issue/${body.issueKey}`;
    const updateBody = {
      fields: {
        ...(body.summary !== null && { summary: body.summary }),
        ...(body.description !== null && { description: body.description }),
        ...(body.priority !== null && { priority: body.priority }),
        ...(body.labels !== null && { labels: body.labels }),
        ...(body.duedate !== null && { duedate: body.duedate }),
      },
    };

    try {
      await axios.put(apiUrl, updateBody, { auth: this.getAuth() });
      const operationResult = {
        status: 'success',
        data: 'Issue updated successfully',
      };
      return operationResult;
    } catch (error) {
      const typedError = error as any;
      console.error("Error updating Jira issue:", typedError);
      const operationResult = {
        status: 'error',
        error: typedError.response ? typedError.response.data : typedError.message,
      };
      return operationResult;
    }
  }

  async getJiraIssue(body: z.infer<typeof IssueDetailsSchema>) {
    const apiUrl = `${this.baseUrl}/rest/api/2/issue/${body.issueKey}`;

    try {
      const response = await axios.get(apiUrl, { auth: this.getAuth() });
      const data = {
        id: response.data.id,
        issueType: response.data.fields.issuetype.name,
        summary: response.data.fields.summary,
        description: response.data.fields.description,
        status: response.data.fields.status.name,
        priority: response.data.fields.priority.name,
        duedate: response.data.fields.duedate,
        comments: response.data.fields.comment.comments.map((comment: any) => ({
          id: comment.id,
          body: comment.body,
        })),
        parent: response.data.fields.parent ? {
          id: response.data.fields.parent.id,
          key: response.data.fields.parent.key,
        } : null,
        subtasks: response.data.fields.subtasks.map((subtask: any) => ({
          id: subtask.id,
          key: subtask.key,
        })),
      }

      const operationResult = {
        status: 'success',
        data: data,
      }
      return operationResult;
    } catch (error) {
      const typedError = error as any;
      console.error("Error fetching Jira issue:", typedError);
      const operationResult = {
        status: 'error',
        error: typedError.response ? typedError.response.data : typedError.message,
      }
      return operationResult;
    }
  }

  async listTransitions(body: z.infer<typeof ListTransitionsSchema>) {
    const apiUrl = `${this.baseUrl}/rest/api/2/issue/${body.issueKey}/transitions`;

    try {
      const response = await axios.get(apiUrl, { auth: this.getAuth() });
      const transitions = response.data.transitions.map((transition: any) => ({
        id: transition.id,
        name: transition.name,
      }));
      const operationResult = {
        status: 'success',
        data: transitions,
      }
      return operationResult;
    } catch (error) {
      const typedError = error as any;
      console.error("Error listing transitions:", typedError);
      const operationResult = {
        status: 'error',
        error: typedError.response ? typedError.response.data : typedError.message,
      }
      return operationResult;
    }
  }

  async transitionIssue(body: z.infer<typeof TransitionSchema>) {
    const apiUrl = `${this.baseUrl}/rest/api/2/issue/${body.issueKey}/transitions`;
    const transitionBody = {
      transition: {
        id: body.id,
      },
    };

    try {
      await axios.post(apiUrl, transitionBody, { auth: this.getAuth() });
      const operationResult = {
        status: 'success',
        data: 'Issue transitioned successfully',
      }
      return operationResult;
    } catch (error) {
      const typedError = error as any;
      console.error("Error transitioning issue:", typedError);
      const operationResult = {
        status: 'error',
        error: typedError.response ? typedError.response.data : typedError.message,
      }
      return operationResult;
    }
  }

  async addComment(body: z.infer<typeof CommentSchema>) {
    const apiUrl = `${this.baseUrl}/rest/api/2/issue/${body.issueKey}/comment`;
    const commentBody = {
      body: body.body,
    };

    try {
      await axios.post(apiUrl, commentBody, { auth: this.getAuth() });
      const operationResult = {
        status: 'success',
        data: 'Comment added successfully',
      }
      return operationResult;
    } catch (error) {
      const typedError = error as any;
      console.error("Error adding comment:", typedError);
      const operationResult = {
        status: 'error',
        error: typedError.response ? typedError.response.data : typedError.message,
      }
      return operationResult;
    }
  }

  async searchIssues(body: z.infer<typeof SearchIssuesSchema>) {
    let apiUrl = `${this.baseUrl}/rest/api/2/search?jql=${encodeURIComponent(body.jql)}`;
    if (body.maxResults) {
      apiUrl += `&maxResults=${body.maxResults}`;
    }
    if (body.startAt) {
      apiUrl += `&startAt=${body.startAt}`;
    }
    if (body.fields) {
      apiUrl += `&fields=${body.fields.join(",")}`;
    }

    try {
      const response = await axios.get(apiUrl, { auth: this.getAuth() });
      const issues = response.data.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        fields: issue.fields,
      }));
      const operationResult = {
        status: 'success',
        data: {
          total: response.data.total,
          issues: issues,
        }
      }
      return operationResult;
    } catch (error) {
      const typedError = error as any;
      console.error("Error searching issues:", typedError);
      throw typedError;
    }
  }
}

export default JiraHelper;