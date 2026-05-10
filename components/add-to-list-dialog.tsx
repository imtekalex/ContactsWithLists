"use client"

import { useState } from "react"
import { Hand, Sparkles, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ContactList } from "@/lib/contacts-data"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedCount: number
  lists: ContactList[]
  onAddToExisting: (listId: string) => void
  onCreateNew: (name: string) => void
}

export function AddToListDialog({
  open,
  onOpenChange,
  selectedCount,
  lists,
  onAddToExisting,
  onCreateNew,
}: Props) {
  const [mode, setMode] = useState<"existing" | "new">("existing")
  const [newName, setNewName] = useState("")

  function reset() {
    setMode("existing")
    setNewName("")
  }

  const manualLists = lists.filter((l) => l.type === "manual")

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) reset()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to list</DialogTitle>
          <DialogDescription>
            Add the {selectedCount} selected contact{selectedCount === 1 ? "" : "s"} to a manual list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-medium",
                mode === "existing"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-secondary/60",
              )}
            >
              <Hand className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Existing list
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={cn(
                "rounded-md border px-3 py-2 text-sm font-medium",
                mode === "new"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-secondary/60",
              )}
            >
              <Sparkles className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              New list
            </button>
          </div>

          {mode === "existing" ? (
            <Card className="max-h-72 overflow-y-auto divide-y divide-border">
              {manualLists.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground italic">
                  No manual lists exist. Create a new one instead.
                </p>
              ) : (
                manualLists.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      onAddToExisting(l.id)
                      reset()
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-secondary/40 flex items-center gap-2"
                  >
                    <Hand className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(l.contactIds ?? []).length} contacts
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-primary" />
                  </button>
                ))
              )}
            </Card>
          ) : (
            <div>
              <Label htmlFor="new-list-name">Name</Label>
              <Input
                id="new-list-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Q1 Outreach"
                className="mt-1.5"
                autoFocus
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {mode === "new" && (
            <Button
              onClick={() => {
                if (!newName.trim()) return
                onCreateNew(newName.trim())
                reset()
              }}
              disabled={!newName.trim()}
            >
              Create list
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
