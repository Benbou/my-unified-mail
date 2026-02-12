import { Archive, Clock, Reply, ReplyAll, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import type { EmailHeader } from "@/lib/email"

const actions = [
  { icon: Archive, label: "Archiver", action: "Archive" },
  { icon: Trash2, label: "Supprimer", action: "Trash" },
  { icon: Clock, label: "Rappel", action: "Snooze" },
  { separator: true },
  { icon: Reply, label: "Répondre", action: "Reply" },
  { icon: ReplyAll, label: "Répondre à tous", action: "Reply All" },
] as const

export function MailActions({ email }: { email: EmailHeader }) {
  const handleAction = (action: string) => {
    console.log(action, email.subject)
  }

  return (
    <div className="flex items-center gap-1">
      {actions.map((item, i) => {
        if ("separator" in item) {
          return (
            <Separator
              key={`sep-${i}`}
              orientation="vertical"
              className="mx-1 h-5"
            />
          )
        }
        const Icon = item.icon
        return (
          <Tooltip key={item.action}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleAction(item.action)}
              >
                <Icon className="size-4" />
                <span className="sr-only">{item.label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{item.label}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
