"use client"

import * as React from "react"
import { PenSquare } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { EmailList } from "@/components/email-list"
import { EmailView } from "@/components/email-view"
import { EmailComposer } from "@/components/email-composer"
import { Button } from "@/components/ui/button"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import type { EmailHeader } from "@/lib/email"
import { syncEmails } from "@/app/actions"

export function MailLayout({ emails: initialEmails }: { emails: EmailHeader[] }) {
  const [emails, setEmails] = React.useState<EmailHeader[]>(initialEmails)
  const [selectedEmail, setSelectedEmail] = React.useState<EmailHeader | null>(
    null
  )
  const [composing, setComposing] = React.useState(false)
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null)

  // Background sync: fetch fresh emails from IMAP and update state
  React.useEffect(() => {
    let cancelled = false
    syncEmails()
      .then((fresh) => {
        if (!cancelled && fresh.length > 0) {
          // Dates come back as strings from the server action, rehydrate them
          const rehydrated = fresh.map((e) => ({
            ...e,
            date: new Date(e.date),
          }))
          setEmails(rehydrated)
        }
      })
      .catch((err) => {
        console.error("Background sync failed:", err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSelectEmail = (email: EmailHeader) => {
    setComposing(false)
    setSelectedEmail(email)
  }

  const handleCompose = () => {
    setSelectedEmail(null)
    setComposing(true)
  }

  const handleCloseComposer = () => {
    setComposing(false)
  }

  const breadcrumbLabel = composing
    ? "Nouveau message"
    : selectedEmail
      ? selectedEmail.subject
      : "Boîte de réception"

  return (
    <SidebarProvider>
      <AppSidebar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      <SidebarInset className="overflow-hidden">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          {/* Middle panel: email list */}
          <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
            <EmailList
              emails={emails}
              selectedEmail={selectedEmail}
              onSelectEmail={handleSelectEmail}
              activeFilter={activeFilter}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right panel: reading pane / composer */}
          <ResizablePanel defaultSize={65} minSize={40}>
            <div className="flex h-full flex-col">
              <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4"
                />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="truncate max-w-[300px]">
                        {breadcrumbLabel}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <Button
                  variant="default"
                  size="sm"
                  className="ml-auto"
                  onClick={handleCompose}
                >
                  <PenSquare className="mr-2 h-4 w-4" />
                  Nouveau message
                </Button>
              </header>
              <div className="flex-1 overflow-y-auto">
                {composing ? (
                  <EmailComposer onClose={handleCloseComposer} />
                ) : (
                  <EmailView email={selectedEmail} />
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </SidebarInset>
    </SidebarProvider>
  )
}
