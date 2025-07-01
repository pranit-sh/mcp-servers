import { z } from "zod";

export const GetLastBuildInfoSchema = z.object({
  multibranchJobIdentifier: z
    .string()
    .describe(
      "Mutlibranch job identifier of jenkins. For pull request, it's 'PR-<number>' and for branch, it's branch name.",
    ),
});

export const GetBuildStageStepsSchema = z.object({
  multibranchJobIdentifier: z
    .string()
    .describe(
      "Mutlibranch job identifier of jenkins. For pull request, it's 'PR-<number>' and for branch, it's branch name.",
    ),
  buildId: z.string().describe("Build id of the build."),
  stageId: z.string().describe("Stage id for a build."),
});

export const GetBuildStageStepLogsSchema = z.object({
  multibranchJobIdentifier: z
    .string()
    .describe(
      "Mutlibranch job identifier of jenkins. For pull request, it's 'PR-<number>' and for branch, it's branch name.",
    ),
  buildId: z.string().describe("Build id of the build."),
  stepId: z.string().describe("Step id for a build."),
});

export const TriggerPRBuildSchema = z.object({
  multibranchJobIdentifier: z
    .string()
    .describe(
      "Mutlibranch job identifier of jenkins. For pull request, it's 'PR-<number>' and for branch, it's branch name.",
    ),
});
