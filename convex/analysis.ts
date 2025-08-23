import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const getVideoSummary = internalAction({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const video = await ctx.storage.get(args.storageId);

    return "";
  },
});
