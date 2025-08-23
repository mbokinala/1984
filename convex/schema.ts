import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isAuthenticated: v.boolean(),
    lastAuthenticatedAt: v.optional(v.number()),
    electronAppLinked: v.optional(v.boolean()),
  })
    .index("by_clerk_id", ["clerkId"]),
  
  authSessions: defineTable({
    userId: v.id("users"),
    sessionToken: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    expiresAt: v.number(),
    electronAppId: v.optional(v.string()),
  })
    .index("by_token", ["sessionToken"])
    .index("by_user", ["userId"])
    .index("by_electron_app", ["electronAppId"]),
});
