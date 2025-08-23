import { v } from "convex/values";
import { mutation } from "./_generated/server";

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
    const userIdentity = await ctx.auth.getUserIdentity();

    if (!userIdentity) {
      throw new Error("Unauthorized");
    }

    const matchingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", userIdentity.subject))
      .first();

    if (!matchingUser) {
      throw new Error("User not found");
    }

    const userId = matchingUser._id;

    return await ctx.db.insert("recordings", {
      ownerId: userId,
      video: args.storageId,
      startTime: args.startTime,
      realWorldTime: args.realWorldTime,
    });
  },
});
