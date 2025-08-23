// convex/index.ts
import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";

export const workflow = new WorkflowManager(components.workflow);

export const analyzeVideoWorkflow = workflow.define({
  args: { recordingId: v.id("recordings") },
  handler: async (step, args): Promise<string> => {
    const recording = await step.runQuery(internal.recordings.getRecording, {
      recordingId: args.recordingId,
    });

    if (!recording) {
      throw new Error("Recording not found");
    }

    const storageId = recording.video;

    const summary = await step.runAction(internal.analysis.getVideoSummary, {
      storageId,
    });

    return summary;
  },
});
