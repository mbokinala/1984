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

    console.log("Linking electron app:", args.electronAppId, "to user:", identity.tokenIdentifier);

    // Get user - should already exist from store() call
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      console.error("User not found for token:", identity.tokenIdentifier);
      throw new Error("User not found - please ensure store() is called first");
    }

    console.log("Found user:", user._id, "with name:", user.name);

    // Mark user as having electron app linked
    await ctx.db.patch(user._id, {
      electronAppLinked: true,
    });

    // Check if session exists
    const existing = await ctx.db
      .query("electronSessions")
      .withIndex("by_electron_app", (q) =>
        q.eq("electronAppId", args.electronAppId)
      )
      .first();

    if (existing) {
      // Update existing session
      console.log("Updating existing electron session");
      await ctx.db.patch(existing._id, {
        userId: user._id,
        tokenIdentifier: identity.tokenIdentifier,
        isActive: true,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });
    } else {
      // Create new session
      console.log("Creating new electron session");
      await ctx.db.insert("electronSessions", {
        electronAppId: args.electronAppId,
        userId: user._id,
        tokenIdentifier: identity.tokenIdentifier,
        isActive: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });
    }

    console.log("Electron app successfully linked to user");
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

    // Get user info - handle both new and legacy users
    let user = null;
    
    if (session.userId) {
      user = await ctx.db.get(session.userId);
    } else if (session.tokenIdentifier) {
      // Try to find user by token identifier
      user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) =>
          q.eq("tokenIdentifier", session.tokenIdentifier)
        )
        .first();
    }

    return {
      authenticated: true,
      user: user
        ? {
            id: user._id,
            name: user.name || user.clerkId, // Fallback to clerkId for legacy users
            email: user.email,
            imageUrl: user.imageUrl,
            // Include any other user fields that might be useful
            tokenIdentifier: user.tokenIdentifier,
            clerkId: user.clerkId,
          }
        : null,
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
