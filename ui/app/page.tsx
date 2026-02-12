"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { Save, Loader2 } from "lucide-react"

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"

import { LeftPane } from "@/components/layout/left-pane"
import { IRTable } from "@/components/ir-table/ir-table"
import { RightPane } from "@/components/layout/right-pane"
import { ProfileModal } from "@/components/profile/profile-modal"

import { useAppStore } from "@/lib/store"
import { saveIR } from "@/lib/api"

export default function Page() {
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const { ir, designId, saving, setSaving } = useAppStore()

  const handleSaveVersion = useCallback(async () => {
    if (!ir || !designId) {
      toast.error("保存するデータがありません")
      return
    }
    setSaving(true)
    try {
      const result = await saveIR(designId, ir)
      toast.success(`バージョン ${result.version_no} として保存しました`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }, [ir, designId, setSaving])

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Bar */}
      <header className="flex h-11 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-foreground">
            QAツール
          </h1>
          <span className="text-xs text-muted-foreground">
            テスト設計エディタ
          </span>
        </div>
        <div className="flex items-center gap-2">
          {designId && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {designId}
            </span>
          )}
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleSaveVersion}
            disabled={!ir || !designId || saving}
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            バージョン保存
          </Button>
        </div>
      </header>

      {/* 3-Pane Layout */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Pane - Inputs */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
          <LeftPane onOpenProfileModal={() => setProfileModalOpen(true)} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center Pane - IR Editor */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <IRTable />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Pane - Preview / Export */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <RightPane />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Profile Modal */}
      <ProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />
    </div>
  )
}
