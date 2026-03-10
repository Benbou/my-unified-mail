"use client"

import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Send,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ComposeState } from "@/lib/email-types"
import { composeTitles } from "@/lib/email-types"

function ToolbarButton({
  onClick,
  isActive,
  children,
  title,
}: {
  onClick: () => void
  isActive?: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {children}
    </button>
  )
}

export function EmailComposer({
  composeState,
  onClose,
}: {
  composeState: ComposeState
  onClose: () => void
}) {
  const [from, setFrom] = React.useState(composeState.accountLabel)
  const [to, setTo] = React.useState(composeState.to)
  const [cc, setCc] = React.useState(composeState.cc)
  const [subject, setSubject] = React.useState(composeState.subject)
  const [sending, setSending] = React.useState(false)
  const [showCc, setShowCc] = React.useState(
    composeState.mode === "replyAll" || !!composeState.cc
  )

  const editor = useEditor({
    extensions: [StarterKit],
    content: composeState.quotedBody,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] focus:outline-none px-4 py-3",
      },
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!to || !editor) return

    setSending(true)
    try {
      const { sendEmail } = await import("@/app/actions")
      await sendEmail({
        from,
        to,
        cc: cc || undefined,
        subject,
        body: editor.getHTML(),
      })
      onClose()
    } catch (err) {
      console.error("Erreur lors de l'envoi:", err)
    } finally {
      setSending(false)
    }
  }

  const title = composeTitles[composeState.mode]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-0 h-full">
        <div className="flex items-center justify-between border-b px-6 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-col gap-0 border-b">
          <div className="flex items-center gap-3 border-b px-6 py-2">
            <label
              htmlFor="composer-from"
              className="text-sm font-medium text-muted-foreground w-10"
            >
              De
            </label>
            <select
              id="composer-from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="flex h-9 rounded-md bg-transparent text-sm focus:outline-none"
            >
              <option value="Perso">Perso</option>
              <option value="Pro">Pro</option>
            </select>
          </div>
          <div className="flex items-center gap-3 border-b px-6 py-2">
            <label
              htmlFor="composer-to"
              className="text-sm font-medium text-muted-foreground w-10"
            >
              À
            </label>
            <Input
              id="composer-to"
              type="email"
              placeholder="destinataire@email.com"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              className="border-0 shadow-none focus-visible:ring-0 px-0"
            />
            {!showCc && (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                Cc
              </button>
            )}
          </div>
          {showCc && (
            <div className="flex items-center gap-3 border-b px-6 py-2">
              <label
                htmlFor="composer-cc"
                className="text-sm font-medium text-muted-foreground w-10"
              >
                Cc
              </label>
              <Input
                id="composer-cc"
                type="text"
                placeholder="cc@email.com"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0 px-0"
              />
            </div>
          )}
          <div className="flex items-center gap-3 px-6 py-2">
            <label
              htmlFor="composer-subject"
              className="text-sm font-medium text-muted-foreground w-10"
            >
              Objet
            </label>
            <Input
              id="composer-subject"
              placeholder="Objet du message"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 px-0"
            />
          </div>
        </div>

        {editor && (
          <div className="flex items-center gap-0.5 border-b px-6 py-1.5">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive("bold")}
              title="Gras"
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive("italic")}
              title="Italique"
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={editor.isActive("heading", { level: 2 })}
              title="Titre"
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive("bulletList")}
              title="Liste à puces"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive("orderedList")}
              title="Liste numérotée"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
          </div>
        )}

        <div className="flex-1">
          <EditorContent editor={editor} />
        </div>

        <div className="border-t px-6 py-3">
          <Button type="submit" disabled={sending || !to}>
            <Send className="mr-2 h-4 w-4" />
            {sending ? "Envoi en cours..." : "Envoyer"}
          </Button>
        </div>
      </form>
  )
}
