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

// Schema for dashboard analysis
const dashboardSchema = z.object({
  recentAlerts: z.array(z.object({
    type: z.enum(["warning", "critical", "info"]),
    time: z.string(),
    message: z.string(),
    suggestion: z.string(),
  })),
  appUsage: z.array(z.object({
    name: z.string(),
    domain: z.string().optional(), // For favicon lookup
    count: z.number(),
    productive: z.number(),
    unproductive: z.number(),
    productivityScore: z.number(),
  })),
  timeFrameAnalysis: z.array(z.object({
    hour: z.number(),
    timeLabel: z.string(),
    productive: z.number(),
    unproductive: z.number(),
    level: z.enum(["high", "medium", "low", "critical"]),
    message: z.string(),
    color: z.string(),
  })),
  currentStreak: z.number(),
  todayStats: z.object({
    productive: z.number(),
    unproductive: z.number(),
    totalHours: z.number(),
  }),
  weeklyTrend: z.array(z.object({
    day: z.string(),
    score: z.number(),
  })),
  mostProductiveTime: z.string(),
  suggestions: z.array(z.string()),
});

export const generateDashboard = action({
  args: {},
  handler: async (ctx): Promise<z.infer<typeof dashboardSchema>> => {
    // Get all recordings
    const recordings = await ctx.runQuery(api.recordings.listRecordings);
    
    if (recordings.length === 0) {
      return {
        recentAlerts: [],
        appUsage: [],
        timeFrameAnalysis: [],
        currentStreak: 0,
        todayStats: {
          productive: 0,
          unproductive: 0,
          totalHours: 0,
        },
        weeklyTrend: [],
        mostProductiveTime: "No data",
        suggestions: ["Start recording your screen to see insights"],
      };
    }

    // Prepare data for AI analysis
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    const recentRecordings = recordings.filter((r: any) => r._creationTime > oneHourAgo);
    const todayRecordings = recordings.filter((r: any) => r._creationTime > oneDayAgo);
    const weekRecordings = recordings.filter((r: any) => r._creationTime > oneWeekAgo);
    
    // Calculate basic stats
    const todayProductive = todayRecordings.filter((r: any) => r.productive).length;
    const todayUnproductive = todayRecordings.filter((r: any) => !r.productive).length;
    const todayHours = todayRecordings.reduce((sum: number, r: any) => sum + (r.realWorldTime / 3600000), 0);
    
    // Calculate current streak
    let currentStreak = 0;
    for (const recording of recordings) {
      if (recording.productive) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    const analysisData = {
      totalRecordings: recordings.length,
      recentRecordings: recentRecordings.map((r: any) => ({
        analysis: r.analysis || "",
        productive: r.productive || false,
        categories: r.categories || [],
        time: new Date(r._creationTime).toISOString(),
      })),
      todayStats: {
        productive: todayProductive,
        unproductive: todayUnproductive,
        totalHours: todayHours,
      },
      currentStreak,
      allAnalyses: recordings.slice(0, 50).map((r: any) => r.analysis).filter(Boolean),
    };

    const messages = [
      {
        role: "system" as const,
        content: `You are a productivity dashboard AI. Analyze user activity data and generate comprehensive dashboard insights.
        
        IMPORTANT RULES:
        1. For app usage, extract actual application/website names from the analysis texts
        2. Include domain names for popular apps (e.g., youtube.com, gmail.com, github.com)
        3. Generate realistic alerts based on actual productivity patterns
        4. Create hour-by-hour analysis for today
        5. Provide actionable, specific suggestions
        6. Calculate weekly trend with realistic scores
        7. Identify the most productive time based on patterns
        
        Common apps to look for in analyses:
        - Browsers: Chrome, Safari, Firefox, Edge
        - Development: VS Code, Visual Studio, IntelliJ, Xcode, Terminal
        - Communication: Slack, Discord, Teams, Zoom, Gmail, Outlook
        - Productivity: Notion, Obsidian, Linear, Jira, Confluence
        - Design: Figma, Sketch, Photoshop, Illustrator
        - Entertainment: YouTube, Netflix, Spotify, Twitter/X, Reddit
        - AI Tools: ChatGPT, Claude, GitHub Copilot
        - Code Platforms: GitHub, GitLab, Bitbucket
        
        When extracting apps, look for phrases like:
        - "Working in [App]"
        - "Using [App]"
        - "Opened [App]"
        - "Browsing [Website]"
        - "Watching on [Platform]"
        - "Coding in [IDE]"`,
      },
      {
        role: "user" as const,
        content: `Analyze this activity data and generate a comprehensive dashboard:
        
        Total Recordings: ${analysisData.totalRecordings}
        Current Streak: ${analysisData.currentStreak} productive sessions
        
        Today's Stats:
        - Productive: ${analysisData.todayStats.productive}
        - Unproductive: ${analysisData.todayStats.unproductive}
        - Total Hours: ${analysisData.todayStats.totalHours.toFixed(2)}
        
        Recent Activity (last hour):
        ${JSON.stringify(analysisData.recentRecordings.slice(0, 10), null, 2)}
        
        All Activity Analyses (for app extraction):
        ${JSON.stringify(analysisData.allAnalyses, null, 2)}
        
        Generate:
        1. Recent alerts if productivity is low
        2. App usage statistics with domains for favicons
        3. Hourly productivity analysis for today (0-23 hours)
        4. Weekly trend (last 7 days)
        5. Most productive time of day
        6. 3-5 personalized suggestions`,
      },
    ];

    try {
      const result = await generateObject({
        model: google("gemini-2.0-flash-exp"),
        messages,
        schema: dashboardSchema,
      });

      return result.object;
    } catch (error) {
      console.error("Error generating dashboard with AI:", error);
      
      // Return basic calculated data if AI fails
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weeklyTrend = [];
      
      for (let i = 6; i >= 0; i--) {
        const dayStart = now - (i * 24 * 60 * 60 * 1000);
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;
        const dayRecordings = recordings.filter(
          (r: any) => r._creationTime >= dayStart && r._creationTime < dayEnd
        );
        
        const productive = dayRecordings.filter((r: any) => r.productive).length;
        const total = dayRecordings.length;
        const score = total > 0 ? Math.round((productive / total) * 100) : 0;
        
        weeklyTrend.push({
          day: dayNames[new Date(dayStart).getDay()],
          score,
        });
      }
      
      return {
        recentAlerts: todayUnproductive > todayProductive ? [{
          type: "warning",
          time: "Today",
          message: "More distractions than productive sessions",
          suggestion: "Try time-blocking your tasks",
        }] : [],
        appUsage: [],
        timeFrameAnalysis: [],
        currentStreak,
        todayStats: {
          productive: todayProductive,
          unproductive: todayUnproductive,
          totalHours: todayHours,
        },
        weeklyTrend,
        mostProductiveTime: "Calculating...",
        suggestions: [
          `You have ${recordings.length} total recordings`,
          `Current streak: ${currentStreak} productive sessions`,
          "AI analysis temporarily unavailable",
        ],
      };
    }
  },
});
