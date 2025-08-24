"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Video,
  ChartBar,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Recordings",
    url: "/recordings",
    icon: Video,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: ChartBar,
  },
]

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader className="border-b border-border/10">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/dashboard" className="py-2">
              <Image src="/logo.svg" alt="1984" width={100} height={50} className="dark:invert" />
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-neutral-900/90 to-neutral-800/90 text-white shadow-lg shadow-neutral-900/20 border border-neutral-700/50"
                          : "hover:bg-neutral-100/10 text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                      }`}
                    >
                      <Link href={item.url} className="flex items-center gap-3 px-3 py-2.5">
                        <item.icon className={`h-4 w-4 ${
                          isActive ? "text-white" : ""
                        }`} />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/10">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
