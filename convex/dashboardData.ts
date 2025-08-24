import { query } from "./_generated/server";
import { v } from "convex/values";

// Helper function to extract app/website from analysis text
function extractAppsFromAnalysis(analysis: string): string[] {
  const apps: string[] = [];
  
  // Common app patterns to match
  const patterns = [
    /(?:using|opened|in|on|browsing|viewing|watching|reading|writing in|coding in|working in)\s+([A-Z][a-zA-Z\s]+?)(?:\s+to|\s+for|\s+and|\s+-|,|\.|\s*$)/gi,
    /(?:^|^.*?)([A-Z][a-zA-Z\s]+?)(?:\s+app|\s+website|\s+application)/gi,
    /(?:youtube|gmail|google|slack|discord|notion|figma|vscode|vs code|visual studio|chrome|safari|firefox|spotify|zoom|teams|outlook|excel|word|powerpoint|photoshop|illustrator|terminal|iterm|warp)/gi,
  ];
  
  patterns.forEach(pattern => {
    const matches = analysis.matchAll(pattern);
    for (const match of matches) {
      const app = match[1] || match[0];
      if (app && app.length > 2 && app.length < 30) {
        apps.push(app.trim());
      }
    }
  });
  
  return [...new Set(apps)]; // Remove duplicates
}

// Helper to determine if a time period was productive
function getProductivityLevel(productive: number, unproductive: number): {
  level: "high" | "medium" | "low" | "critical";
  message: string;
  color: string;
} {
  const total = productive + unproductive;
  if (total === 0) return { level: "medium", message: "No activity", color: "gray" };
  
  const ratio = productive / total;
  
  if (ratio >= 0.8) {
    return { level: "high", message: "Excellent focus!", color: "green" };
  } else if (ratio >= 0.6) {
    return { level: "medium", message: "Good productivity", color: "blue" };
  } else if (ratio >= 0.3) {
    return { level: "low", message: "Needs improvement", color: "yellow" };
  } else {
    return { level: "critical", message: "Off track - refocus needed!", color: "red" };
  }
}

export const getDashboardData = query({
  args: {},
  handler: async (ctx) => {
    // Get all recordings
    const recordings = await ctx.db.query("recordings").order("desc").collect();
    
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
    
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Get recent recordings for alerts
    const recentRecordings = recordings.filter(r => r._creationTime > oneHourAgo);
    
    // Calculate productivity alerts for recent timeframes
    const recentAlerts = [];
    
    // Check last hour
    const lastHourRecordings = recordings.filter(r => r._creationTime > oneHourAgo);
    const lastHourProductive = lastHourRecordings.filter(r => r.productive).length;
    const lastHourUnproductive = lastHourRecordings.filter(r => !r.productive).length;
    
    if (lastHourUnproductive > lastHourProductive && lastHourRecordings.length > 0) {
      recentAlerts.push({
        type: "warning" as const,
        time: "Last hour",
        message: "You've been off track for the past hour",
        suggestion: "Take a break and refocus on priority tasks",
      });
    }
    
    // Check last 30 minutes for critical alerts
    const thirtyMinAgo = now - 30 * 60 * 1000;
    const last30MinRecordings = recordings.filter(r => r._creationTime > thirtyMinAgo);
    const last30MinUnproductive = last30MinRecordings.filter(r => !r.productive).length;
    
    if (last30MinUnproductive >= 3) {
      recentAlerts.push({
        type: "critical" as const,
        time: "Last 30 minutes",
        message: "High distraction detected!",
        suggestion: "Close distracting apps and focus on one task",
      });
    }
    
    // Extract app usage from analysis
    const appUsageMap: Record<string, { count: number; productive: number; unproductive: number }> = {};
    
    recordings.forEach(recording => {
      if (recording.analysis) {
        const apps = extractAppsFromAnalysis(recording.analysis);
        apps.forEach(app => {
          if (!appUsageMap[app]) {
            appUsageMap[app] = { count: 0, productive: 0, unproductive: 0 };
          }
          appUsageMap[app].count++;
          if (recording.productive) {
            appUsageMap[app].productive++;
          } else {
            appUsageMap[app].unproductive++;
          }
        });
      }
    });
    
    // Sort apps by usage and get top 10
    const appUsage = Object.entries(appUsageMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        productive: stats.productive,
        unproductive: stats.unproductive,
        productivityScore: stats.count > 0 ? Math.round((stats.productive / stats.count) * 100) : 0,
      }));
    
    // Time frame analysis (hourly for today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayRecordings = recordings.filter(r => r._creationTime > todayStart.getTime());
    
    const timeFrameAnalysis = [];
    for (let hour = 0; hour < 24; hour++) {
      const hourStart = new Date(todayStart);
      hourStart.setHours(hour);
      const hourEnd = new Date(todayStart);
      hourEnd.setHours(hour + 1);
      
      const hourRecordings = todayRecordings.filter(
        r => r._creationTime >= hourStart.getTime() && r._creationTime < hourEnd.getTime()
      );
      
      if (hourRecordings.length > 0) {
        const productive = hourRecordings.filter(r => r.productive).length;
        const unproductive = hourRecordings.filter(r => !r.productive).length;
        const productivity = getProductivityLevel(productive, unproductive);
        
        timeFrameAnalysis.push({
          hour: hour,
          timeLabel: `${hour.toString().padStart(2, '0')}:00`,
          productive,
          unproductive,
          level: productivity.level,
          message: productivity.message,
          color: productivity.color,
        });
      }
    }
    
    // Calculate current productivity streak
    let currentStreak = 0;
    for (const recording of recordings) {
      if (recording.productive) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    // Today's stats
    const todayStats = {
      productive: todayRecordings.filter(r => r.productive).length,
      unproductive: todayRecordings.filter(r => !r.productive).length,
      totalHours: todayRecordings.reduce((sum, r) => sum + (r.realWorldTime / 3600000), 0),
    };
    
    // Weekly trend
    const weeklyTrend = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - (i * 24 * 60 * 60 * 1000);
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const dayRecordings = recordings.filter(
        r => r._creationTime >= dayStart && r._creationTime < dayEnd
      );
      
      const productive = dayRecordings.filter(r => r.productive).length;
      const total = dayRecordings.length;
      const score = total > 0 ? Math.round((productive / total) * 100) : 0;
      
      weeklyTrend.push({
        day: dayNames[new Date(dayStart).getDay()],
        score,
      });
    }
    
    // Find most productive time of day
    const hourlyProductivity: Record<number, { productive: number; total: number }> = {};
    
    recordings.forEach(recording => {
      const hour = new Date(recording._creationTime).getHours();
      if (!hourlyProductivity[hour]) {
        hourlyProductivity[hour] = { productive: 0, total: 0 };
      }
      hourlyProductivity[hour].total++;
      if (recording.productive) {
        hourlyProductivity[hour].productive++;
      }
    });
    
    let mostProductiveHour = 0;
    let highestRatio = 0;
    
    Object.entries(hourlyProductivity).forEach(([hour, stats]) => {
      const ratio = stats.total > 0 ? stats.productive / stats.total : 0;
      if (ratio > highestRatio && stats.total >= 3) { // Minimum 3 recordings to be significant
        highestRatio = ratio;
        mostProductiveHour = parseInt(hour);
      }
    });
    
    const mostProductiveTime = highestRatio > 0 
      ? `${mostProductiveHour.toString().padStart(2, '0')}:00 - ${((mostProductiveHour + 1) % 24).toString().padStart(2, '0')}:00`
      : "Not enough data";
    
    // Generate suggestions based on data
    const suggestions = [];
    
    if (todayStats.unproductive > todayStats.productive) {
      suggestions.push("You've had more distractions than productive sessions today. Try time-blocking.");
    }
    
    if (currentStreak > 5) {
      suggestions.push(`Great streak of ${currentStreak} productive sessions! Keep it up!`);
    } else if (currentStreak === 0) {
      suggestions.push("Start a productivity streak by focusing on your next task");
    }
    
    if (appUsage.length > 0 && appUsage[0].productivityScore < 50) {
      suggestions.push(`${appUsage[0].name} is your most used app but has low productivity. Consider limiting usage.`);
    }
    
    if (mostProductiveHour >= 0) {
      suggestions.push(`Your peak productivity is around ${mostProductiveTime}. Schedule important work then.`);
    }
    
    return {
      recentAlerts,
      appUsage,
      timeFrameAnalysis,
      currentStreak,
      todayStats,
      weeklyTrend,
      mostProductiveTime,
      suggestions,
    };
  },
});
