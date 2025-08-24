"use client"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUser } from "@clerk/nextjs"
import { useConvexAuth, useMutation, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Zap, 
  Target,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Flame,
  BarChart3,
  Calendar,
  Brain,
  Lightbulb,
} from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

// Function to get favicon using Google's service
function getAppIcon(appName: string, appDomain?: string) {
  // If domain is provided, use it directly
  if (appDomain) {
    return `https://www.google.com/s2/favicons?domain=${appDomain}&sz=64`;
  }
  
  // Otherwise, try to guess the domain from app name
  const name = appName.toLowerCase().replace(/\s+/g, '');
  const commonDomains: Record<string, string> = {
    'youtube': 'youtube.com',
    'gmail': 'gmail.com',
    'google': 'google.com',
    'slack': 'slack.com',
    'discord': 'discord.com',
    'notion': 'notion.so',
    'figma': 'figma.com',
    'vscode': 'code.visualstudio.com',
    'visualstudio': 'visualstudio.com',
    'github': 'github.com',
    'gitlab': 'gitlab.com',
    'chatgpt': 'chat.openai.com',
    'claude': 'claude.ai',
    'twitter': 'twitter.com',
    'x': 'x.com',
    'reddit': 'reddit.com',
    'stackoverflow': 'stackoverflow.com',
    'linear': 'linear.app',
    'jira': 'atlassian.com',
    'zoom': 'zoom.us',
    'teams': 'teams.microsoft.com',
    'spotify': 'spotify.com',
    'netflix': 'netflix.com',
  };
  
  const fallbackDomain = commonDomains[name] || `${name}.com`;
  return `https://www.google.com/s2/favicons?domain=${fallbackDomain}&sz=64`;
}

interface DashboardData {
  recentAlerts: Array<{
    type: "warning" | "critical" | "info";
    time: string;
    message: string;
    suggestion: string;
  }>;
  appUsage: Array<{
    name: string;
    domain?: string;
    count: number;
    productive: number;
    unproductive: number;
    productivityScore: number;
  }>;
  timeFrameAnalysis: Array<{
    hour: number;
    timeLabel: string;
    productive: number;
    unproductive: number;
    level: "high" | "medium" | "low" | "critical";
    message: string;
    color: string;
  }>;
  currentStreak: number;
  todayStats: {
    productive: number;
    unproductive: number;
    totalHours: number;
  };
  weeklyTrend: Array<{
    day: string;
    score: number;
  }>;
  mostProductiveTime: string;
  suggestions: string[];
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const { isAuthenticated } = useConvexAuth()
  const storeUser = useMutation(api.users.store)
  const searchParams = useSearchParams()
  const [showAuthSuccess, setShowAuthSuccess] = useState(false)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  
  const generateDashboard = useAction(api.dashboard.generateDashboard)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const data = await generateDashboard()
        setDashboardData(data)
      } catch (error) {
        console.error("Error fetching dashboard:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [generateDashboard])

  useEffect(() => {
    const electronAuth = searchParams.get("electronAuth")
    if (electronAuth === "success") {
      setShowAuthSuccess(true)
      setTimeout(() => {
        setShowAuthSuccess(false)
      }, 3000)
    }
  }, [searchParams])

  useEffect(() => {
    if (isAuthenticated && user) {
      storeUser().catch(console.error)
    }
  }, [isAuthenticated, user, storeUser])

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {loading ? (
              <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">AI is analyzing your productivity...</p>
                </div>
              </div>
            ) : dashboardData ? (
              <>
                {/* Alerts Section */}
                {dashboardData.recentAlerts.length > 0 && (
                  <div className="space-y-2">
                    {dashboardData.recentAlerts.map((alert, index) => (
                      <Alert key={index} variant={alert.type === "critical" ? "destructive" : "default"}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>{alert.message}</AlertTitle>
                        <AlertDescription>
                          <span className="text-sm text-muted-foreground">{alert.time}</span>
                          <br />
                          {alert.suggestion}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Key Metrics */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                      <Flame className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData.currentStreak}</div>
                      <p className="text-xs text-muted-foreground">
                        Productive sessions in a row
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Today's Focus</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardData.todayStats.totalHours.toFixed(1)}h
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-green-600">
                          {dashboardData.todayStats.productive} productive
                        </span>
                        <span className="text-xs text-red-600">
                          {dashboardData.todayStats.unproductive} distracted
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Peak Hours</CardTitle>
                      <Zap className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboardData.mostProductiveTime}</div>
                      <p className="text-xs text-muted-foreground">
                        Most productive time
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Today's Score</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {dashboardData.todayStats.productive + dashboardData.todayStats.unproductive > 0
                          ? Math.round((dashboardData.todayStats.productive / (dashboardData.todayStats.productive + dashboardData.todayStats.unproductive)) * 100)
                          : 0}%
                      </div>
                      <Progress 
                        value={dashboardData.todayStats.productive + dashboardData.todayStats.unproductive > 0
                          ? (dashboardData.todayStats.productive / (dashboardData.todayStats.productive + dashboardData.todayStats.unproductive)) * 100
                          : 0} 
                        className="mt-2 h-2"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Time Frame Analysis */}
                {dashboardData.timeFrameAnalysis.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Today's Productivity Timeline</CardTitle>
                      <CardDescription>Hour-by-hour productivity analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dashboardData.timeFrameAnalysis.map((timeFrame, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <span className="text-sm font-medium w-12">{timeFrame.timeLabel}</span>
                            <div className="flex-1 flex items-center gap-2">
                              <div className="flex gap-1">
                                {Array.from({ length: Math.min(timeFrame.productive, 10) }).map((_, i) => (
                                  <div key={`p-${i}`} className="w-2 h-4 bg-green-500 rounded-sm" />
                                ))}
                                {Array.from({ length: Math.min(timeFrame.unproductive, 10) }).map((_, i) => (
                                  <div key={`u-${i}`} className="w-2 h-4 bg-red-500 rounded-sm" />
                                ))}
                              </div>
                              <Badge variant={
                                timeFrame.level === "high" ? "default" :
                                timeFrame.level === "medium" ? "secondary" :
                                timeFrame.level === "low" ? "outline" :
                                "destructive"
                              }>
                                {timeFrame.message}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {/* App Usage */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Most Used Apps</CardTitle>
                      <CardDescription>Your top applications by usage</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {dashboardData.appUsage.slice(0, 8).map((app, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img 
                                src={getAppIcon(app.name, app.domain)} 
                                alt={app.name}
                                className="w-6 h-6 rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                              <div>
                                <p className="text-sm font-medium">{app.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {app.count} sessions
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={app.productivityScore >= 70 ? "default" : app.productivityScore >= 40 ? "secondary" : "destructive"}>
                                {app.productivityScore}% productive
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Weekly Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Weekly Productivity Trend</CardTitle>
                      <CardDescription>Your productivity score over the past week</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={dashboardData.weeklyTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#8884d8" 
                            strokeWidth={2}
                            dot={{ fill: '#8884d8' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Suggestions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      AI Suggestions
                    </CardTitle>
                    <CardDescription>Personalized recommendations based on your activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {dashboardData.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                          <p className="text-sm">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex items-center justify-center h-[60vh]">
                <Card className="max-w-md">
                  <CardHeader>
                    <CardTitle>No Data Available</CardTitle>
                    <CardDescription>
                      Start recording your screen activities to see your dashboard.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>

      <Dialog open={showAuthSuccess} onOpenChange={setShowAuthSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Successfully Authenticated!
            </DialogTitle>
            <DialogDescription>
              Your desktop app is now connected. 1984 will launch automatically.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}