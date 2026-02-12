"use client"

import React from "react"

import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import {
  Copy,
  Trash2,
  GripVertical,
  Plus,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Tags,
  ArrowUpDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TagEditor } from "./tag-editor"
import { TableToolbar } from "./table-toolbar"
import { useAppStore } from "@/lib/store"
import type { IRRow, Priority } from "@/lib/types"

// ── Inline Editable Cell ────────────────────────────────────────────────────

function EditableCell({
  value,
  onChange,
  field,
  isEditing,
  onStartEdit,
  onStopEdit,
  hasError,
  errorMessage,
}: {
  value: string
  onChange: (v: string) => void
  field: string
  isEditing: boolean
  onStartEdit: () => void
  onStopEdit: () => void
  hasError?: boolean
  errorMessage?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onStopEdit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            onStopEdit()
          }
        }}
        className="h-6 text-xs border-primary"
      />
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`min-h-[24px] cursor-text rounded px-1.5 py-0.5 text-xs hover:bg-muted ${
              hasError ? "border border-destructive bg-destructive/5" : ""
            }`}
            onClick={onStartEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "F2") onStartEdit()
            }}
            tabIndex={0}
            role="gridcell"
            aria-label={`${field}: ${value || "未入力"}`}
          >
            {value || <span className="text-muted-foreground italic">--</span>}
          </div>
        </TooltipTrigger>
        {hasError && errorMessage && (
          <TooltipContent side="bottom" className="text-xs">
            <p className="text-destructive">{errorMessage}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}

// ── Priority Cell ───────────────────────────────────────────────────────────

function PriorityCell({
  value,
  onChange,
}: {
  value: Priority
  onChange: (v: Priority) => void
}) {
  const colors: Record<Priority, string> = {
    High: "bg-destructive/10 text-destructive border-destructive/30",
    Medium: "bg-chart-4/10 text-chart-3 border-chart-4/30",
    Low: "bg-chart-2/10 text-chart-2 border-chart-2/30",
  }

  return (
    <Select value={value} onValueChange={(v) => onChange(v as Priority)}>
      <SelectTrigger className={`h-6 w-20 border text-[10px] font-medium ${colors[value]}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(["High", "Medium", "Low"] as Priority[]).map((p) => (
          <SelectItem key={p} value={p} className="text-xs">
            {p}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── Case Group Header ───────────────────────────────────────────────────────

function CaseGroupHeader({
  caseName,
  rowCount,
  isCollapsed,
  onToggle,
  onDuplicate,
  onDelete,
  onRename,
  onSetPriority,
  onBulkAddTag,
  onAddRow,
}: {
  caseName: string
  rowCount: number
  isCollapsed: boolean
  onToggle: () => void
  onDuplicate: () => void
  onDelete: () => void
  onRename: () => void
  onSetPriority: (p: Priority) => void
  onBulkAddTag: (tag: string) => void
  onAddRow: () => void
}) {
  const [addTagInput, setAddTagInput] = useState("")

  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-2 py-1.5">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 text-xs font-medium text-foreground hover:text-primary"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
        <span>{caseName}</span>
      </button>
      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
        {rowCount}
      </Badge>
      <div className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span className="sr-only">ケース操作</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onAddRow} className="text-xs">
            <Plus className="mr-2 h-3 w-3" />
            手順を追加
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRename} className="text-xs">
            <Pencil className="mr-2 h-3 w-3" />
            ケース名を変更
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate} className="text-xs">
            <Copy className="mr-2 h-3 w-3" />
            ケースを複製
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs">
              <ArrowUpDown className="mr-2 h-3 w-3" />
              優先度を設定
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {(["High", "Medium", "Low"] as Priority[]).map((p) => (
                <DropdownMenuItem
                  key={p}
                  onClick={() => onSetPriority(p)}
                  className="text-xs"
                >
                  {p}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs">
              <Tags className="mr-2 h-3 w-3" />
              タグを追加
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <div className="p-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (addTagInput.trim()) {
                      onBulkAddTag(addTagInput.trim())
                      setAddTagInput("")
                    }
                  }}
                >
                  <Input
                    value={addTagInput}
                    onChange={(e) => setAddTagInput(e.target.value)}
                    placeholder="タグ名..."
                    className="h-7 text-xs"
                  />
                </form>
              </div>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className="text-xs text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-3 w-3" />
            ケースを削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ── Main IR Table ───────────────────────────────────────────────────────────

export function IRTable() {
  const {
    ir,
    filters,
    updateCell,
    deleteRow,
    duplicateRow,
    addRow,
    moveRow,
    deleteCase,
    duplicateCase,
    renameCase,
    setCasePriority,
    bulkAddTag,
    undo,
    redo,
  } = useAppStore()

  const [collapsedCases, setCollapsedCases] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{
    rowId: string
    field: string
  } | null>(null)
  const [renamingCase, setRenamingCase] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  // Keyboard shortcut: Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [undo, redo])

  // Filter rows
  const filteredRows = useMemo(() => {
    if (!ir) return []
    let rows = ir.rows

    if (filters.search) {
      const q = filters.search.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.Case.toLowerCase().includes(q) ||
          r.Step.toLowerCase().includes(q) ||
          r.Expected.toLowerCase().includes(q) ||
          r.Tag.toLowerCase().includes(q) ||
          r.Priority.toLowerCase().includes(q) ||
          r.remarks.toLowerCase().includes(q)
      )
    }

    if (filters.priorities.length > 0) {
      rows = rows.filter((r) => filters.priorities.includes(r.Priority))
    }

    if (filters.tags.length > 0) {
      rows = rows.filter((r) => {
        const rowTags = r.Tag.split("|").filter(Boolean)
        return filters.tags.some((t) => rowTags.includes(t))
      })
    }

    if (filters.casePrefix) {
      rows = rows.filter((r) =>
        r.Case.toLowerCase().startsWith(filters.casePrefix.toLowerCase())
      )
    }

    return rows
  }, [ir, filters])

  // Group by case
  const caseGroups = useMemo(() => {
    const groups: { caseName: string; rows: IRRow[] }[] = []
    const map = new Map<string, IRRow[]>()
    const order: string[] = []

    for (const row of filteredRows) {
      if (!map.has(row.Case)) {
        map.set(row.Case, [])
        order.push(row.Case)
      }
      map.get(row.Case)!.push(row)
    }

    for (const caseName of order) {
      groups.push({ caseName, rows: map.get(caseName)! })
    }

    return groups
  }, [filteredRows])

  const toggleCase = (caseName: string) => {
    setCollapsedCases((prev) => {
      const next = new Set(prev)
      if (next.has(caseName)) next.delete(caseName)
      else next.add(caseName)
      return next
    })
  }

  const handleRenameStart = (caseName: string) => {
    setRenamingCase(caseName)
    setRenameValue(caseName)
  }

  const handleRenameConfirm = () => {
    if (renamingCase && renameValue.trim() && renameValue !== renamingCase) {
      renameCase(renamingCase, renameValue.trim())
    }
    setRenamingCase(null)
  }

  const validateRow = (row: IRRow) => {
    const errors: Record<string, string> = {}
    if (!row.Case.trim()) errors.Case = "テストケース名は必須です"
    if (!row.Step.trim()) errors.Step = "操作内容は必須です"
    if (!row.Expected.trim()) errors.Expected = "期待結果は必須です"
    if (!["High", "Medium", "Low"].includes(row.Priority))
      errors.Priority = "不正な優先度です"
    return errors
  }

  const handleDragStart = useCallback(
    (index: number) => {
      setDragIndex(index)
    },
    []
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (targetIndex: number) => {
      if (dragIndex !== null && dragIndex !== targetIndex && ir) {
        const fromRow = filteredRows[dragIndex]
        const toRow = filteredRows[targetIndex]
        const fromGlobal = ir.rows.findIndex((r) => r.id === fromRow.id)
        const toGlobal = ir.rows.findIndex((r) => r.id === toRow.id)
        if (fromGlobal !== -1 && toGlobal !== -1) {
          moveRow(fromGlobal, toGlobal)
        }
      }
      setDragIndex(null)
    },
    [dragIndex, ir, filteredRows, moveRow]
  )

  if (!ir) {
    return (
      <div className="flex h-full flex-col">
        <TableToolbar />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              テスト設計データがありません
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              左側のパネルからテスト設計を生成してください
            </p>
          </div>
        </div>
      </div>
    )
  }

  let globalFilteredIndex = 0

  return (
    <div className="flex h-full flex-col">
      <TableToolbar />
      <ScrollArea className="flex-1">
        {/* Table header */}
        <div
          className="sticky top-0 z-10 grid border-b border-border bg-muted/50 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
          style={{
            gridTemplateColumns: "28px 1fr 1.5fr 1.5fr 140px 80px 1fr 60px",
          }}
        >
          <div />
          <div className="px-1">ケース</div>
          <div className="px-1">操作内容</div>
          <div className="px-1">期待結果</div>
          <div className="px-1">タグ</div>
          <div className="px-1">優先度</div>
          <div className="px-1">備考</div>
          <div />
        </div>

        {caseGroups.map((group) => {
          const isCollapsed = collapsedCases.has(group.caseName)

          return (
            <div key={group.caseName}>
              {/* Renaming input */}
              {renamingCase === group.caseName ? (
                <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-2 py-1.5">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRenameConfirm}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameConfirm()
                      if (e.key === "Escape") setRenamingCase(null)
                    }}
                    className="h-6 text-xs"
                    autoFocus
                  />
                </div>
              ) : (
                <CaseGroupHeader
                  caseName={group.caseName}
                  rowCount={group.rows.length}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleCase(group.caseName)}
                  onDuplicate={() => duplicateCase(group.caseName)}
                  onDelete={() => deleteCase(group.caseName)}
                  onRename={() => handleRenameStart(group.caseName)}
                  onSetPriority={(p) => setCasePriority(group.caseName, p)}
                  onBulkAddTag={(tag) => bulkAddTag(group.caseName, tag)}
                  onAddRow={() => {
                    const lastRow = group.rows[group.rows.length - 1]
                    addRow(lastRow?.id || null, group.caseName)
                  }}
                />
              )}

              {/* Rows */}
              {!isCollapsed &&
                group.rows.map((row) => {
                  const idx = globalFilteredIndex++
                  const errors = validateRow(row)
                  const hasErrors = Object.keys(errors).length > 0

                  return (
                    <div
                      key={row.id}
                      className={`grid items-center border-b border-border px-2 py-1 transition-colors hover:bg-muted/20 ${
                        dragIndex === idx ? "opacity-50" : ""
                      } ${hasErrors ? "bg-destructive/5" : ""}`}
                      style={{
                        gridTemplateColumns:
                          "28px 1fr 1.5fr 1.5fr 140px 80px 1fr 60px",
                      }}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(idx)}
                    >
                      {/* Drag handle */}
                      <div className="flex items-center justify-center cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                      </div>

                      {/* Case */}
                      <EditableCell
                        value={row.Case}
                        onChange={(v) => updateCell(row.id, "Case", v)}
                        field="Case"
                        isEditing={
                          editingCell?.rowId === row.id &&
                          editingCell?.field === "Case"
                        }
                        onStartEdit={() =>
                          setEditingCell({ rowId: row.id, field: "Case" })
                        }
                        onStopEdit={() => setEditingCell(null)}
                        hasError={!!errors.Case}
                        errorMessage={errors.Case}
                      />

                      {/* Step */}
                      <EditableCell
                        value={row.Step}
                        onChange={(v) => updateCell(row.id, "Step", v)}
                        field="Step"
                        isEditing={
                          editingCell?.rowId === row.id &&
                          editingCell?.field === "Step"
                        }
                        onStartEdit={() =>
                          setEditingCell({ rowId: row.id, field: "Step" })
                        }
                        onStopEdit={() => setEditingCell(null)}
                        hasError={!!errors.Step}
                        errorMessage={errors.Step}
                      />

                      {/* Expected */}
                      <EditableCell
                        value={row.Expected}
                        onChange={(v) => updateCell(row.id, "Expected", v)}
                        field="Expected"
                        isEditing={
                          editingCell?.rowId === row.id &&
                          editingCell?.field === "Expected"
                        }
                        onStartEdit={() =>
                          setEditingCell({ rowId: row.id, field: "Expected" })
                        }
                        onStopEdit={() => setEditingCell(null)}
                        hasError={!!errors.Expected}
                        errorMessage={errors.Expected}
                      />

                      {/* Tags */}
                      <div className="px-0.5">
                        <TagEditor
                          value={row.Tag}
                          onChange={(v) => updateCell(row.id, "Tag", v)}
                        />
                      </div>

                      {/* Priority */}
                      <div className="px-0.5">
                        <PriorityCell
                          value={row.Priority}
                          onChange={(v) => updateCell(row.id, "Priority", v)}
                        />
                      </div>

                      {/* Remarks */}
                      <EditableCell
                        value={row.remarks}
                        onChange={(v) => updateCell(row.id, "remarks", v)}
                        field="remarks"
                        isEditing={
                          editingCell?.rowId === row.id &&
                          editingCell?.field === "remarks"
                        }
                        onStartEdit={() =>
                          setEditingCell({ rowId: row.id, field: "remarks" })
                        }
                        onStopEdit={() => setEditingCell(null)}
                      />

                      {/* Row actions */}
                      <div className="flex items-center justify-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => duplicateRow(row.id)}
                          title="行を複製"
                        >
                          <Copy className="h-2.5 w-2.5" />
                          <span className="sr-only">行を複製</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                          onClick={() => deleteRow(row.id)}
                          title="行を削除"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                          <span className="sr-only">行を削除</span>
                        </Button>
                      </div>
                    </div>
                  )
                })}
            </div>
          )
        })}

        {filteredRows.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              {filters.search || filters.priorities.length > 0 || filters.tags.length > 0
                ? "絞り込み条件に一致する行がありません"
                : "まだ行がありません"}
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
