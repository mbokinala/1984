"use node";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const google = createGoogleGenerativeAI({
  apiKey: "AIzaSyBbYiQvRW5ce0fB8eekwLoxIiwzUAhVW04",
});

// Schema for analytics data
const analyticsSchema = z.object({
  productivity: z.object({
    score: z.number().min(0).max(100),
    trend: z.enum(["up", "down", "stable"]),
    weeklyComparison: z.number(),
  }),
  categoryBreakdown: z.array(z.object({
    category: z.string(),
    percentage: z.number(),
    hours: z.number(),
  })),
  dailyActivity: z.array(z.object({
    date: z.string(),
    productive: z.number(),
    unproductive: z.number(),
  })),
  topActivities: z.array(z.object({
    activity: z.string(),
    count: z.number(),
    category: z.string(),
  })),
  focusTime: z.object({
    average: z.number(),
    longest: z.number(),
    total: z.number(),
  }),
  insights: z.array(z.string()),
});

type Recording = {
  _id: string;
  _creationTime: number;
  ownerId?: string;
  video: string | null;
  startTime: number;
  realWorldTime: number;
  analysis?: string;
  categories?: string[];
  productive?: boolean;
};

export const generateAnalytics = action({
  args: {},
  handler: async (ctx): Promise<z.infer<typeof analyticsSchema>> => {
    // Get all recordings from the database
    const recordings: Recording[] = await ctx.runQuery(api.recordings.listRecordings);
    
    // If no recordings, return empty analytics
    if (recordings.length === 0) {
      return {
        productivity: {
          score: 0,
          trend: "stable",
          weeklyComparison: 0,
        },
        categoryBreakdown: [],
        dailyActivity: [],
        topActivities: [],
        focusTime: {
          average: 0,
          longest: 0,
          total: 0,
        },
        insights: ["No recordings found. Start recording your screen to see analytics."],
      };
    }
    
    // Prepare data summary for AI
    const dataSummary = {
      totalRecordings: recordings.length,
      categories: recordings.reduce((acc: Record<string, number>, r: Recording) => {
        if (r.categories) {
          r.categories.forEach((cat: string) => {
            acc[cat] = (acc[cat] || 0) + 1;
          });
        }
        return acc;
      }, {}),
      productiveCount: recordings.filter((r: Recording) => r.productive === true).length,
      unproductiveCount: recordings.filter((r: Recording) => r.productive === false).length,
      recentActivities: recordings.slice(0, 20).map((r: Recording) => ({
        analysis: r.analysis || "",
        productive: r.productive || false,
        categories: r.categories || [],
        duration: r.realWorldTime,
      })),
      totalHours: recordings.reduce((sum: number, r: Recording) => sum + (r.realWorldTime / 3600000), 0),
    };

    const messages = [
      {
        role: "system" as const,
        content: `You are an analytics AI that generates realistic productivity analytics based on user activity data. 
        Generate comprehensive analytics that include productivity scores, category breakdowns, daily activity patterns, 
        and actionable insights. Make the data realistic and consistent with the actual recordings provided.
        
        For daily activity, generate data for the last 7 days with realistic variations based on the actual data.
        For category breakdown, ensure percentages sum to 100.
        For insights, provide 3-5 actionable, specific insights based on the data patterns.
        
        Important: Base all metrics on the actual data provided. Don't make up data that doesn't exist.`,
      },
      {
        role: "user" as const,
        content: `Based on this user activity data, generate comprehensive analytics:
        
        Total Recordings: ${dataSummary.totalRecordings}
        Total Hours Tracked: ${dataSummary.totalHours.toFixed(2)}
        Productive Sessions: ${dataSummary.productiveCount}
        Unproductive Sessions: ${dataSummary.unproductiveCount}
        Categories: ${JSON.stringify(dataSummary.categories)}
        Recent Activities: ${JSON.stringify(dataSummary.recentActivities)}
        
        Generate realistic analytics with:
        - Productivity score based on productive vs unproductive ratio
        - Category breakdown with percentages (based on actual categories found)
        - Daily activity for the last 7 days (estimate based on data patterns)
        - Top 5 activities (based on actual analysis text)
        - Focus time statistics (calculate from duration data)
        - Actionable insights based on the actual patterns`,
      },
    ];

    try {
      const result = await generateObject({
        model: google("gemini-2.0-flash-exp"),
        messages,
        schema: analyticsSchema,
      });

      return result.object;
    } catch (error) {
      console.error("Error generating analytics with AI:", error);
      
      // Calculate basic analytics from actual data if AI fails
      const productiveCount = dataSummary.productiveCount;
      const totalCount = recordings.length;
      const productivityScore = totalCount > 0 ? Math.round((productiveCount / totalCount) * 100) : 0;
      
      // Calculate category breakdown
      const categoryBreakdown = Object.entries(dataSummary.categories).map(([category, count]) => ({
        category,
        percentage: Math.round(((count as number) / totalCount) * 100),
        hours: Math.round(((count as number) / totalCount) * dataSummary.totalHours),
      }));
      
      return {
        productivity: {
          score: productivityScore,
          trend: "stable",
          weeklyComparison: 0,
        },
        categoryBreakdown: categoryBreakdown.length > 0 ? categoryBreakdown : [
          { category: "Uncategorized", percentage: 100, hours: dataSummary.totalHours }
        ],
        dailyActivity: [
          { date: "Today", productive: productiveCount, unproductive: dataSummary.unproductiveCount },
        ],
        topActivities: recordings.slice(0, 5).map((r: Recording, i: number) => ({
          activity: r.analysis || `Activity ${i + 1}`,
          count: 1,
          category: r.categories?.[0] || "other",
        })),
        focusTime: {
          average: Math.round(dataSummary.totalHours * 60 / Math.max(totalCount, 1)),
          longest: Math.round(Math.max(...recordings.map((r: Recording) => r.realWorldTime / 60000), 0)),
          total: Math.round(dataSummary.totalHours),
        },
        insights: [
          `You have ${totalCount} recorded sessions with ${productivityScore}% productivity rate`,
          `Total time tracked: ${dataSummary.totalHours.toFixed(1)} hours`,
          totalCount > 0 ? "Keep recording to get more detailed insights" : "Start recording to track your productivity",
        ],
      };
    }
  },
});