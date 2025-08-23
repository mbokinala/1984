import { v } from "convex/values";
import { internalMutation, internalQuery, mutation } from "./_generated/server";

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();

    console.log("The user id is", userId);

    return await ctx.storage.generateUploadUrl();
  },
});

export const createRecording = mutation({
  args: {
    storageId: v.id("_storage"),
    startTime: v.number(),
    realWorldTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("recordings", {
      video: args.storageId,
      startTime: args.startTime,
      realWorldTime: args.realWorldTime,
    });
  },
});

export const getRecording = internalQuery({
  args: { recordingId: v.id("recordings") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.recordingId);
  },
});

export const updateRecordingAnalysis = internalMutation({
  args: { recordingId: v.id("recordings"), analysis: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.recordingId, { analysis: args.analysis });
  },
});
