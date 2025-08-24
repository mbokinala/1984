"use node";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, ModelMessage } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internalAction } from "./_generated/server";

const google = createGoogleGenerativeAI({
  apiKey: "AIzaSyBbYiQvRW5ce0fB8eekwLoxIiwzUAhVW04",
});

export const getVideoSummary = internalAction({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const video = await ctx.storage.get(args.storageId);

    if (!video) {
      throw new Error("Video not found");
    }

    const data = await video.arrayBuffer();

    const messages: ModelMessage[] = [
      {
        role: "system",
        content: `You will be given a screen recording of a user's computer. Respond with a one line summary of what the user did in that clip. For example, "Sent an email to John." Write from the perspective of the user (but don't use the word "I").`,
      },
      {
        role: "user",
        content: [
          {
            type: "file",
            data: data,
            mediaType: "video/mp4",
          },
        ],
      },
    ];

    const maxTries = 3;
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      try {
        let result = await generateObject({
          model: google("gemini-2.5-pro"),
          messages,
          schema: z.object({
            summary: z.string(),
            categories: z.array(
              z.union([
                z.literal("coding"),
                z.literal("email"),
                z.literal("entertainment"),
                z.literal("social_media"),
                z.literal("writing"),
                z.literal("news"),
                z.literal("research"),
                z.literal("messaging"),
                z.literal("other"),
              ])
            ),
            productive: z.boolean(),
          }),
        });

        return result.object;
      } catch (err) {
        if (attempt === maxTries) {
          throw err;
        }
        // Exponential backoff with jitter
        const baseDelay = 1000 * Math.pow(2, attempt - 1); // 1000ms, 2000ms, 4000ms
        const jitter = Math.floor(Math.random() * 5000); // 0-99ms
        const delay = baseDelay + jitter;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Failed to generate summary");
  },
});
