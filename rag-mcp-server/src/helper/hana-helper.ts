import hanaClient from "@sap/hana-client";
import {
  CREATE_TABLE_SQL,
  CREATE_META_TABLE_SQL,
  GET_INGESTED_FILES_SQL,
  GET_SIMILAR_DOCUMENTS_SQL,
  INSERT_CHUNKS_SQL,
  INSERT_META_SQL,
  DELETE_DOCUMENT_SQL,
  DELETE_META_SQL,
} from "./hana-query";
import { InsertChunk } from "../types";

class HanaHelper {
  private endpoint: string;
  private username: string;
  private password: string;
  private projectId: string;
  private hanaClient!: hanaClient.Connection;

  constructor(args: [string, string, string, string]) {
    [this.endpoint, this.username, this.password, this.projectId] = args;
  }

  public async connect() {
    this.hanaClient = hanaClient.createConnection();
    const connectionParams = {
      serverNode: this.endpoint,
      uID: this.username,
      pwd: this.password,
    };

    await new Promise<void>((resolve, reject) => {
      this.hanaClient.connect(connectionParams, (err: any) => {
        if (err) {
          console.error("Error connecting to HANA DB:", err);
          return reject(err);
        }
        resolve();
      });
    });

    await this.executeStatement(CREATE_TABLE_SQL, [
      this.projectId,
      this.projectId,
    ]);
    await this.executeStatement(CREATE_META_TABLE_SQL, [
      this.projectId + "_meta",
      this.projectId + "_meta",
    ]);
  }

  public async getIngestedFiles(): Promise<string[]> {
    if (!this.hanaClient) {
      throw new Error("Hana client is not initialized");
    }

    const result = await this.executeStatement(GET_INGESTED_FILES_SQL, [
      `${this.projectId}_meta`,
    ]);

    return result.map((row: { file_id: string }) => row.file_id);
  }

  public async getSimilarDocuments(query: number[]): Promise<any[]> {
    const threshold = 0.4;
    const limit = 5;
    const result = await this.executeStatement(GET_SIMILAR_DOCUMENTS_SQL, [
      query,
      limit,
      this.projectId,
      threshold,
    ]);

    return result.map(
      (row: {
        similarity_score: number;
        page_content: string;
        metadata: string;
      }) => ({
        similarity_score: row.similarity_score, // TODO: Remove later
        page_content: row.page_content,
        metadata: JSON.parse(row.metadata), // TODO: Destructure later
      }),
    );
  }

  public async insertChunks(insertChunks: InsertChunk[]) {
    const batchSize = 1000;

    for (let i = 0; i < insertChunks.length; i += batchSize) {
      const batch = insertChunks.slice(i, i + batchSize);
      const paramsArray = batch.map((chunk) => [
        this.projectId,
        chunk.fileId,
        chunk.pageContent,
        JSON.stringify(chunk.metadata),
        chunk.vector,
      ]);

      await new Promise<void>((resolve, reject) => {
        this.hanaClient.prepare(
          INSERT_CHUNKS_SQL,
          (err: any, statement: any) => {
            if (err) {
              return reject(err);
            }

            // Begin transaction
            this.hanaClient.exec("BEGIN", (err: any) => {
              if (err) {
                return reject(err);
              }

              statement.execBatch(paramsArray, (err: any) => {
                if (err) {
                  // Rollback transaction in case of error
                  this.hanaClient.exec("ROLLBACK", () => {
                    return reject(err);
                  });
                } else {
                  // Commit transaction upon success
                  this.hanaClient.exec("COMMIT", (err: any) => {
                    if (err) {
                      return reject(err);
                    }
                    resolve();
                  });
                }
              });
            });
          },
        );
      });
    }
  }

  public async insertMeta(fileId: string, entries: number) {
    const params = [`${this.projectId}_meta`, fileId, entries];
    return await this.executeStatement(INSERT_META_SQL, params);
  }

  public async deleteDocument(fileId: string) {
    const params = [this.projectId, fileId];
    return await this.executeStatement(DELETE_DOCUMENT_SQL, params);
  }

  public async deleteMeta(fileId: string) {
    const params = [`${this.projectId}_meta`, fileId];
    return await this.executeStatement(DELETE_META_SQL, params);
  }

  private async executeStatement(sql: string, params: any[] = []) {
    return new Promise<any>((resolve, reject) => {
      this.hanaClient.prepare(sql, (err: any, statement: any) => {
        if (err) {
          return reject(err);
        }

        statement.exec(params, (err: any, result: any) => {
          if (err) {
            return reject(err);
          }
          resolve(result);
        });
      });
    });
  }
}

export default HanaHelper;
