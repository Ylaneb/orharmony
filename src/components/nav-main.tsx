"use client"

import { MailIcon, PlusCircleIcon, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { ComponentType } from "react"

const DefaultLink: ComponentType<any> = (props) => <a {...props} />

export function NavMain({
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
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-1">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="min-w-6 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground text-xs"
            >
              <PlusCircleIcon className="h-3 w-3" />
              <span className="text-xs">Quick Create</span>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="h-7 w-7 shrink-0 group-data-[collapsible=icon]:opacity-0"
              variant="outline"
            >
              <MailIcon className="h-3 w-3" />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} className="text-xs">
                <LinkComponent href={item.url}>
                  {item.icon && <item.icon className="h-3 w-3" />}
                  <span className="text-xs">{item.title}</span>
                </LinkComponent>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
