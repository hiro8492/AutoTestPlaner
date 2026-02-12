"use client"

import { Undo2, Redo2, Plus, Search, X, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useAppStore } from "@/lib/store"
import type { Priority } from "@/lib/types"
import { useMemo } from "react"

export function TableToolbar() {
  const {
    ir,
    past,
    future,
    filters,
    undo,
    redo,
    addRow,
    setSearch,
    setPriorityFilter,
    setTagFilter,
    clearFilters,
  } = useAppStore()

  const allTags = useMemo(() => {
    if (!ir) return []
    const tagSet = new Set<string>()
    for (const row of ir.rows) {
      if (row.Tag) {
        for (const t of row.Tag.split("|")) {
          if (t.trim()) tagSet.add(t.trim())
        }
      }
    }
    return Array.from(tagSet).sort()
  }, [ir])

  const hasActiveFilters =
    filters.search ||
    filters.priorities.length > 0 ||
    filters.tags.length > 0 ||
    filters.casePrefix

  if (!ir) return null

  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={undo}
          disabled={past.length === 0}
          title="元に戻す (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
          <span className="sr-only">元に戻す</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={redo}
          disabled={future.length === 0}
          title="やり直す (Ctrl+Y)"
        >
          <Redo2 className="h-3.5 w-3.5" />
          <span className="sr-only">やり直す</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="検索..."
          className="h-7 pl-7 pr-7 text-xs"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Priority Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 bg-transparent">
            <Filter className="h-3 w-3" />
            優先度
            {filters.priorities.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {filters.priorities.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel className="text-xs">優先度で絞り込み</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(["High", "Medium", "Low"] as Priority[]).map((p) => (
            <DropdownMenuCheckboxItem
              key={p}
              checked={filters.priorities.includes(p)}
              onCheckedChange={(checked) => {
                if (checked) {
                  setPriorityFilter([...filters.priorities, p])
                } else {
                  setPriorityFilter(filters.priorities.filter((x) => x !== p))
                }
              }}
              className="text-xs"
            >
              {p}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tag Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 bg-transparent">
            <Filter className="h-3 w-3" />
            タグ
            {filters.tags.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {filters.tags.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
          <DropdownMenuLabel className="text-xs">タグで絞り込み</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allTags.map((tag) => (
            <DropdownMenuCheckboxItem
              key={tag}
              checked={filters.tags.includes(tag)}
              onCheckedChange={(checked) => {
                if (checked) {
                  setTagFilter([...filters.tags, tag])
                } else {
                  setTagFilter(filters.tags.filter((t) => t !== tag))
                }
              }}
              className="text-xs"
            >
              {tag}
            </DropdownMenuCheckboxItem>
          ))}
          {allTags.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              タグがありません
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground"
          onClick={clearFilters}
        >
          <X className="mr-1 h-3 w-3" />
          絞り込み解除
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Add Row */}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1 bg-transparent"
        onClick={() => addRow(null)}
      >
        <Plus className="h-3 w-3" />
        行を追加
      </Button>

      {/* Row Count */}
      <span className="text-xs text-muted-foreground">
        {ir.rows.length} 行
      </span>
    </div>
  )
}
