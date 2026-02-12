"use client"

import { useMemo } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAppStore } from "@/lib/store"
import type { QualityCheck } from "@/lib/types"

export function QualityChecks() {
  const { ir, updateCell, bulkAddTag } = useAppStore()

  const checks = useMemo((): QualityCheck[] => {
    if (!ir) return []
    const results: QualityCheck[] = []

    // Missing tags
    const missingTagRows = ir.rows.filter((r) => !r.Tag.trim())
    if (missingTagRows.length > 0) {
      results.push({
        id: "missing-tags",
        label: "タグ未設定",
        description: "タグが設定されていない行があります",
        severity: "warning",
        count: missingTagRows.length,
        affectedRows: missingTagRows.map((r) => r.id),
        fixAction: "add-default-tags",
      })
    }

    // Missing expected
    const missingExpected = ir.rows.filter((r) => !r.Expected.trim())
    if (missingExpected.length > 0) {
      results.push({
        id: "missing-expected",
        label: "期待結果が未入力",
        description: "期待結果が空欄の行があります",
        severity: "error",
        count: missingExpected.length,
        affectedRows: missingExpected.map((r) => r.id),
      })
    }

    // Duplicate steps within same case
    const caseStepMap = new Map<string, Set<string>>()
    const duplicateStepRows: string[] = []
    for (const row of ir.rows) {
      const key = row.Case
      if (!caseStepMap.has(key)) caseStepMap.set(key, new Set())
      const stepSet = caseStepMap.get(key)!
      if (stepSet.has(row.Step)) {
        duplicateStepRows.push(row.id)
      }
      stepSet.add(row.Step)
    }
    if (duplicateStepRows.length > 0) {
      results.push({
        id: "duplicate-steps",
        label: "操作内容の重複",
        description: "同じケース内に同一の操作内容が複数あります",
        severity: "warning",
        count: duplicateStepRows.length,
        affectedRows: duplicateStepRows,
      })
    }

    // Priority skew (more than 70% High)
    const highCount = ir.rows.filter((r) => r.Priority === "High").length
    if (ir.rows.length > 3 && highCount / ir.rows.length > 0.7) {
      results.push({
        id: "priority-skew",
        label: "優先度の偏り",
        description: `全体の${Math.round((highCount / ir.rows.length) * 100)}%が「高」優先度に設定されています`,
        severity: "info",
        count: highCount,
        affectedRows: ir.rows.filter((r) => r.Priority === "High").map((r) => r.id),
      })
    }

    // All passed
    if (results.length === 0) {
      results.push({
        id: "all-passed",
        label: "すべてのチェックに合格",
        description: "品質上の問題は見つかりませんでした",
        severity: "info",
        count: 0,
        affectedRows: [],
      })
    }

    return results
  }, [ir])

  const handleFix = (check: QualityCheck) => {
    if (!ir) return
    if (check.fixAction === "add-default-tags") {
      // Add "untagged" to all rows without tags
      for (const rowId of check.affectedRows) {
        updateCell(rowId, "Tag", "untagged")
      }
    }
  }

  if (!ir) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">テスト設計データがありません</p>
      </div>
    )
  }

  const errorCount = checks.filter((c) => c.severity === "error").length
  const warningCount = checks.filter((c) => c.severity === "warning").length

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      {/* Summary */}
      <div className="flex items-center gap-2">
        {errorCount > 0 && (
          <Badge
            variant="secondary"
            className="h-5 gap-1 px-1.5 text-[10px] bg-destructive/10 text-destructive"
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            {errorCount} 件のエラー
          </Badge>
        )}
        {warningCount > 0 && (
          <Badge
            variant="secondary"
            className="h-5 gap-1 px-1.5 text-[10px] bg-chart-4/10 text-chart-3"
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            {warningCount} 件の注意
          </Badge>
        )}
        {errorCount === 0 && warningCount === 0 && (
          <Badge
            variant="secondary"
            className="h-5 gap-1 px-1.5 text-[10px] bg-chart-2/10 text-chart-2"
          >
            <CheckCircle2 className="h-2.5 w-2.5" />
            問題なし
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2">
          {checks.map((check) => (
            <div
              key={check.id}
              className={`rounded-md border p-3 ${
                check.severity === "error"
                  ? "border-destructive/30 bg-destructive/5"
                  : check.severity === "warning"
                    ? "border-chart-4/30 bg-chart-4/5"
                    : "border-border bg-muted/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {check.severity === "error" && (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                  {check.severity === "warning" && (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-chart-3 shrink-0" />
                  )}
                  {check.severity === "info" && (
                    <Info className="mt-0.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {check.label}
                      {check.count > 0 && (
                        <span className="ml-1.5 text-muted-foreground">
                          ({check.count})
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {check.description}
                    </p>
                  </div>
                </div>
                {check.fixAction && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 shrink-0 text-[10px] gap-1 bg-transparent"
                    onClick={() => handleFix(check)}
                  >
                    <Zap className="h-2.5 w-2.5" />
                    自動修正
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
