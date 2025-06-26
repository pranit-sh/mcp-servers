import { AzureOpenAiEmbeddingClient } from '@sap-ai-sdk/foundation-models';

class EmbeddingHelper {
  private embeddingClient: AzureOpenAiEmbeddingClient;

  constructor() {
    this.embeddingClient = new AzureOpenAiEmbeddingClient('text-embedding-3-large');
  }

  public async embedData(data: string | string[]): Promise<number[] | number[][]> {
    const response = await this.embeddingClient.run({ input: data });
    const embeddings = response.getEmbedding();
    return embeddings ?? [];
  }
}

export default EmbeddingHelper;