"use client"

import { type LucideIcon } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { ComponentType } from "react"

const DefaultLink: ComponentType<any> = (props) => <a {...props} />

export function NavSection({
  items,
  LinkComponent = DefaultLink,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
  }[],
  LinkComponent?: ComponentType<any>
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <LinkComponent href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </LinkComponent>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
} 