// ── Data Model ──────────────────────────────────────────────────────────────

export type CoverageLevel = "smoke" | "regression" | "full"
export type Priority = "High" | "Medium" | "Low"

export interface IRRow {
  id: string // client-side unique id for keying
  Case: string
  Step: string
  Expected: string
  Tag: string // "a|b|c"
  Priority: Priority
  remarks: string
}

export interface IRSuite {
  name: string
  target?: string
  coverage_level: CoverageLevel
  assumptions?: string[]
  notes?: string
}

export interface IR {
  suite: IRSuite
  rows: IRRow[]
}

// ── Profile ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  name: string
  terminology_text?: string
  style_text?: string
  custom_system_prompt?: string
}

// ── Model ───────────────────────────────────────────────────────────────────

export type ProviderName = "ollama" | "openai" | "anthropic" | "gemini"

export interface ModelInfo {
  id: string            // "provider:model_name"
  name: string          // display name
  provider: ProviderName
  size?: number         // bytes – only Ollama provides this
}

export interface LLMSettingsSummary {
  openai: {
    configured: boolean
    baseUrl: string
  }
  gemini: {
    configured: boolean
  }
  anthropic: {
    configured: boolean
  }
}

export interface UpdateLLMSettingsRequest {
  openai_api_key?: string
  openai_base_url?: string
  gemini_api_key?: string
  anthropic_api_key?: string
}

/** @deprecated Use ModelInfo instead */
export type OllamaModel = ModelInfo

// ── Design Request / Response ───────────────────────────────────────────────

export interface DesignRequest {
  profile_id: string
  suite_name: string
  coverage_level: CoverageLevel
  element_steps_text: string
  spec_text?: string
  model?: string
  test_techniques?: string[]
}

export interface DesignResponse {
  design_id: string
  ir: IR
}

// ── Generation Snapshot ─────────────────────────────────────────────────────

export interface GenerationSnapshot {
  profile_name: string
  suite_name: string
  coverage_level: CoverageLevel
  generated_at: string
  design_id: string
}

// ── Diff ────────────────────────────────────────────────────────────────────

export type DiffType = "added" | "removed" | "modified"

export interface RowDiff {
  type: DiffType
  row: IRRow
  originalRow?: IRRow
  caseGroup: string
}

// ── Quality Check ───────────────────────────────────────────────────────────

export interface QualityCheck {
  id: string
  label: string
  description: string
  severity: "error" | "warning" | "info"
  count: number
  affectedRows: string[] // row ids
  fixAction?: string
}
