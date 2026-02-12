"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { Copy, Download, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAppStore } from "@/lib/store"
import { exportCSV } from "@/lib/api"

export function CSVPreview() {
  const { ir, exporting, setExporting } = useAppStore()
  const [csvContent, setCsvContent] = useState<string | null>(null)

  const handleGenerate = useCallback(async () => {
    if (!ir) return
    setExporting(true)
    try {
      const csv = await exportCSV(ir)
      setCsvContent(csv)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "CSVの生成に失敗しました")
    } finally {
      setExporting(false)
    }
  }, [ir, setExporting])

  const handleCopy = useCallback(async () => {
    if (!csvContent) return
    try {
      await navigator.clipboard.writeText(csvContent)
      toast.success("CSVをクリップボードにコピーしました")
    } catch {
      toast.error("コピーに失敗しました")
    }
  }, [csvContent])

  const handleDownload = useCallback(() => {
    if (!csvContent) return
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ir-export-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [csvContent])

  if (!ir) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">テスト設計データがありません</p>
      </div>
    )
  }

  const previewLines = csvContent
    ? csvContent.split("\n").slice(0, 50)
    : null

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 bg-transparent"
          onClick={handleGenerate}
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {csvContent ? "再生成" : "CSVを生成"}
        </Button>
        {csvContent && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 bg-transparent"
              onClick={handleCopy}
            >
              <Copy className="h-3 w-3" />
              コピー
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 bg-transparent"
              onClick={handleDownload}
            >
              <Download className="h-3 w-3" />
              ダウンロード
            </Button>
          </>
        )}
      </div>

      {previewLines ? (
        <ScrollArea className="flex-1 rounded-md border border-border">
          <pre className="p-3 text-[11px] leading-relaxed font-mono text-foreground">
            {previewLines.join("\n")}
          </pre>
          {csvContent && csvContent.split("\n").length > 50 && (
            <p className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
              先頭50行を表示しています。全データはダウンロードしてください。
            </p>
          )}
        </ScrollArea>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border">
          <p className="text-xs text-muted-foreground">
            「CSVを生成」ボタンを押すとプレビューが表示されます
          </p>
        </div>
      )}
    </div>
  )
}
