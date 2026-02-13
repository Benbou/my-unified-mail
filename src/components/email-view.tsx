"use client"

import { useEffect, useState } from "react"
import type { EmailHeader } from "@/lib/email"
import { Skeleton } from "@/components/ui/skeleton"
import { getEmailBody, markAsRead } from "@/app/actions"

const formatFullDate = (date: Date) => {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function EmailView({ email }: { email: EmailHeader | null }) {
  const [body, setBody] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!email) {
      setBody(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setBody(null)
    setLoading(true)
    setError(null)

    getEmailBody(email.id, email.accountLabel, email.folder)
      .then((html) => {
        if (cancelled) return
        setBody(html)
        setLoading(false)
        return markAsRead(email.id, email.accountLabel)
      })
      .catch(() => {
        if (cancelled) return
        setError("Impossible de charger le contenu de cet email.")
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [email?.id, email?.accountLabel, email?.folder])

  if (!email) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-muted-foreground">
        <p className="text-lg">Sélectionnez un email pour le lire</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{email.subject}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{email.from}</span>
          <span>&middot;</span>
          <span>{formatFullDate(email.date)}</span>
          <span
            className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-medium ${
              email.accountLabel === "Perso"
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
            }`}
          >
            {email.accountLabel}
          </span>
        </div>
      </div>
      <div className="border-t pt-4">
        {loading && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {body !== null && !loading && !error && (
          body ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Le contenu de cet email n&apos;a pas pu être chargé.
            </p>
          )
        )}
      </div>
    </div>
  )
}
