"use client"

import * as React from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { PenSquare } from "lucide-react"
import { AppSidebar, parseFilter } from "@/components/app-sidebar"
import { EmailList } from "@/components/email-list"
import { EmailView } from "@/components/email-view"
import { EmailComposer } from "@/components/email-composer"
import { MailActions } from "@/components/mail-actions"
import { Button } from "@/components/ui/button"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import type { EmailHeader } from "@/lib/email"
import { syncEmails } from "@/app/actions"

const folderLabels: Record<string, string> = {
  inbox: "Boîte de réception",
  sent: "Envoyés",
  trash: "Corbeille",
  archive: "Archives",
}

export function MailLayout({ emails: initialEmails }: { emails: EmailHeader[] }) {
  const [emails, setEmails] = React.useState<EmailHeader[]>(initialEmails)
  const [selectedEmail, setSelectedEmail] = React.useState<EmailHeader | null>(
    null
  )
  const [composing, setComposing] = React.useState(false)
  const [activeFilter, setActiveFilter] = React.useState("unified:inbox")

  const handleFilterChange = React.useCallback((filter: string) => {
    setActiveFilter(filter)
    setSelectedEmail(null)
    setComposing(false)
  }, [])

  // Keyboard shortcuts
  useHotkeys("e", () => {
    if (selectedEmail) console.log("Archive", selectedEmail.subject)
  }, { enableOnFormTags: false }, [selectedEmail])

  useHotkeys("shift+3, backspace", () => {
    if (selectedEmail) console.log("Trash", selectedEmail.subject)
  }, { enableOnFormTags: false }, [selectedEmail])

  useHotkeys("r", () => {
    if (selectedEmail) console.log("Reply", selectedEmail.subject)
  }, { enableOnFormTags: false }, [selectedEmail])

  useHotkeys("escape", () => {
    if (composing) setComposing(false)
    if (selectedEmail) setSelectedEmail(null)
  }, { enableOnFormTags: true }, [selectedEmail, composing])

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

  const f = parseFilter(activeFilter)
  const folderName = folderLabels[f.folder] ?? f.folder
  const filterLabel = f.account ? `${f.account} — ${folderName}` : folderName

  const breadcrumbLabel = composing
    ? "Nouveau message"
    : selectedEmail
      ? selectedEmail.subject
      : filterLabel

  return (
    <SidebarProvider defaultOpen={false} className="h-screen !min-h-0 overflow-hidden">
      <AppSidebar
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />
      <SidebarInset className="flex h-full overflow-hidden">
        {/* Middle column: email list (fixed 450px) */}
        <div className="w-[450px] shrink-0 border-r h-full">
          <EmailList
            emails={emails}
            selectedEmail={selectedEmail}
            onSelectEmail={handleSelectEmail}
            activeFilter={activeFilter}
          />
        </div>

        {/* Right column: reading pane / composer (takes remaining space) */}
        <div className="flex-1 min-w-0 flex flex-col h-full">
          <header className="bg-background sticky top-0 flex shrink-0 items-center gap-2 border-b p-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="truncate max-w-[300px]">
                    {breadcrumbLabel}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              {selectedEmail && !composing && (
                <MailActions email={selectedEmail} />
              )}
              <Button
                variant="default"
                size="sm"
                onClick={handleCompose}
              >
                <PenSquare className="mr-2 h-4 w-4" />
                Nouveau message
              </Button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">
            {composing ? (
              <EmailComposer onClose={handleCloseComposer} />
            ) : (
              <EmailView email={selectedEmail} />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
