import { z } from "zod";
import axios from "axios";

class FigmaHelper {
  private accessToken: string;

  constructor(args: [string]) {
    this.accessToken = args[0];
  }

  private getAuthHeaders() {
    return {
      'X-Figma-Token': this.accessToken,
    };
  }

  async getFigmaImage(fileKey: string, nodeId: string, scale: number = 1, format: 'png' | 'jpg' = 'png') {
    const apiUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&scale=${scale}&format=${format}`;

    try {
      const response = await axios.get(apiUrl, { headers: this.getAuthHeaders() });
      return response.data.images[nodeId];
    } catch (error) {
      const typedError = error as any;
      console.error("Error retrieving Figma image:", typedError);
      throw new Error(typedError.response ? typedError.response.data : typedError.message);
    }
  }
}

export default FigmaHelper;