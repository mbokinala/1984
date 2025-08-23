import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create or update user from Clerk
export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        isAuthenticated: true,
        lastAuthenticatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        isAuthenticated: true,
        lastAuthenticatedAt: Date.now(),
        electronAppLinked: false,
      });
    }
  },
});

// Create auth session for Electron app
export const createAuthSession = mutation({
  args: {
    clerkId: v.string(),
    electronAppId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Generate a secure session token
    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // Create session with 24 hour expiry
    const sessionId = await ctx.db.insert("authSessions", {
      userId: user._id,
      sessionToken,
      isActive: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      electronAppId: args.electronAppId,
    });

    // Mark user as having electron app linked
    await ctx.db.patch(user._id, {
      electronAppLinked: true,
    });

    return { sessionToken, sessionId };
  },
});

// Verify auth session
export const verifySession = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (!session) {
      return { valid: false, error: "Session not found" };
    }

    if (!session.isActive) {
      return { valid: false, error: "Session inactive" };
    }

    if (session.expiresAt < Date.now()) {
      return { valid: false, error: "Session expired" };
    }

    const user = await ctx.db.get(session.userId);
    
    return {
      valid: true,
      user: user ? {
        id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl,
      } : null,
    };
  },
});

// Get user by Clerk ID
export const getUserByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Invalidate session
export const invalidateSession = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        isActive: false,
      });
    }
  },
});

// Store electron auth with JWT token
export const storeElectronAuth = mutation({
  args: {
    electronAppId: v.string(),
    jwtToken: v.string(),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find or create the auth session
    const existing = await ctx.db
      .query("authSessions")
      .withIndex("by_electron_app", (q) => q.eq("electronAppId", args.electronAppId))
      .first();

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (existing) {
      // Update existing session with new JWT token
      await ctx.db.patch(existing._id, {
        sessionToken: args.jwtToken,
        isActive: true,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });
    } else {
      // Create new session
      await ctx.db.insert("authSessions", {
        userId: user._id,
        sessionToken: args.jwtToken,
        isActive: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        electronAppId: args.electronAppId,
      });
    }

    // Mark user as having electron app linked
    await ctx.db.patch(user._id, {
      electronAppLinked: true,
    });

    return { success: true };
  },
});

// Get JWT token by electron app ID
export const getElectronAuth = query({
  args: {
    electronAppId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_electron_app", (q) => q.eq("electronAppId", args.electronAppId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!session) {
      return null;
    }

    // Check if expired
    if (session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    
    return {
      jwtToken: session.sessionToken, // This is now the JWT token
      user: user ? {
        id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl,
      } : null,
    };
  },
});

// Keep the old function for backward compatibility but it now returns JWT
export const getSessionByElectronAppId = query({
  args: {
    electronAppId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_electron_app", (q) => q.eq("electronAppId", args.electronAppId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!session) {
      return null;
    }

    // Check if expired
    if (session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    
    return {
      sessionToken: session.sessionToken, // This is now the JWT token
      user: user ? {
        id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl,
      } : null,
    };
  },
});
