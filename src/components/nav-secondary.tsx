"use client"

import * as React from "react"
import { type LucideIcon } from "lucide-react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { ComponentType } from "react"

const DefaultLink: ComponentType<any> = (props) => <a {...props} />

export function NavSecondary({
  items,
  className,
  LinkComponent = DefaultLink,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
  }[],
  className?: string
  LinkComponent?: ComponentType<any>
}) {
  return (
    <SidebarMenu className={className}>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild tooltip={item.title} className="text-xs">
            <LinkComponent href={item.url}>
              {item.icon && <item.icon className="mr-1 h-3 w-3" />}
              <span className="text-xs">{item.title}</span>
            </LinkComponent>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
