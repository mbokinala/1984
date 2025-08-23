// convex/index.ts
import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";
import { api, components, internal } from "./_generated/api";
import { mutation } from "./_generated/server";

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

    await step.runMutation(internal.recordings.updateRecordingAnalysis, {
      recordingId: args.recordingId,
      analysis: summary,
    });

    return summary;
  },
});

export const kickoffWorkflow = mutation({
  args: { recordingId: v.id("recordings") },
  handler: async (ctx, args) => {
    console.log("Kicking off workflow");
    await workflow.start(ctx, internal.workflows.analyzeVideoWorkflow, {
      recordingId: args.recordingId,
    });
  },
});

export const reprocessAllRecordings = mutation({
  args: {},
  handler: async (ctx) => {
    const recordings = await ctx.db.query("recordings").collect();
    for (const recording of recordings) {
      await ctx.scheduler.runAfter(0, api.workflows.kickoffWorkflow, {
        recordingId: recording._id,
      });
    }
  },
});
