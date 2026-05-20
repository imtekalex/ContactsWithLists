"use client"

import { Camera, ImagePlus, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

type AvatarSize = "sm" | "md" | "lg" | "xl"

const avatarSizes: Record<AvatarSize, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-16 w-16 text-lg",
  lg: "h-24 w-24 text-2xl",
  xl: "h-32 w-32 text-3xl",
}

export function ContactAvatar({
  firstName,
  lastName,
  photoUrl,
  size = "sm",
  className,
}: {
  firstName: string
  lastName: string
  photoUrl?: string
  size?: AvatarSize
  className?: string
}) {
  const initials = getInitials(firstName, lastName)

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full flex-shrink-0 border border-white/70 shadow-sm",
        avatarSizes[size],
        photoUrl ? "bg-secondary" : getAvatarColor(firstName, lastName),
        className,
      )}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={[firstName, lastName].filter(Boolean).join(" ") || "Contact photo"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-semibold">
          {initials || <Camera className="h-[45%] w-[45%]" />}
        </div>
      )}
    </div>
  )
}

export function ContactPhotoPicker({
  firstName,
  lastName,
  photoUrl,
  onChange,
  size = "lg",
}: {
  firstName: string
  lastName: string
  photoUrl?: string
  onChange: (photoUrl: string | undefined) => void
  size?: AvatarSize
}) {
  async function handleFile(file: File | undefined) {
    if (!file) return
    onChange(await readContactPhoto(file))
  }

  const hasPhoto = Boolean(photoUrl)

  return (
    <div className="group relative inline-flex">
      <ContactAvatar firstName={firstName} lastName={lastName} photoUrl={photoUrl} size={size} />
      <label
        className={cn(
          "absolute cursor-pointer text-white transition",
          hasPhoto
            ? "inset-0 flex items-center justify-center rounded-full bg-black/0 opacity-0 group-hover:bg-black/45 group-hover:opacity-100 group-focus-within:bg-black/45 group-focus-within:opacity-100"
            : "bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-sm ring-2 ring-background hover:bg-primary/90",
        )}
        aria-label={hasPhoto ? "Change photo" : "Add photo"}
      >
        {hasPhoto ? (
          <span className="flex flex-col items-center gap-1 text-[11px] font-medium">
            <ImagePlus className="h-5 w-5" />
            Change
          </span>
        ) : (
          <Plus className="h-5 w-5" />
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => {
            void handleFile(event.target.files?.[0])
            event.target.value = ""
          }}
        />
      </label>
      {photoUrl && (
        <button
          type="button"
          className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-background text-muted-foreground opacity-0 shadow-sm ring-1 ring-border transition hover:text-destructive group-hover:opacity-100 group-focus-within:opacity-100"
          onClick={() => onChange(undefined)}
          aria-label="Remove photo"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase()
}

function getAvatarColor(firstName: string, lastName: string) {
  const palette = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ]
  let hash = 0
  for (const ch of firstName + lastName) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return palette[Math.abs(hash) % palette.length]
}

function readContactPhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Could not read image file"))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error("Could not load image file"))
      image.onload = () => {
        const maxSize = 640
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const width = Math.max(1, Math.round(image.width * scale))
        const height = Math.max(1, Math.round(image.height * scale))
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext("2d")
        if (!context) {
          reject(new Error("Could not prepare image"))
          return
        }
        context.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.88))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
