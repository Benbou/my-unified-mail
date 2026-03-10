"use client"

import * as React from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { PenSquare } from "lucide-react"
import { toast } from "sonner"
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
import { archiveEmail, trashEmail } from "@/app/actions"
import type { EmailHeader, ComposeState, ComposeMode } from "@/lib/email-types"
import { buildComposeState, composeTitles } from "@/lib/email-types"

const folderLabels: Record<string, string> = {
  inbox: "Boîte de réception",
  sent: "Envoyés",
  trash: "Corbeille",
  archive: "Archives",
}

function emailKey(e: EmailHeader) {
  return `${e.accountLabel}-${e.id}`
}

export function MailLayout({ emails: initialEmails }: { emails: EmailHeader[] }) {
  const [emails, setEmails] = React.useState<EmailHeader[]>(initialEmails)
  const [selectedEmail, setSelectedEmail] = React.useState<EmailHeader | null>(
    null
  )
  const [composeState, setComposeState] = React.useState<ComposeState | null>(null)
  const [activeFilter, setActiveFilter] = React.useState("unified:inbox")
  const [pendingRemovals, setPendingRemovals] = React.useState<Set<string>>(
    () => new Set()
  )

  // Store the current email body for reply quoting (no re-render needed)
  const bodyRef = React.useRef<string>("")

  const handleFilterChange = React.useCallback((filter: string) => {
    setActiveFilter(filter)
    setSelectedEmail(null)
    setComposeState(null)
  }, [])

  const handleEmailAction = React.useCallback(
    async (email: EmailHeader, action: "archive" | "trash") => {
      const key = emailKey(email)

      // Optimistic: hide immediately
      setPendingRemovals((prev) => new Set(prev).add(key))

      // Clear selection if it's the actioned email
      setSelectedEmail((sel) =>
        sel && emailKey(sel) === key ? null : sel
      )

      try {
        if (action === "archive") {
          await archiveEmail(email.id, email.accountLabel, email.folder)
          toast.success("Email archivé")
        } else {
          await trashEmail(email.id, email.accountLabel, email.folder)
          toast.success("Email supprimé")
        }

        // Remove from local state on success
        setEmails((prev) => prev.filter((e) => emailKey(e) !== key))
        setPendingRemovals((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      } catch (err) {
        console.error(`${action} failed:`, err)
        // Rollback: show again
        setPendingRemovals((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
        toast.error(
          action === "archive"
            ? "Erreur lors de l'archivage"
            : "Erreur lors de la suppression"
        )
      }
    },
    []
  )

  const handleArchive = React.useCallback(() => {
    if (selectedEmail) handleEmailAction(selectedEmail, "archive")
  }, [selectedEmail, handleEmailAction])

  const handleTrash = React.useCallback(() => {
    if (selectedEmail) handleEmailAction(selectedEmail, "trash")
  }, [selectedEmail, handleEmailAction])

  const handleComposeMode = React.useCallback((mode: ComposeMode) => {
    if (!selectedEmail) return
    setComposeState(buildComposeState(mode, selectedEmail, bodyRef.current))
  }, [selectedEmail])

  const handleBodyLoaded = React.useCallback((body: string) => {
    bodyRef.current = body
  }, [])

  // Keyboard shortcuts
  useHotkeys("e", () => {
    if (selectedEmail) handleEmailAction(selectedEmail, "archive")
  }, { enableOnFormTags: false }, [selectedEmail, handleEmailAction])

  useHotkeys("shift+3, backspace", () => {
    if (selectedEmail) handleEmailAction(selectedEmail, "trash")
  }, { enableOnFormTags: false }, [selectedEmail, handleEmailAction])

  useHotkeys("r", () => {
    if (selectedEmail) handleComposeMode("reply")
  }, { enableOnFormTags: false }, [selectedEmail, handleComposeMode])

  useHotkeys("shift+r", () => {
    if (selectedEmail) handleComposeMode("replyAll")
  }, { enableOnFormTags: false }, [selectedEmail, handleComposeMode])

  useHotkeys("f", () => {
    if (selectedEmail) handleComposeMode("forward")
  }, { enableOnFormTags: false }, [selectedEmail, handleComposeMode])

  useHotkeys("escape", () => {
    if (composeState) setComposeState(null)
    else if (selectedEmail) setSelectedEmail(null)
  }, { enableOnFormTags: true }, [selectedEmail, composeState])

  // Background sync via Route Handler with polling every 60s
  React.useEffect(() => {
    let cancelled = false
    const syncingRef = { current: false }

    const doSync = () => {
      if (syncingRef.current) return
      syncingRef.current = true

      fetch("/api/sync")
        .then((res) => res.json())
        .then((fresh: EmailHeader[]) => {
          if (!cancelled && fresh.length > 0) {
            const rehydrated = fresh.map((e) => ({
              ...e,
              date: new Date(e.date),
            }))
            // Only update if email IDs changed to avoid no-op re-renders
            setEmails((prev) => {
              const prevIds = prev.map((e) => `${e.accountLabel}-${e.id}`).join(",")
              const newIds = rehydrated.map((e) => `${e.accountLabel}-${e.id}`).join(",")
              return prevIds === newIds ? prev : rehydrated
            })
          }
        })
        .catch((err) => {
          console.error("Background sync failed:", err)
        })
        .finally(() => {
          syncingRef.current = false
        })
    }

    doSync()
    const interval = setInterval(doSync, 60_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const handleSelectEmail = (email: EmailHeader) => {
    setComposeState(null)
    setSelectedEmail(email)
  }

  const handleCompose = () => {
    setSelectedEmail(null)
    setComposeState({
      mode: "new",
      to: "",
      cc: "",
      subject: "",
      quotedBody: "",
      accountLabel: "Perso",
    })
  }

  const handleCloseComposer = () => {
    setComposeState(null)
  }

  const f = parseFilter(activeFilter)
  const folderName = folderLabels[f.folder] ?? f.folder
  const filterLabel = f.account ? `${f.account} — ${folderName}` : folderName

  const breadcrumbLabel = composeState
    ? composeTitles[composeState.mode]
    : selectedEmail
      ? selectedEmail.subject
      : filterLabel

  return (
    <SidebarProvider defaultOpen={false} className="h-screen !min-h-0 overflow-hidden">
      <AppSidebar
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />
      <SidebarInset className="flex flex-row h-full overflow-hidden">
        {/* Middle column: email list (fixed 450px) */}
        <div className="w-[450px] shrink-0 border-r h-full">
          <EmailList
            emails={emails}
            selectedEmail={selectedEmail}
            onSelectEmail={handleSelectEmail}
            activeFilter={activeFilter}
            pendingRemovals={pendingRemovals}
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
              {selectedEmail && !composeState && (
                <MailActions
                  onArchive={handleArchive}
                  onTrash={handleTrash}
                  onReply={() => handleComposeMode("reply")}
                  onReplyAll={() => handleComposeMode("replyAll")}
                  onForward={() => handleComposeMode("forward")}
                />
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
            {composeState ? (
              <EmailComposer
                key={composeState.mode + composeState.subject}
                composeState={composeState}
                onClose={handleCloseComposer}
              />
            ) : (
              <EmailView
                email={selectedEmail}
                onBodyLoaded={handleBodyLoaded}
              />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
