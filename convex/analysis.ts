"use node";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, ModelMessage } from "ai";
import { v } from "convex/values";
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
        role: "user",
        content: [
          {
            type: "text",
            text: "The video is a screen recording of a user's computer. Give a one line summary of what's going on in this video.",
          },
          {
            type: "file",
            data: data,
            mediaType: "video/mp4",
          },
        ],
      },
    ];

    console.log("messages", messages);

    const result = await generateText({
      model: google("gemini-2.5-flash"),
      messages,
    });

    console.log(result.text);

    return result.text;
  },
});
