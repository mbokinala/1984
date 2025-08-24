"use node";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, GenerateTextResult, ModelMessage } from "ai";
import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery, query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

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
        content: `You are an advanced productivity analyst. Analyze the screen recording and provide a detailed JSON response with the following structure:
        {
          "summary": "One line summary of what the user did (e.g., 'Sent an email to John')",
          "detailedAnalysis": {
            "primaryActivity": "Main task being performed",
            "applications": ["List of applications used"],
            "productivityScore": 0-100,
            "focusLevel": "high/medium/low",
            "distractions": ["List of potential distractions observed"],
            "timeBreakdown": {
              "productive": "percentage",
              "neutral": "percentage",
              "distracted": "percentage"
            },
            "suggestions": ["Actionable suggestions for improvement"],
            "keyActions": ["List of key actions performed"],
            "workflowEfficiency": "efficient/moderate/needs-improvement",
            "estimatedTaskCompletion": "percentage completed if applicable"
          },
          "alerts": {
            "isDistracted": boolean,
            "distractionType": "social-media/entertainment/other/none",
            "urgencyLevel": "high/medium/low/none",
            "message": "Alert message if distracted"
          }
        }
        
        Be thorough and provide actionable insights. If the user appears distracted (browsing social media, entertainment sites, etc.), set isDistracted to true and provide an appropriate alert message.`,
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

    let result: GenerateTextResult<{}, string> | null = null;
    const maxTries = 3;
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      try {
        result = await generateText({
          model: google("gemini-2.5-pro"),
          messages,
        });
        break; // Success, exit loop
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

    if (!result) {
      throw new Error("Failed to generate text");
    }

    // Parse the JSON response
    try {
      const analysisData = JSON.parse(result.text);
      
      // Store detailed analytics
      await ctx.runMutation(internal.analysis.storeAnalytics, {
        analysis: analysisData,
        timestamp: Date.now(),
      });
      
      // If user is distracted, trigger alert
      if (analysisData.alerts?.isDistracted) {
        await ctx.runAction(internal.analysis.triggerDistractionAlert, {
          alert: analysisData.alerts,
        });
      }
      
      // Return just the summary for backward compatibility
      return analysisData.summary || result.text;
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Fallback to returning the raw text if JSON parsing fails
      return result.text;
    }
  },
});

// Store detailed analytics in database
export const storeAnalytics = internalMutation({
  args: {
    analysis: v.any(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("No user identity found, skipping analytics storage");
      return;
    }
    
    await ctx.db.insert("analytics", {
      userId: identity.subject,
      analysis: args.analysis,
      timestamp: args.timestamp,
      createdAt: Date.now(),
    });
  },
});

// Trigger distraction alert
export const triggerDistractionAlert = internalAction({
  args: {
    alert: v.object({
      isDistracted: v.boolean(),
      distractionType: v.string(),
      urgencyLevel: v.string(),
      message: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    console.log("🚨 DISTRACTION ALERT:", args.alert);
    
    // Send alert to electron app
    // This will be picked up by the electron app's IPC listener
    await ctx.runMutation(internal.analysis.createDistractionAlert, {
      alert: args.alert,
      timestamp: Date.now(),
    });
  },
});

// Create distraction alert record
export const createDistractionAlert = internalMutation({
  args: {
    alert: v.any(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("distractionAlerts", {
      alert: args.alert,
      timestamp: args.timestamp,
      acknowledged: false,
    });
  },
});

// Get unacknowledged alerts
export const getUnacknowledgedAlerts = query({
  args: {
    electronAppId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const alerts = await ctx.db
      .query("distractionAlerts")
      .filter((q) => q.eq(q.field("acknowledged"), false))
      .order("desc")
      .take(5);
    
    return alerts;
  },
});

// Acknowledge an alert
export const acknowledgeAlert = mutation({
  args: {
    alertId: v.id("distractionAlerts"),
    acknowledged: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertId, {
      acknowledged: args.acknowledged,
    });
  },
});

// Get detailed analytics for dashboard
export const getDetailedAnalytics = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    
    const analytics = await ctx.db
      .query("analytics")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .order("desc")
      .take(100);
    
    const recordings = await ctx.db
      .query("recordings")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();
    
    // Calculate aggregate statistics
    const totalRecordingTime = recordings.reduce((acc, r) => acc + (r.realWorldTime || 0), 0);
    const totalSessions = recordings.length;
    const averageSessionLength = totalSessions > 0 ? totalRecordingTime / totalSessions : 0;
    
    // Calculate productivity metrics from analytics
    let totalProductivityScore = 0;
    let distractionCount = 0;
    let focusedTime = 0;
    let breakTime = 0;
    const applicationUsage: Record<string, number> = {};
    
    analytics.forEach((record) => {
      const analysis = record.analysis;
      if (analysis?.detailedAnalysis) {
        totalProductivityScore += analysis.detailedAnalysis.productivityScore || 0;
        
        if (analysis.alerts?.isDistracted) {
          distractionCount++;
        }
        
        // Track application usage
        if (analysis.detailedAnalysis.applications) {
          analysis.detailedAnalysis.applications.forEach((app: string) => {
            applicationUsage[app] = (applicationUsage[app] || 0) + 1;
          });
        }
      }
    });
    
    const avgProductivityScore = analytics.length > 0 ? totalProductivityScore / analytics.length : 0;
    
    // Get top applications
    const topApplications = Object.entries(applicationUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, time: `${Math.round(count * 5)}m` }));
    
    return {
      totalRecordingTime,
      totalSessions,
      averageSessionLength,
      productivityScore: Math.round(avgProductivityScore),
      distractionCount,
      focusedTime,
      breakTime,
      topApplications,
      mostProductiveTime: "9 AM - 11 AM", // This would be calculated from actual data
      weeklyProgress: [], // This would show week-over-week progress
    };
  },
});
