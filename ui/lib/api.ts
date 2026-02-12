import type {
  Profile,
  DesignRequest,
  DesignResponse,
  IR,
  IRRow,
  CoverageLevel,
  ModelInfo,
  LLMSettingsSummary,
  UpdateLLMSettingsRequest,
} from "./types"

// Toggle this to use mock data when backend is unavailable
const USE_MOCK = false
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com"

const DEFAULT_API_BASE = (() => {
  if (typeof window === "undefined") return "/api"
  const { hostname, port } = window.location
  if (
    (hostname === "localhost" || hostname === "127.0.0.1") &&
    port === "3000"
  ) {
    return "http://localhost:3001/api"
  }
  return "/api"
})()

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || DEFAULT_API_BASE

// ── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function encodePathSegment(value: string, fieldName: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`${fieldName} が空です`)
  }
  if (trimmed.includes("/")) {
    throw new Error(`${fieldName} に無効な文字が含まれています`)
  }
  return encodeURIComponent(trimmed)
}

function apiPath(path: string): string {
  return `${API_BASE}${path}`
}

function truncateForError(value: string, maxLength = 500): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}...`
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers)
  if (!headers.has("Content-Type") && options?.body !== undefined) {
    headers.set("Content-Type", "application/json")
  }

  const res = await fetch(apiPath(path), {
    ...options,
    headers,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error")
    throw new Error(`API error ${res.status}: ${truncateForError(text)}`)
  }

  try {
    return await res.json() as T
  } catch {
    throw new Error("APIレスポンスのJSON解析に失敗しました")
  }
}

// ── Seed Data ───────────────────────────────────────────────────────────────

const SEED_PROFILES: Profile[] = [
  {
    id: "p1",
    name: "Default Profile",
    terminology_text: "Standard QA terminology",
    style_text: "Formal, concise",
  },
  {
    id: "p2",
    name: "E-Commerce",
    terminology_text: "Cart, Checkout, SKU, PDP, PLP",
    style_text: "User-centric, step-by-step",
  },
]

function generateSeedIR(suiteName: string, coverage: CoverageLevel): IR {
  const rows: IRRow[] = [
    { id: uid(), Case: "Login", Step: "Enter valid credentials", Expected: "User is logged in", Tag: "auth|smoke", Priority: "High", remarks: "" },
    { id: uid(), Case: "Login", Step: "Enter invalid credentials", Expected: "Error message displayed", Tag: "auth|negative", Priority: "High", remarks: "" },
    { id: uid(), Case: "Login", Step: "Click forgot password", Expected: "Password reset page displayed", Tag: "auth", Priority: "Medium", remarks: "" },
    { id: uid(), Case: "Dashboard", Step: "Navigate to dashboard", Expected: "Dashboard loads correctly", Tag: "navigation|smoke", Priority: "High", remarks: "" },
    { id: uid(), Case: "Dashboard", Step: "Check widget data", Expected: "All widgets display data", Tag: "ui", Priority: "Medium", remarks: "" },
    { id: uid(), Case: "Search", Step: "Enter search keyword", Expected: "Results are displayed", Tag: "search|smoke", Priority: "High", remarks: "" },
    { id: uid(), Case: "Search", Step: "Search with no results", Expected: "Empty state shown", Tag: "search|negative", Priority: "Low", remarks: "" },
  ]

  if (coverage === "regression" || coverage === "full") {
    rows.push(
      { id: uid(), Case: "Settings", Step: "Update profile name", Expected: "Name is updated", Tag: "settings", Priority: "Medium", remarks: "" },
      { id: uid(), Case: "Settings", Step: "Change password", Expected: "Password is changed", Tag: "settings|auth", Priority: "High", remarks: "" },
    )
  }

  if (coverage === "full") {
    rows.push(
      { id: uid(), Case: "Performance", Step: "Load page under stress", Expected: "Page loads within 3s", Tag: "performance", Priority: "Low", remarks: "" },
      { id: uid(), Case: "Accessibility", Step: "Screen reader navigation", Expected: "All elements accessible", Tag: "a11y", Priority: "Medium", remarks: "" },
    )
  }

  return {
    suite: {
      name: suiteName,
      coverage_level: coverage,
      assumptions: ["Backend API is available", "Test environment is stable"],
      notes: "Auto-generated test cases",
    },
    rows,
  }
}

// ── Mock storage ────────────────────────────────────────────────────────────

let mockProfiles = [...SEED_PROFILES]
const mockDesigns: Record<string, { ir: IR; version: number }> = {}
let mockLLMSettings: LLMSettingsSummary = {
  openai: { configured: false, baseUrl: DEFAULT_OPENAI_BASE_URL },
  gemini: { configured: false },
  anthropic: { configured: false },
}

// ── Models API ──────────────────────────────────────────────────────────────

export async function fetchModels(): Promise<ModelInfo[]> {
  if (USE_MOCK) {
    await delay(300)
    return [
      { id: "ollama:phi4mini", name: "phi4mini", provider: "ollama", size: 2_000_000_000 },
    ]
  }
  return request<ModelInfo[]>("/models")
}

// ── Settings API ────────────────────────────────────────────────────────────

export async function fetchLLMSettings(): Promise<LLMSettingsSummary> {
  if (USE_MOCK) {
    await delay(200)
    return { ...mockLLMSettings }
  }
  return request<LLMSettingsSummary>("/settings/llm")
}

export async function updateLLMSettings(
  payload: UpdateLLMSettingsRequest
): Promise<LLMSettingsSummary> {
  if (USE_MOCK) {
    await delay(300)
    if (payload.openai_api_key !== undefined) {
      mockLLMSettings.openai.configured = payload.openai_api_key.trim().length > 0
    }
    if (payload.openai_base_url !== undefined) {
      mockLLMSettings.openai.baseUrl =
        payload.openai_base_url.trim() || DEFAULT_OPENAI_BASE_URL
    }
    if (payload.gemini_api_key !== undefined) {
      mockLLMSettings.gemini.configured = payload.gemini_api_key.trim().length > 0
    }
    if (payload.anthropic_api_key !== undefined) {
      mockLLMSettings.anthropic.configured =
        payload.anthropic_api_key.trim().length > 0
    }
    return { ...mockLLMSettings }
  }

  const sanitizedPayload: UpdateLLMSettingsRequest = {}
  if (payload.openai_api_key !== undefined) {
    sanitizedPayload.openai_api_key = payload.openai_api_key.trim()
  }
  if (payload.openai_base_url !== undefined) {
    sanitizedPayload.openai_base_url = payload.openai_base_url.trim()
  }
  if (payload.gemini_api_key !== undefined) {
    sanitizedPayload.gemini_api_key = payload.gemini_api_key.trim()
  }
  if (payload.anthropic_api_key !== undefined) {
    sanitizedPayload.anthropic_api_key = payload.anthropic_api_key.trim()
  }

  if (Object.keys(sanitizedPayload).length === 0) {
    throw new Error("更新内容がありません")
  }

  return request<LLMSettingsSummary>("/settings/llm", {
    method: "PUT",
    body: JSON.stringify(sanitizedPayload),
  })
}

// ── Profile API ─────────────────────────────────────────────────────────────

export async function fetchProfiles(): Promise<Profile[]> {
  if (USE_MOCK) {
    await delay(300)
    return [...mockProfiles]
  }
  return request<Profile[]>("/profiles")
}

export async function fetchProfile(id: string): Promise<Profile> {
  if (USE_MOCK) {
    await delay(200)
    const p = mockProfiles.find((x) => x.id === id)
    if (!p) throw new Error("Profile not found")
    return { ...p }
  }
  return request<Profile>(`/profiles/${encodePathSegment(id, "id")}`)
}

export async function createProfile(
  data: Omit<Profile, "id">
): Promise<{ id: string }> {
  if (USE_MOCK) {
    await delay(300)
    const id = uid()
    mockProfiles.push({ ...data, id })
    return { id }
  }
  return request<{ id: string }>("/profiles", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateProfile(
  id: string,
  data: Partial<Profile>
): Promise<{ id: string }> {
  if (USE_MOCK) {
    await delay(300)
    mockProfiles = mockProfiles.map((p) =>
      p.id === id ? { ...p, ...data } : p
    )
    return { id }
  }
  return request<{ id: string }>(`/profiles/${encodePathSegment(id, "id")}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

// ── Design API ──────────────────────────────────────────────────────────────

export async function generateDesign(
  req: DesignRequest
): Promise<DesignResponse> {
  if (USE_MOCK) {
    await delay(1500)
    const design_id = `d-${uid()}`
    const ir = generateSeedIR(req.suite_name, req.coverage_level)
    mockDesigns[design_id] = { ir, version: 1 }
    return { design_id, ir }
  }
  return request<DesignResponse>("/design", {
    method: "POST",
    body: JSON.stringify(req),
  })
}

// ── IR Persistence API ──────────────────────────────────────────────────────

export async function saveIR(
  designId: string,
  ir: IR
): Promise<{ version_no: number }> {
  if (USE_MOCK) {
    await delay(500)
    const existing = mockDesigns[designId]
    const version = existing ? existing.version + 1 : 1
    mockDesigns[designId] = { ir, version }
    return { version_no: version }
  }
  const safeDesignId = encodePathSegment(designId, "designId")
  return request<{ version_no: number }>(`/ir/${safeDesignId}/save`, {
    method: "POST",
    body: JSON.stringify({ ir }),
  })
}

export async function fetchLatestIR(
  designId: string
): Promise<{ version_no: number; ir: IR }> {
  if (USE_MOCK) {
    await delay(300)
    const d = mockDesigns[designId]
    if (!d) throw new Error("Design not found")
    return { version_no: d.version, ir: d.ir }
  }
  const safeDesignId = encodePathSegment(designId, "designId")
  return request<{ version_no: number; ir: IR }>(`/ir/${safeDesignId}/latest`)
}

// ── Export API ───────────────────────────────────────────────────────────────

export async function exportCSV(ir: IR): Promise<string> {
  if (USE_MOCK) {
    await delay(400)
    const header = "ケース,操作内容,期待結果,タグ,優先度,備考"
    const lines = ir.rows.map(
      (r) =>
        `"${esc(r.Case)}","${esc(r.Step)}","${esc(r.Expected)}","${esc(r.Tag)}","${r.Priority}","${esc(r.remarks)}"`
    )
    return [header, ...lines].join("\n")
  }
  const res = await request<{ csv: string }>("/export/csv", {
    method: "POST",
    body: JSON.stringify({ ir }),
  })
  return res.csv
}

function esc(s: string): string {
  return s.replace(/"/g, '""')
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
