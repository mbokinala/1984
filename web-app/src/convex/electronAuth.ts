import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Link electron app to authenticated user
export const linkElectronApp = mutation({
  args: {
    electronAppId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get or create user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if session exists
    const existing = await ctx.db
      .query("electronSessions")
      .withIndex("by_electron_app", (q) =>
        q.eq("electronAppId", args.electronAppId)
      )
      .first();

    if (existing) {
      // Update existing session
      await ctx.db.patch(existing._id, {
        userId: user._id,
        tokenIdentifier: identity.tokenIdentifier,
        isActive: true,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });
    } else {
      // Create new session
      await ctx.db.insert("electronSessions", {
        electronAppId: args.electronAppId,
        userId: user._id,
        tokenIdentifier: identity.tokenIdentifier,
        isActive: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });
    }

    return { success: true };
  },
});

// Check if electron app is linked
export const checkElectronAuth = query({
  args: {
    electronAppId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("electronSessions")
      .withIndex("by_electron_app", (q) =>
        q.eq("electronAppId", args.electronAppId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!session) {
      return { authenticated: false };
    }

    // Check if expired
    if (session.expiresAt < Date.now()) {
      return { authenticated: false };
    }

    // Get user info
    const user = session.userId ? await ctx.db.get(session.userId) : null;

    return {
      authenticated: true,
      user: user
        ? {
            id: user._id,
            name: user.name,
            email: user.email,
            imageUrl: user.imageUrl,
          }
        : null,
    };
  },
});
