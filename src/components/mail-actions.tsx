import { Archive, Clock, Forward, Reply, ReplyAll, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

export function MailActions({
  onArchive,
  onTrash,
  onReply,
  onReplyAll,
  onForward,
}: {
  onArchive: () => void
  onTrash: () => void
  onReply: () => void
  onReplyAll: () => void
  onForward: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={onArchive}>
            <Archive className="size-4" />
            <span className="sr-only">Archiver</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Archiver</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={onTrash}>
            <Trash2 className="size-4" />
            <span className="sr-only">Supprimer</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Supprimer</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={() => console.log("Snooze")}>
            <Clock className="size-4" />
            <span className="sr-only">Rappel</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Rappel</TooltipContent>
      </Tooltip>
      <Separator orientation="vertical" className="mx-1 h-5" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={onReply}>
            <Reply className="size-4" />
            <span className="sr-only">Répondre</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Répondre</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={onReplyAll}>
            <ReplyAll className="size-4" />
            <span className="sr-only">Répondre à tous</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Répondre à tous</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={onForward}>
            <Forward className="size-4" />
            <span className="sr-only">Transférer</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Transférer</TooltipContent>
      </Tooltip>
    </div>
  )
}
