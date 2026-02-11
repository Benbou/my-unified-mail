"use client"

import * as React from "react"
import { Inbox, Mail, Send, Trash2, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { EmailHeader } from "@/lib/email"

const navMain = [
  { title: "Tous", icon: Inbox, filter: null },
  { title: "Perso", icon: Mail, filter: "Perso" },
  { title: "Pro", icon: Users, filter: "Pro" },
  { title: "Envoyés", icon: Send, filter: "__sent__" },
  { title: "Corbeille", icon: Trash2, filter: "__trash__" },
]

const formatDate = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }
  if (days === 1) return "Hier"
  if (days < 7) return `Il y a ${days}j`
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(date))
}

export { navMain }

export function EmailList({
  emails,
  selectedEmail,
  onSelectEmail,
  activeFilter,
}: {
  emails: EmailHeader[]
  selectedEmail: EmailHeader | null
  onSelectEmail: (email: EmailHeader) => void
  activeFilter: string | null
}) {
  const [search, setSearch] = React.useState("")

  const activeItem = navMain.find((n) => n.filter === activeFilter) ?? navMain[0]

  const filteredEmails = React.useMemo(() => {
    let result = emails

    if (activeItem.filter && !activeItem.filter.startsWith("__")) {
      result = result.filter((e) => e.accountLabel === activeItem.filter)
    }

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (e) =>
          e.subject.toLowerCase().includes(q) ||
          e.from.toLowerCase().includes(q)
      )
    }

    return result
  }, [emails, activeItem, search])

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4 pb-3">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-foreground text-base font-medium">
            {activeItem.title}
          </div>
          <Label className="flex items-center gap-2 text-sm">
            <span>Non lus</span>
            <Switch className="shadow-none" />
          </Label>
        </div>
        <div className="mt-3 w-full">
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredEmails.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">
            Aucun email trouvé.
          </div>
        )}
        {filteredEmails.map((email) => {
          const isSelected =
            selectedEmail?.id === email.id &&
            selectedEmail?.accountLabel === email.accountLabel
          return (
            <button
              key={`${email.accountLabel}-${email.id}`}
              type="button"
              onClick={() => onSelectEmail(email)}
              className={`flex w-full flex-col items-start gap-2 border-b p-4 text-left text-sm leading-tight last:border-b-0 ${
                isSelected
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50 hover:text-accent-foreground"
              }`}
            >
              <div className="flex w-full items-center gap-2">
                <span className="truncate font-medium">{email.from}</span>
                <span
                  className={`ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    email.accountLabel === "Perso"
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                  }`}
                >
                  {email.accountLabel}
                </span>
              </div>
              <div className="flex w-full items-center gap-2">
                <span className="truncate">{email.subject}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {formatDate(email.date)}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
