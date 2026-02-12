"use client"

import { useState, useRef, type KeyboardEvent } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface TagEditorProps {
  value: string // "a|b|c"
  onChange: (value: string) => void
}

export function TagEditor({ value, onChange }: TagEditorProps) {
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const tags = value ? value.split("|").filter(Boolean) : []

  const addTag = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || tags.includes(trimmed)) return
    onChange([...tags, trimmed].join("|"))
    setInputValue("")
  }

  const removeTag = (idx: number) => {
    const next = tags.filter((_, i) => i !== idx)
    onChange(next.join("|"))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  return (
    <div
      className="flex min-h-[28px] flex-wrap items-center gap-1 rounded-md border border-input bg-background px-1.5 py-0.5 focus-within:ring-1 focus-within:ring-ring cursor-text"
      onClick={() => inputRef.current?.focus()}
      onKeyDown={() => {}}
      role="textbox"
      tabIndex={-1}
    >
      {tags.map((tag, idx) => (
        <Badge
          key={`${tag}-${idx}`}
          variant="secondary"
          className="h-5 gap-0.5 px-1.5 text-[10px] font-normal"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(idx)
            }}
            className="ml-0.5 rounded-sm hover:bg-muted-foreground/20"
          >
            <X className="h-2.5 w-2.5" />
            <span className="sr-only">タグ「{tag}」を削除</span>
          </button>
        </Badge>
      ))}
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) addTag(inputValue)
        }}
        placeholder={tags.length === 0 ? "タグを追加..." : ""}
        className="h-5 min-w-[60px] flex-1 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
      />
    </div>
  )
}
