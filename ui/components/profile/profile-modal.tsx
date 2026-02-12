"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { Profile } from "@/lib/types"
import { fetchProfiles, createProfile, updateProfile } from "@/lib/api"

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [terminologyText, setTerminologyText] = useState("")
  const [styleText, setStyleText] = useState("")
  const [customSystemPrompt, setCustomSystemPrompt] = useState("")

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchProfiles()
      setProfiles(data)
    } catch {
      toast.error("プロファイルの読み込みに失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadProfiles()
  }, [open, loadProfiles])

  const resetForm = () => {
    setName("")
    setTerminologyText("")
    setStyleText("")
    setCustomSystemPrompt("")
    setEditingProfile(null)
    setIsCreating(false)
  }

  const canSave = name.trim().length > 0 && !saving

  const startCreate = () => {
    resetForm()
    setIsCreating(true)
  }

  const startEdit = (profile: Profile) => {
    setEditingProfile(profile)
    setIsCreating(false)
    setName(profile.name)
    setTerminologyText(profile.terminology_text || "")
    setStyleText(profile.style_text || "")
    setCustomSystemPrompt(profile.custom_system_prompt || "")
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("プロファイル名を入力してください")
      return
    }

    setSaving(true)
    try {
      if (isCreating) {
        await createProfile({
          name: name.trim(),
          terminology_text: terminologyText,
          style_text: styleText,
          custom_system_prompt: customSystemPrompt,
        })
        toast.success("プロファイルを作成しました")
      } else if (editingProfile) {
        await updateProfile(editingProfile.id, {
          name: name.trim(),
          terminology_text: terminologyText,
          style_text: styleText,
          custom_system_prompt: customSystemPrompt,
        })
        toast.success("プロファイルを更新しました")
      }
      await loadProfiles()
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  const isEditing = isCreating || editingProfile !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>プロファイル管理</DialogTitle>
          <DialogDescription>
            テスト生成に使う用語辞書やスタイル設定を管理します。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Profile list */}
          {!isEditing && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {profiles.length} 件のプロファイル
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 bg-transparent"
                  onClick={startCreate}
                >
                  <Plus className="h-3 w-3" />
                  新規作成
                </Button>
              </div>
              <ScrollArea className="max-h-60">
                <div className="flex flex-col gap-1">
                  {profiles.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {p.name}
                        </p>
                        {p.terminology_text && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {p.terminology_text}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => startEdit(p)}
                      >
                        <Pencil className="h-3 w-3" />
                        <span className="sr-only">プロファイルを編集</span>
                      </Button>
                    </div>
                  ))}
                  {profiles.length === 0 && !loading && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      プロファイルがまだありません
                    </p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}

          {/* Edit / Create form */}
          {isEditing && (
            <>
              <Separator />
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">プロファイル名</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例：ECサイト向け"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">用語辞書（同義語・略語・表記統一など）</Label>
                  <Textarea
                    value={terminologyText}
                    onChange={(e) => setTerminologyText(e.target.value)}
                    placeholder="例：カート = ショッピングカート、PDP = 商品詳細ページ"
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">スタイル設定（文体・粒度・書き方のルール）</Label>
                  <Textarea
                    value={styleText}
                    onChange={(e) => setStyleText(e.target.value)}
                    placeholder="例：期待結果は「〜が表示されること」の形式で記載する"
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">
                    カスタムシステムプロンプト（追加指示）
                  </Label>
                  <Textarea
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                    placeholder={"例：\n- セキュリティ観点のテストを重点的に設計すること\n- 期待結果にHTTPステータスコードを必ず含めること"}
                    rows={4}
                    className="text-sm resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      ビルトインプロンプトの末尾に追加されます。
                      <br />
                      モデルのコンテキスト上限に注意してください。
                    </p>
                    <span className={`text-[10px] tabular-nums ${
                      customSystemPrompt.length > 500
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}>
                      {customSystemPrompt.length} 文字
                    </span>
                  </div>
                  <div className="rounded-md border border-border bg-muted/50 px-2.5 py-2 text-[10px] text-muted-foreground leading-relaxed">
                    <p className="font-medium text-foreground mb-1">カスタムプロンプト推奨文字数</p>
                    <p className="mb-1.5">
                      ビルトインプロンプト約 3,200 文字＋JSON Schema 等の固定部分 約 3,000 文字が
                      常にコンテキストを使用します。操作手順・仕様テキスト・出力領域も必要なため、
                      カスタム部分は以下の目安を参考にしてください。
                    </p>
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="pr-2 py-0.5">phi4-mini（8K ctx）</td>
                          <td className="font-medium text-foreground">〜200 文字</td>
                          <td className="text-muted-foreground pl-1">※ 余裕が非常に少ない</td>
                        </tr>
                        <tr>
                          <td className="pr-2 py-0.5">Gemma 3 等（32K ctx）</td>
                          <td className="font-medium text-foreground">〜2,000 文字</td>
                          <td className="text-muted-foreground pl-1"></td>
                        </tr>
                        <tr>
                          <td className="pr-2 py-0.5">GPT-4o / Claude / Gemini</td>
                          <td className="font-medium text-foreground">〜5,000 文字</td>
                          <td className="text-muted-foreground pl-1">※ 十分な余裕あり</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="mt-1 text-muted-foreground">
                      長すぎるとモデルがコンテキストに収まらず、指示を無視する場合があります。
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={handleSave}
                      disabled={!canSave}
                    >
                    {saving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    {isCreating ? "作成" : "更新"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-transparent"
                    onClick={resetForm}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
