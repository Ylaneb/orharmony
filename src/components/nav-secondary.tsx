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
          <SidebarMenuButton asChild tooltip={item.title}>
            <LinkComponent href={item.url}>
              {item.icon && <item.icon className="mr-2 h-4 w-4" />}
              <span>{item.title}</span>
            </LinkComponent>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
