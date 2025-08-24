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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { api } from "@/convex/_generated/api"
import { useQuery } from "convex/react"
import {
  Activity,
  AlertTriangle,
  Brain,
  Clock,
  Focus,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import { useEffect, useState } from "react"

export default function AnalyticsPage() {
  const analytics = useQuery(api.analysis.getDetailedAnalytics)
  const [focusScore, setFocusScore] = useState(85)
  const [productivityTrend] = useState(12)

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setFocusScore(prev => Math.min(100, Math.max(0, prev + (Math.random() - 0.5) * 5)))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const stats = analytics || {
    totalRecordingTime: 0,
    totalSessions: 0,
    averageSessionLength: 0,
    mostProductiveTime: "Not enough data",
    distractionCount: 0,
    focusedTime: 0,
    breakTime: 0,
    topApplications: [],
    productivityScore: 0,
    weeklyProgress: [],
  }

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    return `${hours}h ${minutes}m`
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/10">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Analytics</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-6">
          {/* Hero Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden border-neutral-200 dark:border-neutral-800">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Focus Score</CardTitle>
                <Brain className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{focusScore}%</div>
                <Progress value={focusScore} className="mt-2 h-1" />
                <p className="text-xs text-muted-foreground mt-2">
                  {focusScore > 80 ? "Excellent focus!" : focusScore > 60 ? "Good focus" : "Needs improvement"}
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-neutral-200 dark:border-neutral-800">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Productivity Trend</CardTitle>
                {productivityTrend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {productivityTrend > 0 ? "+" : ""}{productivityTrend}%
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Compared to last week
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-neutral-200 dark:border-neutral-800">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Time Tracked</CardTitle>
                <Clock className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTime(stats.totalRecordingTime)}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Across {stats.totalSessions} sessions
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-neutral-200 dark:border-neutral-800">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Distractions</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.distractionCount}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Detected today
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-neutral-200 dark:border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activity Breakdown
                </CardTitle>
                <CardDescription>
                  How you spend your time
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Focused Work</span>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(stats.focusedTime)}
                    </span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Meetings</span>
                    <span className="text-sm text-muted-foreground">2h 15m</span>
                  </div>
                  <Progress value={20} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Breaks</span>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(stats.breakTime)}
                    </span>
                  </div>
                  <Progress value={5} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-neutral-200 dark:border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Top Applications
                </CardTitle>
                <CardDescription>
                  Most used apps today
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.topApplications.length > 0 ? (
                  stats.topApplications.map((app: { name: string; time: string }, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{app.name}</span>
                      <span className="text-sm text-muted-foreground">{app.time}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">VS Code</span>
                      <span className="text-sm text-muted-foreground">3h 45m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Chrome</span>
                      <span className="text-sm text-muted-foreground">2h 30m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Slack</span>
                      <span className="text-sm text-muted-foreground">45m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Terminal</span>
                      <span className="text-sm text-muted-foreground">30m</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Focus Insights */}
          <Card className="border-neutral-200 dark:border-neutral-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Focus className="h-5 w-5" />
                AI Insights
              </CardTitle>
              <CardDescription>
                Personalized recommendations based on your work patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Peak Performance Time
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    You&apos;re most productive between 9 AM - 11 AM. Schedule important tasks during this window.
                  </p>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 border border-green-200 dark:border-green-800">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">
                    Focus Improvement
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your focus has improved by 15% this week. Keep up the great work!
                  </p>
                </div>
                <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 p-4 border border-orange-200 dark:border-orange-800">
                  <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-1">
                    Distraction Alert
                  </h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Social media usage increased by 30% today. Consider using website blockers during work hours.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
