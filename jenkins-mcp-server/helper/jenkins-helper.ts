import axios from "axios";

class JenkinsHelper {
  private baseUrl: string;
  private pipelineName: string;

  constructor(args: [string, string]) {
    this.baseUrl = args[0];
    this.pipelineName = args[1];
  }

  async getLastBuildInfo(multibranchJobIdentifier: string) {
    const response = await axios.get(
      `${this.baseUrl}/job/${this.pipelineName}/job/${multibranchJobIdentifier}/lastBuild/wfapi/describe`,
    );
    const data = response.data;
    return {
      id: data.id,
      status: data.status,
      durationMillis: data.durationMillis,
      url: `${this.baseUrl}/job/${this.pipelineName}/view/change-requests/job/${multibranchJobIdentifier}/${data.id}/`,
      stages: data.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        status: stage.status,
        durationMillis: stage.durationMillis,
      })),
    };
  }

  async getBuildStageSteps(
    multibranchJobIdentifier: string,
    build_id: string,
    stage_id: string,
  ) {
    const response = await axios.get(
      `${this.baseUrl}/job/${this.pipelineName}/view/change-requests/job/${multibranchJobIdentifier}/${build_id}/execution/node/${stage_id}/wfapi/describe`,
    );
    const data = response.data;
    return data.stageFlowNodes.map((step) => ({
      id: step.id,
      name: step.name,
      status: step.status,
      parameterDescription: step.parameterDescription,
      durationMillis: step.durationMillis,
    }));
  }

  async getBuildStageStepLogs(
    multibranchJobIdentifier: string,
    build_id: string,
    step_id: string,
  ) {
    const response = await axios.get(
      `${this.baseUrl}/job/${this.pipelineName}/view/change-requests/job/${multibranchJobIdentifier}/${build_id}/execution/node/${step_id}/wfapi/log`,
    );
    const data = response.data;
    return data.stageFlowNodes.map((step) => ({
      consoleUrl: step.consoleUrl,
      text: step.text,
      hasMore: step.hasMore,
    }));
  }

  async triggerBuild(multibranchJobIdentifier: string) {
    const crumbResponse = await axios.get(
      `${this.baseUrl}/crumbIssuer/api/json`,
    );
    const crumb = crumbResponse.data.crumb;
    const crumbField = crumbResponse.data.crumbRequestField;

    const triggerUrl = `${this.baseUrl}/job/${this.pipelineName}/job/${multibranchJobIdentifier}/build`;
    await axios.post(
      triggerUrl,
      {},
      {
        headers: {
          [crumbField]: crumb,
        },
      },
    );
    return { triggered: true };
  }
}

export default JenkinsHelper;
