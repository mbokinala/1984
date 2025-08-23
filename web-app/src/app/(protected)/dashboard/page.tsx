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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUser } from "@clerk/nextjs"
import { useConvexAuth, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { CheckCircle } from "lucide-react"


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
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">
                      Building Your Application
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <div className="bg-muted/50 aspect-video rounded-xl" />
              <div className="bg-muted/50 aspect-video rounded-xl" />
              <div className="bg-muted/50 aspect-video rounded-xl" />
            </div>
            <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
          </div>
        </SidebarInset>
      </SidebarProvider>

      <Dialog open={showAuthSuccess} onOpenChange={setShowAuthSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Successfully Authenticated!
            </DialogTitle>
            <DialogDescription>
              Your desktop app is now connected. The 1984 Desktop App will launch automatically.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}
  