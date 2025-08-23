import { query } from "./_generated/server";
import { v } from "convex/values";

// Debug function to list all users
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      tokenIdentifier: user.tokenIdentifier,
      clerkId: user.clerkId,
      isAuthenticated: user.isAuthenticated,
      electronAppLinked: user.electronAppLinked,
      lastAuthenticatedAt: user.lastAuthenticatedAt,
    }));
  },
});

// Debug function to list all electron sessions
export const listElectronSessions = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db.query("electronSessions").collect();
    return sessions.map(session => ({
      id: session._id,
      electronAppId: session.electronAppId,
      userId: session.userId,
      tokenIdentifier: session.tokenIdentifier,
      isActive: session.isActive,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  },
});

// Get user by token identifier
export const getUserByToken = query({
  args: {
    tokenIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", args.tokenIdentifier)
      )
      .first();
    
    return user;
  },
});
