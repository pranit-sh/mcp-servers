export type InsertChunk = {
  fileId: string;
  pageContent: string;
  metadata: Record<string, any>;
  vector: number[];
}