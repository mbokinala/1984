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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Activity, Brain, CheckCircle, Clock, Play, TrendingUp, Video, Zap } from "lucide-react"
import Link from "next/link"


export default function Page() {
  const { user, isLoaded } = useUser()
  const { isAuthenticated } = useConvexAuth()
  const storeUser = useMutation(api.users.store)
  const searchParams = useSearchParams()
  const [showAuthSuccess, setShowAuthSuccess] = useState(false)

  useEffect(() => {
    const electronAuth = searchParams.get("electronAuth")
    if (electronAuth === "success") {
      setShowAuthSuccess(true)
      // Auto-close after 3 seconds
      setTimeout(() => {
        setShowAuthSuccess(false)
      }, 3000)
    }
  }, [searchParams])

  // Store user in Convex when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("Dashboard: Storing user in Convex", user);
      storeUser()
        .then((userId) => {
          console.log("Dashboard: User stored successfully with ID:", userId);
        })
        .catch((error) => {
          console.error("Dashboard: Error storing user:", error);
        });
    }
  }, [isAuthenticated, user, storeUser])


  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/10">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          
          <div className="flex flex-1 flex-col gap-6 p-6">
            {/* Welcome Section */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome back{user?.firstName ? `, ${user.firstName}` : ""}!
              </h1>
              <p className="text-muted-foreground">
                Here's what's happening with your productivity today.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="relative overflow-hidden border-neutral-200 dark:border-neutral-800">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Focus</CardTitle>
                  <Brain className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">87%</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+12%</span> from yesterday
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-neutral-200 dark:border-neutral-800">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Time</CardTitle>
                  <Clock className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4h 32m</div>
                  <p className="text-xs text-muted-foreground">3 sessions today</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-neutral-200 dark:border-neutral-800">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Productivity</CardTitle>
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">+24%</div>
                  <p className="text-xs text-muted-foreground">This week</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-neutral-200 dark:border-neutral-800">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recordings</CardTitle>
                  <Video className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">This week</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
              {/* Recent Activity */}
              <Card className="lg:col-span-4 border-neutral-200 dark:border-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Your latest recorded sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <Video className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Coding Session</p>
                          <p className="text-sm text-muted-foreground">VS Code - 2h 15m</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Productive</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                          <Video className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Team Meeting</p>
                          <p className="text-sm text-muted-foreground">Zoom - 45m</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Meeting</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <Video className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">Research</p>
                          <p className="text-sm text-muted-foreground">Chrome - 1h 30m</p>
                        </div>
                      </div>
                      <Badge variant="secondary">Learning</Badge>
                    </div>
                  </div>
                  <Link href="/recordings">
                    <Button variant="outline" className="w-full mt-4">
                      View All Recordings
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="lg:col-span-3 border-neutral-200 dark:border-neutral-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Control your productivity tracking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <Play className="h-4 w-4" />
                    Start Recording
                  </Button>
                  <Link href="/analytics" className="block">
                    <Button className="w-full justify-start gap-2" variant="outline">
                      <ChartBar className="h-4 w-4" />
                      View Analytics
                    </Button>
                  </Link>
                  <Button className="w-full justify-start gap-2" variant="outline">
                    <Brain className="h-4 w-4" />
                    Focus Mode
                  </Button>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Today's Goal</h4>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Complete 5 hours of focused work
                      </p>
                      <div className="mt-2 h-2 rounded-full bg-blue-200 dark:bg-blue-900">
                        <div className="h-full w-[65%] rounded-full bg-blue-600" />
                      </div>
                      <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">65% complete</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>

      <Dialog open={showAuthSuccess} onOpenChange={setShowAuthSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
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
  