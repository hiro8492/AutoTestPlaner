"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Settings,
  Key,
  Loader2,
  Clock,
  FileText,
  Cpu,
  RefreshCw,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { LLMSettingsModal } from "@/components/settings/llm-settings-modal"

import type { Profile, CoverageLevel, ModelInfo, ProviderName } from "@/lib/types"
import { fetchProfiles, fetchModels, generateDesign } from "@/lib/api"
import { useAppStore } from "@/lib/store"

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatModelSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(0)} MB`
}

const PROVIDER_LABELS: Record<ProviderName, string> = {
  ollama: "Ollama",
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
}

function groupByProvider(models: ModelInfo[]): Record<string, ModelInfo[]> {
  const groups: Record<string, ModelInfo[]> = {}
  for (const m of models) {
    const key = m.provider
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  }
  return groups
}

// ── Test Techniques ─────────────────────────────────────────────────────────

interface TechniqueOption {
  id: string
  label: string
}

const COVERAGE_OPTIONS: ReadonlyArray<{
  value: CoverageLevel
  label: string
  desc: string
}> = [
  { value: "smoke", label: "簡易（smoke）", desc: "主要な正常系のみ" },
  { value: "regression", label: "標準（regression）", desc: "正常系＋主要な異常系・境界値" },
  { value: "full", label: "網羅（full）", desc: "正常系・異常系・境界値・組み合わせ・非機能" },
]

const DEFAULT_TECHNIQUES: TechniqueOption[] = [
  { id: "equivalence", label: "同値分割" },
  { id: "boundary", label: "境界値分析" },
  { id: "decision-table", label: "デシジョンテーブル" },
  { id: "state-transition", label: "状態遷移テスト" },
  { id: "pairwise", label: "ペアワイズテスト（二因子間網羅）" },
  { id: "error-guessing", label: "エラー推測" },
]

function resolveTechniqueLabels(techniqueIds: string[]): string[] {
  return techniqueIds.map(
    (id) => DEFAULT_TECHNIQUES.find((technique) => technique.id === id)?.label || id,
  )
}

// ── Context estimation ──────────────────────────────────────────────────────

const BUILTIN_OVERHEAD_CHARS = 6200 // system prompt ~3200 + schema ~1900 + rules ~1000 + headers
const OUTPUT_RESERVE_CHARS = 2000 // room for LLM JSON output

function getModelContextChars(provider: ProviderName | ""): number {
  // Convert token limits to approximate char budgets (÷1.5 for Japanese-heavy text)
  switch (provider) {
    case "ollama":
      return 5400 // 8192 tokens ÷ 1.5
    case "openai":
      return 85000 // 128K tokens
    case "anthropic":
      return 133000 // 200K tokens
    case "gemini":
      return 66000 // 1M tokens (but practical limit)
    default:
      return 5400 // conservative
  }
}

function estimateInputChars(
  elementSteps: string,
  specText: string,
  techniques: string[],
  customPromptLen: number,
): number {
  const techniquesChars = techniques.length > 0
    ? techniques.reduce((sum, t) => sum + t.length + 4, 30)
    : 0
  return BUILTIN_OVERHEAD_CHARS
    + OUTPUT_RESERVE_CHARS
    + elementSteps.length
    + specText.length
    + techniquesChars
    + customPromptLen
}

// ── Schema ──────────────────────────────────────────────────────────────────

const formSchema = z.object({
  profile_id: z.string().min(1, "プロファイルを選択してください"),
  model: z.string().min(1, "モデルを選択してください"),
  suite_name: z.string().min(1, "テストスイート名を入力してください"),
  coverage_level: z.enum(["smoke", "regression", "full"]),
  element_steps_text: z.string().min(1, "操作手順を入力してください"),
  spec_text: z.string().optional(),
  test_techniques: z.array(z.string()).optional().default([]),
})

type FormData = z.infer<typeof formSchema>

interface LeftPaneProps {
  onOpenProfileModal: () => void
}

export function LeftPane({ onOpenProfileModal }: LeftPaneProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [models, setModels] = useState<ModelInfo[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [specOpen, setSpecOpen] = useState(false)
  const [techniquesOpen, setTechniquesOpen] = useState(false)
  const [customTechnique, setCustomTechnique] = useState("")
  const [contextWarningOpen, setContextWarningOpen] = useState(false)
  const [pendingSubmitData, setPendingSubmitData] = useState<FormData | null>(null)
  const [llmSettingsOpen, setLLMSettingsOpen] = useState(false)

  const {
    ir,
    snapshot,
    generating,
    setIR,
    setBaseline,
    setSnapshot,
    setGenerating,
  } = useAppStore()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      profile_id: "",
      model: "",
      suite_name: "",
      coverage_level: "smoke",
      element_steps_text: "",
      spec_text: "",
      test_techniques: [],
    },
  })

  const loadProfiles = useCallback(async () => {
    try {
      const data = await fetchProfiles()
      setProfiles(data)
    } catch {
      toast.error("プロファイルの読み込みに失敗しました")
    }
  }, [])

  const loadModels = useCallback(async () => {
    setModelsLoading(true)
    try {
      const data = await fetchModels()
      setModels(data)
      // Auto-select the first model if none selected
      const selectedModel = watch("model")
      if (data.length > 0 && !selectedModel) {
        setValue("model", data[0].id)
      } else if (selectedModel && !data.some((model) => model.id === selectedModel)) {
        setValue("model", data[0]?.id ?? "")
      }
    } catch {
      toast.error("モデル一覧の取得に失敗しました")
    } finally {
      setModelsLoading(false)
    }
  }, [setValue, watch])

  useEffect(() => {
    loadProfiles()
    loadModels()
  }, [loadProfiles, loadModels])

  const doGenerate = async (data: FormData) => {
    setGenerating(true)
    try {
      // Resolve technique labels from IDs + custom
      const techniqueLabels = resolveTechniqueLabels(data.test_techniques || [])

      const result = await generateDesign({
        profile_id: data.profile_id,
        suite_name: data.suite_name,
        coverage_level: data.coverage_level as CoverageLevel,
        element_steps_text: data.element_steps_text,
        spec_text: data.spec_text || undefined,
        model: data.model || undefined,
        test_techniques: techniqueLabels.length > 0 ? techniqueLabels : undefined,
      })

      setIR(result.ir, result.design_id)
      setBaseline(result.ir)

      const profileName =
        profiles.find((p) => p.id === data.profile_id)?.name || "Unknown"
      setSnapshot({
        profile_name: profileName,
        suite_name: data.suite_name,
        coverage_level: data.coverage_level as CoverageLevel,
        generated_at: new Date().toISOString(),
        design_id: result.design_id,
      })

      toast.success(
        `テスト設計を生成しました（${result.ir.rows.length}行）`
      )
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "生成に失敗しました"
      )
    } finally {
      setGenerating(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    // Check context limit for Ollama models
    const selectedModel = models.find((m) => m.id === data.model)
    const provider = selectedModel?.provider || ""
    const profile = profiles.find((p) => p.id === data.profile_id)
    const customPromptLen = profile?.custom_system_prompt?.length || 0

    const techniqueLabels = resolveTechniqueLabels(data.test_techniques || [])
    const estimatedChars = estimateInputChars(
      data.element_steps_text,
      data.spec_text || "",
      techniqueLabels,
      customPromptLen,
    )
    const budgetChars = getModelContextChars(provider as ProviderName)

    if (estimatedChars > budgetChars) {
      setPendingSubmitData(data)
      setContextWarningOpen(true)
      return
    }

    await doGenerate(data)
  }

  const handleReset = () => {
    reset()
    setCustomTechnique("")
    setSpecOpen(false)
    setTechniquesOpen(false)
  }

  const coverageLevel = watch("coverage_level")
  const selectedTechniques = watch("test_techniques") || []

  const addCustomTechnique = useCallback(() => {
    const normalized = customTechnique.trim()
    if (!normalized) {
      return
    }

    const current = watch("test_techniques") || []
    if (!current.includes(normalized)) {
      setValue("test_techniques", [...current, normalized])
    }
    setCustomTechnique("")
  }, [customTechnique, setValue, watch])

  const removeTechnique = useCallback((target: string) => {
    const current = watch("test_techniques") || []
    setValue(
      "test_techniques",
      current.filter((item) => item !== target),
    )
  }, [setValue, watch])

  const customTechniques = selectedTechniques.filter(
    (techniqueId) => !DEFAULT_TECHNIQUES.some((technique) => technique.id === techniqueId),
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">入力</h2>
      </div>

      {/* Scrollable form content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {/* Model Selector */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="model" className="text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-1">
                <Cpu className="h-3 w-3" />
                LLMモデル
              </span>
            </Label>
            <div className="flex gap-2">
              <Select
                value={watch("model")}
                onValueChange={(v) => setValue("model", v)}
              >
                <SelectTrigger className="flex-1 h-8 text-sm">
                  <SelectValue placeholder={modelsLoading ? "読み込み中..." : "モデルを選択"} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupByProvider(models)).map(([provider, group]) => (
                    <SelectGroup key={provider}>
                      <SelectLabel className="text-xs font-semibold">
                        {PROVIDER_LABELS[provider as ProviderName] ?? provider}
                      </SelectLabel>
                      {group.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="flex items-center gap-2">
                            <span>{m.name}</span>
                            {m.size != null && (
                              <span className="text-[10px] text-muted-foreground">
                                ({formatModelSize(m.size)})
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 bg-transparent"
                onClick={loadModels}
                disabled={modelsLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${modelsLoading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 bg-transparent"
                onClick={() => setLLMSettingsOpen(true)}
                title="LLM設定"
              >
                <Key className="h-3.5 w-3.5" />
              </Button>
            </div>
            {errors.model && (
              <p className="text-xs text-destructive">{errors.model.message}</p>
            )}
            {models.length === 0 && !modelsLoading && (
              <p className="text-[10px] text-muted-foreground">
                Ollamaを起動するかAPIキーを設定してください
              </p>
            )}
          </div>

          {/* Profile Selector */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile" className="text-xs font-medium text-muted-foreground">
              プロファイル
            </Label>
            <div className="flex gap-2">
              <Select
                value={watch("profile_id")}
                onValueChange={(v) => setValue("profile_id", v)}
              >
                <SelectTrigger className="flex-1 h-8 text-sm">
                  <SelectValue placeholder="プロファイルを選択" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 bg-transparent"
                onClick={onOpenProfileModal}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </div>
            {errors.profile_id && (
              <p className="text-xs text-destructive">{errors.profile_id.message}</p>
            )}
          </div>

          {/* Suite Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suite_name" className="text-xs font-medium text-muted-foreground">
              テストスイート名
            </Label>
            <Input
              id="suite_name"
              {...register("suite_name")}
              placeholder="例：ログイン機能テスト"
              className="h-8 text-sm"
            />
            {errors.suite_name && (
              <p className="text-xs text-destructive">{errors.suite_name.message}</p>
            )}
          </div>

          {/* Coverage Level - vertical */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              テスト範囲
            </Label>
            <RadioGroup
              value={coverageLevel}
              onValueChange={(v) =>
                setValue("coverage_level", v as CoverageLevel)
              }
              className="flex flex-col gap-1.5"
            >
              {COVERAGE_OPTIONS.map((item) => (
                <div key={item.value} className="flex items-start gap-1.5">
                  <RadioGroupItem value={item.value} id={`coverage-${item.value}`} className="mt-0.5" />
                  <Label
                    htmlFor={`coverage-${item.value}`}
                    className="text-xs font-normal cursor-pointer leading-relaxed"
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground ml-1.5">{item.desc}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Test Techniques (Collapsible) */}
          <Collapsible open={techniquesOpen} onOpenChange={setTechniquesOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-full justify-between px-1 text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-1.5">
                  テスト技法
                  {selectedTechniques.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {selectedTechniques.length}
                    </Badge>
                  )}
                </span>
                {techniquesOpen ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1.5">
              <div className="flex flex-col gap-2 rounded-md border border-border p-2.5">
                {DEFAULT_TECHNIQUES.map((tech) => {
                  const checked = selectedTechniques.includes(tech.id)
                  return (
                    <div key={tech.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`tech-${tech.id}`}
                        checked={checked}
                        onCheckedChange={(v) => {
                          const current = selectedTechniques
                          if (v) {
                            setValue("test_techniques", [...current, tech.id])
                          } else {
                            setValue("test_techniques", current.filter((t) => t !== tech.id))
                          }
                        }}
                      />
                      <Label
                        htmlFor={`tech-${tech.id}`}
                        className="text-xs font-normal cursor-pointer"
                      >
                        {tech.label}
                      </Label>
                    </div>
                  )
                })}
                <Separator className="my-1" />
                <div className="flex gap-1.5">
                  <Input
                    value={customTechnique}
                    onChange={(e) => setCustomTechnique(e.target.value)}
                    placeholder="カスタム技法を追加..."
                    className="h-7 text-xs flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addCustomTechnique()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[10px] bg-transparent"
                    onClick={addCustomTechnique}
                  >
                    追加
                  </Button>
                </div>
                {/* Show custom (non-default) techniques as removable badges */}
                {customTechniques.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {customTechniques.map((technique) => (
                      <Badge
                        key={technique}
                        variant="secondary"
                        className="h-5 cursor-pointer gap-1 text-[10px] hover:bg-destructive/20"
                        onClick={() => removeTechnique(technique)}
                      >
                        {technique} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Element Steps */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="element_steps" className="text-xs font-medium text-muted-foreground">
              操作手順 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="element_steps"
              {...register("element_steps_text")}
              placeholder={"1. ログインページを開く\n2. ユーザー名を入力する\n3. パスワードを入力する\n4. ログインボタンをクリックする"}
              rows={6}
              className="text-sm resize-none"
            />
            {errors.element_steps_text && (
              <p className="text-xs text-destructive">
                {errors.element_steps_text.message}
              </p>
            )}
          </div>

          {/* Spec Text (Collapsible) */}
          <Collapsible open={specOpen} onOpenChange={setSpecOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-full justify-between px-1 text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3 w-3" />
                  仕様テキスト（任意）
                </span>
                {specOpen ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-1.5">
              <Textarea
                {...register("spec_text")}
                placeholder="仕様書の内容を貼り付けてください..."
                rows={4}
                className="text-sm resize-none"
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              size="sm"
              className="flex-1 h-8 text-xs"
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-3 w-3" />
              )}
              {generating ? "生成中..." : "生成する"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-transparent"
              onClick={handleReset}
            >
              <RotateCcw className="mr-1.5 h-3 w-3" />
              リセット
            </Button>
          </div>
        </form>

        {/* Generation Snapshot */}
        {snapshot && (
          <>
            <Separator className="my-4" />
            <div className="rounded-md border border-border bg-muted/50 p-3">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Clock className="h-3 w-3" />
                生成情報
              </h3>
              <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>プロファイル</span>
                  <span className="font-medium text-foreground">
                    {snapshot.profile_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>スイート名</span>
                  <span className="font-medium text-foreground">
                    {snapshot.suite_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>テスト範囲</span>
                  <Badge variant="secondary" className="h-5 text-[10px]">
                    {snapshot.coverage_level}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>生成日時</span>
                  <span className="font-medium text-foreground">
                    {new Date(snapshot.generated_at).toLocaleString("ja-JP")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>設計ID</span>
                  <span className="font-mono text-[10px] text-foreground">
                    {snapshot.design_id}
                  </span>
                </div>
                {ir && (
                  <div className="flex justify-between">
                    <span>行数</span>
                    <span className="font-medium text-foreground">
                      {ir.rows.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <LLMSettingsModal
        open={llmSettingsOpen}
        onOpenChange={setLLMSettingsOpen}
        onSaved={loadModels}
      />

      {/* Context limit warning dialog */}
      <AlertDialog open={contextWarningOpen} onOpenChange={setContextWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>コンテキスト上限の警告</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                入力内容（操作手順・仕様テキスト・テスト技法・カスタムプロンプト）の
                合計文字数がモデルのコンテキスト上限を超える可能性があります。
              </span>
              <span className="block">
                モデルが指示の一部を無視したり、出力が途中で途切れる場合があります。
                入力を短くするか、より大きなコンテキストを持つモデルの使用を検討してください。
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSubmitData(null)}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setContextWarningOpen(false)
                if (pendingSubmitData) {
                  doGenerate(pendingSubmitData)
                  setPendingSubmitData(null)
                }
              }}
            >
              このまま生成する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
