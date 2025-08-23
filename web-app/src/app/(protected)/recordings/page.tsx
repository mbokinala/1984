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
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Video, Clock, Calendar, FileText, Play } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export default function RecordingsPage() {
  const recordings = useQuery(api.recordings.listRecordings)

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Recordings</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                All Recordings
              </CardTitle>
              <CardDescription>
                View and manage all your screen recordings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recordings === undefined ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : recordings.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No recordings yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start recording from the desktop app to see them here
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {recordings.map((recording) => (
                    <Card key={recording._id} className="overflow-hidden">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Video className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm font-medium">
                                Recording {recording._id.substring(0, 8)}...
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDistanceToNow(recording._creationTime, { addSuffix: true })}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(recording.realWorldTime)}
                              </div>
                              <span className="text-xs">
                                Started: {formatTimestamp(recording.startTime)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {recording.analysis ? (
                              <Badge variant="secondary" className="gap-1">
                                <FileText className="h-3 w-3" />
                                Analyzed
                              </Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-6">
                          {recording.video && (
                            <div className="w-1/2 rounded-lg overflow-hidden border bg-black flex-shrink-0">
                              <video
                                controls
                                className="w-full h-auto"
                                preload="metadata"
                              >
                                <source src={recording.video} type="video/webm" />
                                <source src={recording.video} type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                            </div>
                          )}
                          
                          <div className="flex-1">
                            {recording.analysis ? (
                              <div className="space-y-2">
                                <h3 className="font-semibold text-sm">Analysis</h3>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {recording.analysis}
                                </p>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                Analysis pending...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}