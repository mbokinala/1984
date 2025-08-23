import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Simple: Link electron app to authenticated user
export const linkElectronApp = mutation({
  args: {
    electronAppId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    console.log("Linking electron app:", args.electronAppId);

    // Get the authenticated user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Create or update electron session
    const existing = await ctx.db
      .query("electronSessions")
      .withIndex("by_electron_app", (q) =>
        q.eq("electronAppId", args.electronAppId)
      )
      .first();

    if (existing) {
      // Update existing session with new user
      await ctx.db.patch(existing._id, {
        userId: user._id,
        tokenIdentifier: identity.tokenIdentifier,
        isActive: true,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      console.log("Updated electron session for user:", user.email);
    } else {
      // Create new session
      await ctx.db.insert("electronSessions", {
        electronAppId: args.electronAppId,
        userId: user._id,
        tokenIdentifier: identity.tokenIdentifier,
        isActive: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      console.log("Created electron session for user:", user.email);
    }

    return { success: true, userId: user._id };
  },
});

// Clear electron session (for sign-out)
export const clearElectronSession = mutation({
  args: {
    electronAppId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("electronSessions")
      .withIndex("by_electron_app", (q) =>
        q.eq("electronAppId", args.electronAppId)
      )
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        isActive: false,
        userId: undefined,
        tokenIdentifier: undefined,
      });
      console.log("Cleared electron session:", args.electronAppId);
    }

    return { success: true };
  },
});

// Clear all sessions for the current user (on sign-out from web)
export const clearUserSessions = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: true }; // Already signed out
    }

    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return { success: true };
    }

    // Find all electron sessions for this user
    const sessions = await ctx.db
      .query("electronSessions")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();

    // Clear all sessions
    for (const session of sessions) {
      await ctx.db.patch(session._id, {
        isActive: false,
      });
    }

    console.log(`Cleared ${sessions.length} electron sessions for user:`, user.email);
    return { success: true, clearedCount: sessions.length };
  },
});

// Simple check: Is this electron app authenticated?
export const checkElectronAuth = query({
  args: {
    electronAppId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find active session for this electron app
    const session = await ctx.db
      .query("electronSessions")
      .withIndex("by_electron_app", (q) =>
        q.eq("electronAppId", args.electronAppId)
      )
      .filter((q) => 
        q.and(
          q.eq(q.field("isActive"), true),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .first();

    if (!session || !session.userId) {
      return { authenticated: false };
    }

    // Get user data
    const user = await ctx.db.get(session.userId);
    if (!user) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: {
        id: user._id,
        name: user.name || "User",
        email: user.email || "",
        imageUrl: user.imageUrl || "",
      },
    };
  },
});

// Get full user data for electron app
export const getElectronUser = query({
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

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    // Get user directly from users table
    if (session.userId) {
      const user = await ctx.db.get(session.userId);
      if (user) {
        return {
          id: user._id,
          name: user.name,
          email: user.email,
          imageUrl: user.imageUrl,
          clerkId: user.clerkId,
          tokenIdentifier: user.tokenIdentifier,
          isAuthenticated: user.isAuthenticated,
          electronAppLinked: user.electronAppLinked,
        };
      }
    }

    return null;
  },
});
