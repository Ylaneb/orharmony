"use client"

import * as React from "react"
import {
  ArrowUpCircleIcon,
  BarChartIcon,
  CameraIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ListIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
  Building2Icon,
} from "lucide-react"
import Link from "next/link"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavSection } from "@/components/nav-section"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Dr. Smith",
    email: "dr.smith@hospital.com",
    avatar: "/avatars/doctor.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboardIcon,
    },
  ],
  navManagement: [
    {
      title: "Doctors",
      url: "/doctors",
      icon: UsersIcon,
    },
    {
      title: "Operating Rooms",
      url: "/operating-rooms",
      icon: Building2Icon,
    },
    {
      title: "Surgeries",
      url: "/surgeries",
      icon: FileTextIcon,
    },
  ],
  navPresence: [
    {
      title: "Time off requests",
      url: "/time-off",
      icon: FileIcon,
    },
    {
      title: "Absence report",
      url: "/absences",
      icon: BarChartIcon,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: SettingsIcon,
    },
    {
      title: "Get Help",
      url: "/help",
      icon: HelpCircleIcon,
    },
    {
      title: "Search",
      url: "/search",
      icon: SearchIcon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <ArrowUpCircleIcon className="h-5 w-5" />
                <span className="text-base font-semibold">OR Harmony</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} LinkComponent={Link} />
        <div className="px-3 py-2">
          <h3 className="mb-2 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Management</h3>
          <NavSection items={data.navManagement} LinkComponent={Link} />
        </div>
        <div className="px-3 py-2">
          <h3 className="mb-2 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Presence</h3>
          <NavSection items={data.navPresence} LinkComponent={Link} />
        </div>
        <NavSecondary items={data.navSecondary} className="mt-auto" LinkComponent={Link} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
