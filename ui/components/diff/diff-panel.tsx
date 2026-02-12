"use client"

import { useMemo } from "react"
import { RotateCcw, Plus, Minus, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useAppStore } from "@/lib/store"
import type { IRRow, RowDiff } from "@/lib/types"

function computeDiff(
  baselineRows: IRRow[],
  currentRows: IRRow[]
): RowDiff[] {
  const diffs: RowDiff[] = []
  const baseMap = new Map(baselineRows.map((r) => [r.id, r]))
  const currentMap = new Map(currentRows.map((r) => [r.id, r]))

  // Added rows
  for (const row of currentRows) {
    if (!baseMap.has(row.id)) {
      diffs.push({ type: "added", row, caseGroup: row.Case })
    }
  }

  // Removed rows
  for (const row of baselineRows) {
    if (!currentMap.has(row.id)) {
      diffs.push({ type: "removed", row, caseGroup: row.Case })
    }
  }

  // Modified rows
  for (const row of currentRows) {
    const base = baseMap.get(row.id)
    if (!base) continue
    const isModified =
      row.Case !== base.Case ||
      row.Step !== base.Step ||
      row.Expected !== base.Expected ||
      row.Tag !== base.Tag ||
      row.Priority !== base.Priority ||
      row.remarks !== base.remarks
    if (isModified) {
      diffs.push({
        type: "modified",
        row,
        originalRow: base,
        caseGroup: row.Case,
      })
    }
  }

  return diffs
}

export function DiffPanel() {
  const { ir, baseline, resetIR, setBaseline } = useAppStore()

  const diffs = useMemo(() => {
    if (!ir || !baseline) return []
    return computeDiff(baseline.rows, ir.rows)
  }, [ir, baseline])

  // Group diffs by case
  const grouped = useMemo(() => {
    const map = new Map<string, RowDiff[]>()
    for (const d of diffs) {
      const arr = map.get(d.caseGroup) || []
      arr.push(d)
      map.set(d.caseGroup, arr)
    }
    return Array.from(map.entries())
  }, [diffs])

  const addedCount = diffs.filter((d) => d.type === "added").length
  const removedCount = diffs.filter((d) => d.type === "removed").length
  const modifiedCount = diffs.filter((d) => d.type === "modified").length

  if (!ir) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">テスト設計データがありません</p>
      </div>
    )
  }

  if (!baseline) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
        <p className="text-xs text-muted-foreground text-center">
          比較元データがありません。テスト設計を生成すると自動で設定されます。
        </p>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs bg-transparent"
          onClick={() => {
            if (ir) setBaseline(ir)
          }}
        >
          現在のデータを比較元にする
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      {/* Summary */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Badge
            variant="secondary"
            className="h-5 gap-1 px-1.5 text-[10px] bg-chart-2/10 text-chart-2 border-chart-2/30"
          >
            <Plus className="h-2.5 w-2.5" />
            {addedCount} 件追加
          </Badge>
          <Badge
            variant="secondary"
            className="h-5 gap-1 px-1.5 text-[10px] bg-destructive/10 text-destructive border-destructive/30"
          >
            <Minus className="h-2.5 w-2.5" />
            {removedCount} 件削除
          </Badge>
          <Badge
            variant="secondary"
            className="h-5 gap-1 px-1.5 text-[10px] bg-chart-4/10 text-chart-3 border-chart-4/30"
          >
            <Pencil className="h-2.5 w-2.5" />
            {modifiedCount} 件変更
          </Badge>
        </div>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 bg-transparent"
          onClick={resetIR}
        >
          <RotateCcw className="h-3 w-3" />
          比較元に戻す
        </Button>
      </div>

      {diffs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border">
          <p className="text-xs text-muted-foreground">
            比較元からの変更はありません
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 rounded-md border border-border">
          <div className="p-2">
            {grouped.map(([caseName, caseDiffs]) => (
              <div key={caseName} className="mb-3 last:mb-0">
                <h4 className="mb-1.5 text-xs font-semibold text-foreground">
                  {caseName}
                </h4>
                {caseDiffs.map((diff, i) => (
                  <div
                    key={`${diff.row.id}-${i}`}
                    className={`mb-1 rounded-sm border px-2 py-1.5 text-[11px] ${
                      diff.type === "added"
                        ? "border-chart-2/30 bg-chart-2/5"
                        : diff.type === "removed"
                          ? "border-destructive/30 bg-destructive/5"
                          : "border-chart-4/30 bg-chart-4/5"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {diff.type === "added" && (
                        <Plus className="h-3 w-3 text-chart-2 shrink-0" />
                      )}
                      {diff.type === "removed" && (
                        <Minus className="h-3 w-3 text-destructive shrink-0" />
                      )}
                      {diff.type === "modified" && (
                        <Pencil className="h-3 w-3 text-chart-3 shrink-0" />
                      )}
                      <span className="font-medium">{diff.row.Step}</span>
                    </div>
                    {diff.type === "modified" && diff.originalRow && (
                      <div className="mt-1 pl-4.5 text-[10px] text-muted-foreground">
                        {diff.row.Step !== diff.originalRow.Step && (
                          <div>
                            操作内容: &quot;{diff.originalRow.Step}&quot; → &quot;
                            {diff.row.Step}&quot;
                          </div>
                        )}
                        {diff.row.Expected !== diff.originalRow.Expected && (
                          <div>
                            期待結果: &quot;{diff.originalRow.Expected}&quot; →
                            &quot;{diff.row.Expected}&quot;
                          </div>
                        )}
                        {diff.row.Tag !== diff.originalRow.Tag && (
                          <div>
                            タグ: &quot;{diff.originalRow.Tag}&quot; → &quot;
                            {diff.row.Tag}&quot;
                          </div>
                        )}
                        {diff.row.Priority !== diff.originalRow.Priority && (
                          <div>
                            優先度: {diff.originalRow.Priority} →{" "}
                            {diff.row.Priority}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <Separator className="mt-2" />
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
