import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAnalyticsData = query({
  args: {},
  handler: async (ctx) => {
    // Get all recordings from the database
    const recordings = await ctx.db.query("recordings").order("desc").collect();
    
    if (recordings.length === 0) {
      return {
        productivity: {
          score: 0,
          trend: "stable" as const,
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
    
    // Calculate basic analytics from actual data
    const productiveCount = recordings.filter(r => r.productive === true).length;
    const unproductiveCount = recordings.filter(r => r.productive === false).length;
    const totalCount = recordings.length;
    const productivityScore = totalCount > 0 ? Math.round((productiveCount / totalCount) * 100) : 0;
    
    // Calculate total hours
    const totalHours = recordings.reduce((sum, r) => sum + (r.realWorldTime / 3600000), 0);
    
    // Calculate category breakdown
    const categoryMap: Record<string, number> = {};
    recordings.forEach(r => {
      if (r.categories) {
        r.categories.forEach((cat: string) => {
          categoryMap[cat] = (categoryMap[cat] || 0) + 1;
        });
      }
    });
    
    const categoryBreakdown = Object.entries(categoryMap).map(([category, count]) => ({
      category,
      percentage: Math.round((count / totalCount) * 100),
      hours: Math.round((count / totalCount) * totalHours),
    }));
    
    // Get last 7 days of activity
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const dailyActivity = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - (i * dayMs);
      const dayEnd = dayStart + dayMs;
      const dayRecordings = recordings.filter(r => 
        r._creationTime >= dayStart && r._creationTime < dayEnd
      );
      const dayOfWeek = new Date(dayStart).getDay();
      
      dailyActivity.push({
        date: dayNames[dayOfWeek],
        productive: dayRecordings.filter(r => r.productive === true).length,
        unproductive: dayRecordings.filter(r => r.productive === false).length,
      });
    }
    
    // Get top activities
    const topActivities = recordings
      .filter(r => r.analysis)
      .slice(0, 5)
      .map((r, i) => ({
        activity: r.analysis || `Activity ${i + 1}`,
        count: 1,
        category: r.categories?.[0] || "other",
      }));
    
    // Calculate focus time stats
    const avgMinutes = totalCount > 0 ? Math.round((totalHours * 60) / totalCount) : 0;
    const longestMinutes = recordings.length > 0 
      ? Math.round(Math.max(...recordings.map(r => r.realWorldTime / 60000)))
      : 0;
    
    return {
      productivity: {
        score: productivityScore,
        trend: productivityScore > 50 ? "up" as const : productivityScore < 30 ? "down" as const : "stable" as const,
        weeklyComparison: 0,
      },
      categoryBreakdown: categoryBreakdown.length > 0 ? categoryBreakdown : [
        { category: "Uncategorized", percentage: 100, hours: Math.round(totalHours) }
      ],
      dailyActivity,
      topActivities: topActivities.length > 0 ? topActivities : [
        { activity: "No activities recorded", count: 0, category: "none" }
      ],
      focusTime: {
        average: avgMinutes,
        longest: longestMinutes,
        total: Math.round(totalHours),
      },
      insights: [
        `You have ${totalCount} recorded sessions with ${productivityScore}% productivity rate`,
        `Total time tracked: ${totalHours.toFixed(1)} hours`,
        productiveCount > unproductiveCount 
          ? "Great job! You're being more productive than unproductive"
          : "Try to focus on more productive tasks",
        avgMinutes > 30 
          ? `Your average session is ${avgMinutes} minutes - good focus time!`
          : "Try to have longer focus sessions for better productivity",
      ],
    };
  },
});
