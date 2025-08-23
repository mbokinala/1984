import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Store user data from Clerk JWT
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    console.log("Storing user with identity:", identity);

    // Check if we've already stored this identity before
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    
    if (user !== null) {
      // Update existing user with latest data
      console.log("Updating existing user:", user._id);
      await ctx.db.patch(user._id, { 
        name: identity.name || identity.givenName || identity.familyName || undefined,
        email: identity.email || undefined,
        imageUrl: identity.pictureUrl || identity.picture || undefined,
        // Update clerk-specific fields if they exist
        clerkId: identity.subject || undefined,
        isAuthenticated: true,
        lastAuthenticatedAt: Date.now(),
      });
      return user._id;
    }
    
    // If it's a new identity, create a new `User`
    console.log("Creating new user for token:", identity.tokenIdentifier);
    const newUserId = await ctx.db.insert("users", {
      name: identity.name || identity.givenName || identity.familyName || undefined,
      tokenIdentifier: identity.tokenIdentifier,
      email: identity.email || undefined,
      imageUrl: identity.pictureUrl || identity.picture || undefined,
      // Add clerk-specific fields
      clerkId: identity.subject || undefined,
      isAuthenticated: true,
      lastAuthenticatedAt: Date.now(),
      electronAppLinked: false,
    });
    console.log("Created new user:", newUserId);
    return newUserId;
  },
});

// Get current user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    
    return user;
  },
});