"use client"

import { useCallback } from "react"
import { toast } from "sonner"
import { Copy, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAppStore } from "@/lib/store"

export function JSONPreview() {
  const { ir } = useAppStore()

  const jsonString = ir ? JSON.stringify(ir, null, 2) : null

  const handleCopy = useCallback(async () => {
    if (!jsonString) return
    try {
      await navigator.clipboard.writeText(jsonString)
      toast.success("JSONをクリップボードにコピーしました")
    } catch {
      toast.error("コピーに失敗しました")
    }
  }, [jsonString])

  const handleDownload = useCallback(() => {
    if (!jsonString) return
    const blob = new Blob([jsonString], {
      type: "application/json;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ir-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [jsonString])

  if (!ir) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-muted-foreground">テスト設計データがありません</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 bg-transparent"
          onClick={handleCopy}
        >
          <Copy className="h-3 w-3" />
          JSONをコピー
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 bg-transparent"
          onClick={handleDownload}
        >
          <Download className="h-3 w-3" />
          JSONをダウンロード
        </Button>
      </div>
      <ScrollArea className="flex-1 rounded-md border border-border">
        <pre className="p-3 text-[11px] leading-relaxed font-mono text-foreground">
          {jsonString}
        </pre>
      </ScrollArea>
    </div>
  )
}
