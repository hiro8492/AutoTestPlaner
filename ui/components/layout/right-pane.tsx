"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CSVPreview } from "@/components/export/csv-preview"
import { JSONPreview } from "@/components/export/json-preview"
import { DiffPanel } from "@/components/diff/diff-panel"
import { QualityChecks } from "@/components/export/quality-checks"

export function RightPane() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold text-foreground">
          確認・出力
        </h2>
      </div>
      <Tabs defaultValue="csv" className="flex flex-1 flex-col">
        <TabsList className="mx-3 mt-2 h-8">
          <TabsTrigger value="csv" className="text-xs h-6 px-2.5">
            CSV
          </TabsTrigger>
          <TabsTrigger value="json" className="text-xs h-6 px-2.5">
            JSON
          </TabsTrigger>
          <TabsTrigger value="diff" className="text-xs h-6 px-2.5">
            差分
          </TabsTrigger>
          <TabsTrigger value="quality" className="text-xs h-6 px-2.5">
            品質チェック
          </TabsTrigger>
        </TabsList>
        <TabsContent value="csv" className="flex-1 overflow-hidden">
          <CSVPreview />
        </TabsContent>
        <TabsContent value="json" className="flex-1 overflow-hidden">
          <JSONPreview />
        </TabsContent>
        <TabsContent value="diff" className="flex-1 overflow-hidden">
          <DiffPanel />
        </TabsContent>
        <TabsContent value="quality" className="flex-1 overflow-hidden">
          <QualityChecks />
        </TabsContent>
      </Tabs>
    </div>
  )
}
