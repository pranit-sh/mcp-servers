import { z } from "zod";
import axios from "axios";
import { 
  CreateConfluencePageSchema, 
  UpdateConfluencePageSchema, 
  DeleteConfluencePageSchema, 
  GetConfluencePageSchema, 
  CommentConfluencePageSchema, 
  GetCommentsSchema, 
  DeleteCommentSchema, 
  SearchConfluencePagesSchema 
} from "../tools";

class ConfluenceHelper {
  private baseUrl: string;
  private username: string;
  private apiToken: string;
  private spaceKey: string;

  constructor(args: [string, string, string, string]) {
    [this.baseUrl, this.username, this.apiToken, this.spaceKey] = args;
    if (this.baseUrl.includes("atlassian.net") && !this.baseUrl.endsWith("/wiki")) {
      this.baseUrl = `${this.baseUrl}/wiki`;
    }
  }

  private getAuth() {
    return {
      username: this.username,
      password: this.apiToken,
    };
  }

  public async createConfluencePage(body: z.infer<typeof CreateConfluencePageSchema>) {
    const apiUrl = `${this.baseUrl}/rest/api/content/`;
    const pageData = {
      type: "page",
      title: body.title,
      space: { key: this.spaceKey },
      body: {
        storage: {
          value: body.content,
          representation: "storage",
        },
      },
    };

    try {
      const response = await axios.post(apiUrl, pageData, { auth: this.getAuth() });
      return {
        status: 'success',
        data: `Page created with ID: ${response.data.id}`,
      };
    } catch (error) {
      const typedError = error as any;
      console.error("Error creating Confluence page:", typedError);
      return {
        status: 'error',
        error: typedError.response ? typedError.response.data : typedError.message,
      };
    }
  }

  public async updateConfluencePage(body: z.infer<typeof UpdateConfluencePageSchema>) {
    const apiUrl = `${this.baseUrl}/rest/api/content/${body.pageId}`;

    const existingPageResponse = await axios.get(apiUrl + '?expand=version', { auth: this.getAuth() });
    const currentVersion = existingPageResponse.data.version.number;

    const pageData: any = {
      type: "page",
      version: { number: currentVersion + 1 },
      title: body.title,
      body: {
        storage: {
          value: body.content,
          representation: "storage",
        },
      },
    };

    if (!body.title) delete pageData.title;
    if (!body.content) delete pageData.body;

    try {
      const response = await axios.put(apiUrl, pageData, { auth: this.getAuth() });
      return {
        status: 'success',
        data: `Page updated with ID: ${response.data.id}`,
      };
    } catch (error) {
      const typedError = error as any;
      console.error("Error updating Confluence page:", typedError);
      return {
        status: 'error',
        error: typedError.response ? typedError.response.data : typedError.message,
      };
    }
  }

  public async getConfluencePage(body: z.infer<typeof GetConfluencePageSchema>) {
    const apiUrl = `${this.baseUrl}/rest/api/content/${body.pageId}?expand=body.storage`;

    try {
      const response = await axios.get(apiUrl, { auth: this.getAuth() });
      return {
        status: 'success',
        data: {
          id: response.data.id,
          title: response.data.title,
          content: response.data.body.storage.value,
          status: response.data.status,
        },
      };
    } catch (error) {
      const typedError = error as any;
      console.error("Error retrieving Confluence page:", typedError);
      return {
        status: 'error',
        error: typedError.response ? typedError.response.data : typedError.message,
      };
    }
  }

  public async deleteConfluencePage(body: z.infer<typeof DeleteConfluencePageSchema>) {
    const apiUrl = `${this.baseUrl}/rest/api/content/${body.pageId}`;

    try {
      await axios.delete(apiUrl, { auth: this.getAuth() });
      return {
        status: 'success',
        message: 'Page deleted successfully',
      };
    } catch (error) {
      const typedError = error as any;
      console.error("Error deleting Confluence page:", typedError);
      return {
        status: 'error',
        error: typedError.response ? typedError.response.data : typedError.message,
      };
    }
  }

  public async commentConfluencePage(body: z.infer<typeof CommentConfluencePageSchema>) {
    const apiUrl = `${this.baseUrl}/rest/api/content`;

    const commentData = {
      type: "comment",
      container: { id: body.pageId, type: "page" },
      body: {
        storage: {
          value: body.content,
          representation: "storage",
        },
      },
    };

    try {
      const response = await axios.post(apiUrl, commentData, { auth: this.getAuth() });
      return {
        status: 'success',
        data: `Comment addded with ID: ${response.data.id}`,
      };
    } catch (error) {
      const typedError = error as any;
      console.error("Error commenting on Confluence page:", typedError);
      return {
        status: 'error',
        error: typedError.response ? typedError.response.data : typedError.message,
      };
    }
  }

  public async getComments(body: z.infer<typeof GetCommentsSchema>) {
    const apiUrl = `${this.baseUrl}/rest/api/content/${body.pageId}/child/comment?expand=body.storage`;

    try {
      const response = await axios.get(apiUrl, { auth: this.getAuth() });
      return {
        status: 'success',
        data: response.data.results.map((comment: any) => ({
          id: comment.id,
          body: comment.body.storage.value,
        })),
      };
    } catch (error) {
      const typedError = error as any;
      console.error("Error retrieving comments from Confluence page:", typedError);
      return {
        status: 'error',
        error: typedError.response ? typedError.response.data : typedError.message,
      };
    }
  }

  public async deleteComment(body: z.infer<typeof DeleteCommentSchema>) {
    const apiUrl = `${this.baseUrl}/rest/api/content/${body.commentId}`;

    try {
      await axios.delete(apiUrl, { auth: this.getAuth() });
      return {
        status: 'success',
        message: 'Comment deleted.',
      };
    } catch (error) {
      const typedError = error as any;
      console.error("Error deleting comment from Confluence page:", typedError);
      return {
        status: 'error',
        error: typedError.response ? typedError.response.data : typedError.message,
      };
    }
  }

  public async searchConfluencePages(body: z.infer<typeof SearchConfluencePagesSchema>) {
    const apiUrl = `${this.baseUrl}/rest/api/content/search?cql=${encodeURIComponent(body.query)}`;

    try {
      const response = await axios.get(apiUrl, { auth: this.getAuth() });
      return {
        status: 'success',
        data: response.data.results.map((page: any) => ({
          id: page.id,
          type: page.type,
          title: page.title,
        })),
      };
    } catch (error) {
      const typedError = error as any;
      console.error("Error searching Confluence pages:", typedError);
      return {
        status: 'error',
        error: typedError.response ? typedError.response.data : typedError.message,
      };
    }
  }

}

export default ConfluenceHelper;