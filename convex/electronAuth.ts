import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Dead simple: Link electron app to whoever is signed in
export const linkElectronApp = mutation({
  args: {
    electronAppId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("No identity found for electron app:", args.electronAppId);
      throw new Error("Not authenticated");
    }

    console.log("Linking electron app:", args.electronAppId, "to:", identity.email);

    // Get or create user
    let user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    
    if (!user) {
      // Create user
      console.log("Creating new user for:", identity.email);
      const userId = await ctx.db.insert("users", {
        tokenIdentifier: identity.tokenIdentifier,
        name: identity.name,
        email: identity.email,
        imageUrl: identity.pictureUrl,
      });
      user = await ctx.db.get(userId);
    }

    if (!user) {
      throw new Error("Failed to create/get user");
    }

    // Delete any existing session for this electron app
    const existingSession = await ctx.db
      .query("electronSessions")
      .withIndex("by_electron_app", (q) =>
        q.eq("electronAppId", args.electronAppId)
      )
      .first();

    if (existingSession) {
      await ctx.db.delete(existingSession._id);
      console.log("Deleted old session for:", args.electronAppId);
    }

    // Always create a fresh session
    await ctx.db.insert("electronSessions", {
      electronAppId: args.electronAppId,
      userId: user._id,
      tokenIdentifier: identity.tokenIdentifier,
      isActive: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    console.log(`Created new session: ${args.electronAppId} -> ${user.email}`);
    return { success: true, user: { email: user.email, name: user.name } };
  },
});

// Dead simple: Check if electron app has a session
export const checkElectronAuth = query({
  args: {
    electronAppId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find session for this electron app
    const session = await ctx.db
      .query("electronSessions")
      .withIndex("by_electron_app", (q) =>
        q.eq("electronAppId", args.electronAppId)
      )
      .first();

    // No session = not authenticated
    if (!session) {
      console.log("No session found for:", args.electronAppId);
      return { authenticated: false };
    }

    // Session expired = not authenticated
    if (session.expiresAt < Date.now()) {
      console.log("Session expired for:", args.electronAppId);
      return { authenticated: false };
    }

    // Session not active = not authenticated
    if (!session.isActive) {
      console.log("Session inactive for:", args.electronAppId);
      return { authenticated: false };
    }

    // Get the user
    const user = session.userId ? await ctx.db.get(session.userId) : null;
    
    if (!user) {
      console.log("User not found for session:", args.electronAppId);
      return { authenticated: false };
    }

    console.log("Session valid for:", args.electronAppId, "->", user.email);

    // Return authenticated with user data
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

// Clear session when signing out
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
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});
