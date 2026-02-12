"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Save, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { fetchLLMSettings, updateLLMSettings } from "@/lib/api"
import type { LLMSettingsSummary } from "@/lib/types"

interface LLMSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function LLMSettingsModal({
  open,
  onOpenChange,
  onSaved,
}: LLMSettingsModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<LLMSettingsSummary | null>(null)

  const [openaiApiKey, setOpenaiApiKey] = useState("")
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState("https://api.openai.com")
  const [geminiApiKey, setGeminiApiKey] = useState("")
  const [anthropicApiKey, setAnthropicApiKey] = useState("")

  const [clearOpenai, setClearOpenai] = useState(false)
  const [clearGemini, setClearGemini] = useState(false)
  const [clearAnthropic, setClearAnthropic] = useState(false)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchLLMSettings()
      setSettings(data)
      setOpenaiBaseUrl(data.openai.baseUrl || "https://api.openai.com")
      setOpenaiApiKey("")
      setGeminiApiKey("")
      setAnthropicApiKey("")
      setClearOpenai(false)
      setClearGemini(false)
      setClearAnthropic(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "設定の読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open, loadSettings])

  const handleSave = async () => {
    const payload: {
      openai_api_key?: string
      openai_base_url?: string
      gemini_api_key?: string
      anthropic_api_key?: string
    } = {}

    if (openaiApiKey.trim()) payload.openai_api_key = openaiApiKey.trim()
    if (geminiApiKey.trim()) payload.gemini_api_key = geminiApiKey.trim()
    if (anthropicApiKey.trim()) payload.anthropic_api_key = anthropicApiKey.trim()
    if (clearOpenai) payload.openai_api_key = ""
    if (clearGemini) payload.gemini_api_key = ""
    if (clearAnthropic) payload.anthropic_api_key = ""
    if (openaiBaseUrl.trim()) payload.openai_base_url = openaiBaseUrl.trim()

    if (payload.openai_base_url) {
      try {
        const parsed = new URL(payload.openai_base_url)
        if (!["http:", "https:"].includes(parsed.protocol)) {
          toast.error("OpenAI Base URL は http(s) 形式で指定してください")
          return
        }
      } catch {
        toast.error("OpenAI Base URL の形式が不正です")
        return
      }
    }

    if (Object.keys(payload).length === 0) {
      toast.error("変更内容がありません")
      return
    }

    setSaving(true)
    try {
      const updated = await updateLLMSettings(payload)
      setSettings(updated)
      setOpenaiApiKey("")
      setGeminiApiKey("")
      setAnthropicApiKey("")
      setClearOpenai(false)
      setClearGemini(false)
      setClearAnthropic(false)
      toast.success("LLM設定を保存しました")
      onSaved?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "設定の保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>LLM設定</DialogTitle>
          <DialogDescription>
            外部APIキーを設定すると ChatGPT系 / Gemini系 / Claude系 のモデルを利用できます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              空欄のまま保存すると現在のキーは変更されません
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={loadSettings}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              再読込
            </Button>
          </div>

          <div className="space-y-3 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">OpenAI (ChatGPT系)</Label>
              <Badge variant={settings?.openai.configured ? "default" : "secondary"}>
                {settings?.openai.configured ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">OpenAI API Key</Label>
              <Input
                type="password"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-..."
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">OpenAI Base URL</Label>
              <Input
                value={openaiBaseUrl}
                onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                placeholder="https://api.openai.com"
                className="h-8 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={clearOpenai}
                onChange={(e) => setClearOpenai(e.target.checked)}
              />
              OpenAIキーを削除する
            </label>
          </div>

          <div className="space-y-3 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Google Gemini</Label>
              <Badge variant={settings?.gemini.configured ? "default" : "secondary"}>
                {settings?.gemini.configured ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Gemini API Key</Label>
              <Input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIza..."
                className="h-8 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={clearGemini}
                onChange={(e) => setClearGemini(e.target.checked)}
              />
              Geminiキーを削除する
            </label>
          </div>

          <div className="space-y-3 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Anthropic Claude</Label>
              <Badge variant={settings?.anthropic.configured ? "default" : "secondary"}>
                {settings?.anthropic.configured ? "設定済み" : "未設定"}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Anthropic API Key</Label>
              <Input
                type="password"
                value={anthropicApiKey}
                onChange={(e) => setAnthropicApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="h-8 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={clearAnthropic}
                onChange={(e) => setClearAnthropic(e.target.checked)}
              />
              Claudeキーを削除する
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onOpenChange(false)}
            >
              閉じる
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
