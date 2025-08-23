"use client";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  Calendar,
  Clock,
  FileText,
  Maximize2,
  Play,
  Video,
} from "lucide-react";
import { useState } from "react";

export default function RecordingsPage() {
  const recordings = useQuery(api.recordings.listRecordings);
  const [expandedVideo, setExpandedVideo] = useState<{
    id: string;
    url: string;
    title: string;
  } | null>(null);

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

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
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
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
                <>
                  <div className="space-y-4">
                    {recordings.map((recording) => (
                      <Card key={recording._id} className="overflow-hidden">
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-2">
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
                                  {formatDistanceToNow(
                                    recording._creationTime,
                                    { addSuffix: true }
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(recording.realWorldTime)}
                                </div>
                                <span className="text-xs">
                                  Started:{" "}
                                  {formatTimestamp(recording.startTime)}
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
                              <div
                                className="relative w-48 h-32 rounded-lg overflow-hidden border bg-black flex-shrink-0 group cursor-pointer"
                                onClick={() =>
                                  setExpandedVideo({
                                    id: recording._id,
                                    url: recording.video ?? "",
                                    title: `Recording ${recording._id.substring(
                                      0,
                                      8
                                    )}...`,
                                  })
                                }
                              >
                                <video
                                  className="w-full h-full object-cover"
                                  preload="metadata"
                                  muted
                                >
                                  <source
                                    src={recording.video}
                                    type="video/webm"
                                  />
                                  <source
                                    src={recording.video}
                                    type="video/mp4"
                                  />
                                </video>
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-white/90 rounded-full p-3">
                                    <Play className="h-6 w-6 text-black fill-black" />
                                  </div>
                                </div>
                                <div className="absolute bottom-2 right-2 bg-black/70 rounded px-2 py-1 text-xs text-white flex items-center gap-1">
                                  <Maximize2 className="h-3 w-3" />
                                  Expand
                                </div>
                              </div>
                            )}

                            <div className="flex-1">
                              {recording.analysis ? (
                                <div className="space-y-1">
                                  <h3 className="font-semibold text-base">
                                    Description
                                  </h3>
                                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                                    {recording.analysis}
                                  </p>
                                </div>
                              ) : (
                                <div className="text-base text-muted-foreground">
                                  Analysis pending...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                  <Dialog
                    open={!!expandedVideo}
                    onOpenChange={(open) => !open && setExpandedVideo(null)}
                  >
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>{expandedVideo?.title}</DialogTitle>
                      </DialogHeader>
                      {expandedVideo && (
                        <div className="rounded-lg overflow-hidden bg-black">
                          <video controls autoPlay className="w-full h-auto">
                            <source src={expandedVideo.url} type="video/webm" />
                            <source src={expandedVideo.url} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
