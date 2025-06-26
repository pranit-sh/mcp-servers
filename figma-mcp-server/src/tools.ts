import { z } from "zod";

export const GetFigmaImageSchema = z.object({
  fileKey: z
    .string()
    .describe("The unique key of the Figma file to retrieve the image from"),
  nodeId: z
    .string()
    .describe("The unique ID of the node in the Figma file to retrieve the image from"),
});