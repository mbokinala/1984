import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // New fields for Clerk JWT auth
    name: v.optional(v.string()),
    tokenIdentifier: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),

    // Legacy fields - keep for backward compatibility
    clerkId: v.optional(v.string()),
    isAuthenticated: v.optional(v.boolean()),
    lastAuthenticatedAt: v.optional(v.number()),
    electronAppLinked: v.optional(v.boolean()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_clerk_id", ["clerkId"]), // Keep old index for migration

  electronSessions: defineTable({
    electronAppId: v.string(),
    userId: v.optional(v.id("users")),
    tokenIdentifier: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_electron_app", ["electronAppId"]),

  // Keep existing tables
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

  recordings: defineTable({
    ownerId: v.optional(v.id("users")),
    video: v.id("_storage"),
    startTime: v.number(), // unix ms timestamp of beginning of video
    realWorldTime: v.number(), // number of milliseconds represented by the video
    analysis: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
    productive: v.optional(v.boolean()),
  }),
});
