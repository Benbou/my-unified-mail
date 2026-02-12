"use client"

import * as React from "react"
import {
  Archive,
  ChevronRight,
  Inbox,
  Mail,
  Send,
  Trash2,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

export type SidebarFilter = {
  folder: "inbox" | "sent" | "trash" | "archive"
  account?: string // "Perso" | "Pro" — undefined means unified (all accounts)
}

export function filterToString(f: SidebarFilter): string {
  const prefix = f.account ?? "unified"
  return `${prefix}:${f.folder}`
}

export function parseFilter(s: string): SidebarFilter {
  const [prefix, folder] = s.split(":")
  return {
    folder: folder as SidebarFilter["folder"],
    account: prefix === "unified" ? undefined : prefix,
  }
}

const unifiedItems = [
  { label: "Boîte de réception", folder: "inbox" as const, icon: Inbox },
  { label: "Envoyés", folder: "sent" as const, icon: Send },
  { label: "Corbeille", folder: "trash" as const, icon: Trash2 },
  { label: "Archives", folder: "archive" as const, icon: Archive },
]

const accounts = [
  { label: "Perso", value: "Perso" },
  { label: "Pro", value: "Pro" },
]

const accountFolders = [
  { label: "Boîte de réception", folder: "inbox" as const, icon: Inbox },
  { label: "Envoyés", folder: "sent" as const, icon: Send },
  { label: "Corbeille", folder: "trash" as const, icon: Trash2 },
]

export function AppSidebar({
  activeFilter,
  onFilterChange,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  activeFilter: string
  onFilterChange: (filter: string) => void
}) {
  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden border-r"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
              <a href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Mail className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Unified Mail</span>
                  <span className="truncate text-xs">Gmail</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Section 1: Unified */}
        <SidebarGroup>
          <SidebarGroupLabel>Unified</SidebarGroupLabel>
          <SidebarGroupContent className="px-1.5 md:px-0">
            <SidebarMenu>
              {unifiedItems.map((item) => {
                const filterStr = filterToString({ folder: item.folder })
                return (
                  <SidebarMenuItem key={item.folder}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.label,
                        hidden: false,
                      }}
                      onClick={() => onFilterChange(filterStr)}
                      isActive={activeFilter === filterStr}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Section 2: Comptes */}
        <SidebarGroup>
          <SidebarGroupLabel>Comptes</SidebarGroupLabel>
          <SidebarGroupContent className="px-1.5 md:px-0">
            <SidebarMenu>
              {accounts.map((account) => (
                <Collapsible key={account.value} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        tooltip={{
                          children: account.label,
                          hidden: false,
                        }}
                        className="px-2.5 md:px-2"
                      >
                        <Mail />
                        <span>{account.label}</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {accountFolders.map((folder) => {
                          const filterStr = filterToString({
                            folder: folder.folder,
                            account: account.value,
                          })
                          return (
                            <SidebarMenuSubItem key={folder.folder}>
                              <SidebarMenuSubButton
                                onClick={() => onFilterChange(filterStr)}
                                data-active={activeFilter === filterStr}
                                className="cursor-pointer"
                              >
                                <folder.icon />
                                <span>{folder.label}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
