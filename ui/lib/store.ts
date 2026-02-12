import { create } from "zustand"
import type { IR, IRRow, Priority, GenerationSnapshot, CoverageLevel } from "./types"

// ── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function cloneRows(rows: IRRow[]): IRRow[] {
  return rows.map((r) => ({ ...r }))
}

function cloneIR(ir: IR): IR {
  return {
    suite: { ...ir.suite },
    rows: cloneRows(ir.rows),
  }
}

function getCaseTagList(rawTag: string): string[] {
  return rawTag
    .split("|")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function mergeCaseTags(rawTag: string, tagToAdd: string): string {
  const normalizedTag = tagToAdd.trim()
  if (!normalizedTag) {
    return rawTag
  }
  const current = getCaseTagList(rawTag)
  if (current.includes(normalizedTag)) {
    return rawTag
  }
  return [...current, normalizedTag].join("|")
}

function removeCaseTag(rawTag: string, tagToRemove: string): string {
  const normalizedTag = tagToRemove.trim()
  if (!normalizedTag) {
    return rawTag
  }
  return getCaseTagList(rawTag)
    .filter((tag) => tag !== normalizedTag)
    .join("|")
}

// ── Types ───────────────────────────────────────────────────────────────────

const MAX_HISTORY = 50

interface Filters {
  search: string
  priorities: Priority[]
  tags: string[]
  casePrefix: string
}

interface AppState {
  // IR state
  ir: IR | null
  designId: string | null
  baseline: IR | null
  snapshot: GenerationSnapshot | null

  // History
  past: IR[]
  future: IR[]

  // Filters
  filters: Filters

  // Loading states
  generating: boolean
  saving: boolean
  exporting: boolean

  // Actions – IR
  setIR: (ir: IR, designId?: string) => void
  setBaseline: (ir: IR) => void
  setSnapshot: (s: GenerationSnapshot) => void
  resetIR: () => void

  // Actions – History (call pushHistory before mutation)
  pushHistory: () => void
  undo: () => void
  redo: () => void

  // Actions – Row operations
  updateCell: (rowId: string, field: keyof IRRow, value: string) => void
  addRow: (afterRowId: string | null, caseGroup?: string) => void
  deleteRow: (rowId: string) => void
  duplicateRow: (rowId: string) => void
  moveRow: (fromIndex: number, toIndex: number) => void

  // Actions – Case operations
  deleteCase: (caseName: string) => void
  duplicateCase: (caseName: string) => void
  renameCase: (oldName: string, newName: string) => void
  setCasePriority: (caseName: string, priority: Priority) => void
  bulkAddTag: (caseName: string, tag: string) => void
  bulkRemoveTag: (caseName: string, tag: string) => void

  // Actions – Filters
  setSearch: (s: string) => void
  setPriorityFilter: (p: Priority[]) => void
  setTagFilter: (t: string[]) => void
  setCaseFilter: (c: string) => void
  clearFilters: () => void

  // Actions – Loading
  setGenerating: (v: boolean) => void
  setSaving: (v: boolean) => void
  setExporting: (v: boolean) => void
}

// ── Store ───────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  ir: null,
  designId: null,
  baseline: null,
  snapshot: null,
  past: [],
  future: [],
  filters: { search: "", priorities: [], tags: [], casePrefix: "" },
  generating: false,
  saving: false,
  exporting: false,

  // ── IR ──────────────────────────────────────────────────────────────────

  setIR: (ir, designId) =>
    set({
      ir: cloneIR(ir),
      ...(designId !== undefined ? { designId } : {}),
      past: [],
      future: [],
    }),

  setBaseline: (ir) => set({ baseline: cloneIR(ir) }),

  setSnapshot: (s) => set({ snapshot: s }),

  resetIR: () => {
    const { baseline } = get()
    if (!baseline) return
    const state = get()
    set({
      past: state.ir ? [...state.past.slice(-(MAX_HISTORY - 1)), cloneIR(state.ir)] : state.past,
      ir: cloneIR(baseline),
      future: [],
    })
  },

  // ── History ─────────────────────────────────────────────────────────────

  pushHistory: () => {
    const { ir, past } = get()
    if (!ir) return
    set({
      past: [...past.slice(-(MAX_HISTORY - 1)), cloneIR(ir)],
      future: [],
    })
  },

  undo: () => {
    const { past, ir, future } = get()
    if (past.length === 0 || !ir) return
    const prev = past[past.length - 1]
    set({
      past: past.slice(0, -1),
      ir: prev,
      future: [cloneIR(ir), ...future],
    })
  },

  redo: () => {
    const { past, ir, future } = get()
    if (future.length === 0 || !ir) return
    const next = future[0]
    set({
      past: [...past, cloneIR(ir)],
      ir: next,
      future: future.slice(1),
    })
  },

  // ── Row Operations ──────────────────────────────────────────────────────

  updateCell: (rowId, field, value) => {
    const { ir } = get()
    if (!ir) return
    get().pushHistory()
    set({
      ir: {
        ...ir,
        rows: ir.rows.map((r) =>
          r.id === rowId ? { ...r, [field]: value } : r
        ),
      },
    })
  },

  addRow: (afterRowId, caseGroup) => {
    const { ir } = get()
    if (!ir) return
    get().pushHistory()
    const newRow: IRRow = {
      id: uid(),
      Case: caseGroup || "",
      Step: "",
      Expected: "",
      Tag: "",
      Priority: "Medium",
      remarks: "",
    }
    if (!afterRowId) {
      set({ ir: { ...ir, rows: [...ir.rows, newRow] } })
    } else {
      const idx = ir.rows.findIndex((r) => r.id === afterRowId)
      const rows = [...ir.rows]
      rows.splice(idx + 1, 0, newRow)
      set({ ir: { ...ir, rows } })
    }
  },

  deleteRow: (rowId) => {
    const { ir } = get()
    if (!ir) return
    get().pushHistory()
    set({ ir: { ...ir, rows: ir.rows.filter((r) => r.id !== rowId) } })
  },

  duplicateRow: (rowId) => {
    const { ir } = get()
    if (!ir) return
    get().pushHistory()
    const idx = ir.rows.findIndex((r) => r.id === rowId)
    if (idx === -1) return
    const clone = { ...ir.rows[idx], id: uid() }
    const rows = [...ir.rows]
    rows.splice(idx + 1, 0, clone)
    set({ ir: { ...ir, rows } })
  },

  moveRow: (fromIndex, toIndex) => {
    const { ir } = get()
    if (!ir) return
    if (
      fromIndex < 0
      || toIndex < 0
      || fromIndex >= ir.rows.length
      || toIndex >= ir.rows.length
      || fromIndex === toIndex
    ) {
      return
    }

    get().pushHistory()
    const rows = [...ir.rows]
    const [moved] = rows.splice(fromIndex, 1)
    rows.splice(toIndex, 0, moved)
    set({ ir: { ...ir, rows } })
  },

  // ── Case Operations ────────────────────────────────────────────────────

  deleteCase: (caseName) => {
    const { ir } = get()
    if (!ir) return
    get().pushHistory()
    set({ ir: { ...ir, rows: ir.rows.filter((r) => r.Case !== caseName) } })
  },

  duplicateCase: (caseName) => {
    const { ir } = get()
    if (!ir) return
    get().pushHistory()
    const caseRows = ir.rows.filter((r) => r.Case === caseName)
    const cloned = caseRows.map((r) => ({
      ...r,
      id: uid(),
      Case: `${caseName} (copy)`,
    }))
    set({ ir: { ...ir, rows: [...ir.rows, ...cloned] } })
  },

  renameCase: (oldName, newName) => {
    const { ir } = get()
    if (!ir) return
    get().pushHistory()
    set({
      ir: {
        ...ir,
        rows: ir.rows.map((r) =>
          r.Case === oldName ? { ...r, Case: newName } : r
        ),
      },
    })
  },

  setCasePriority: (caseName, priority) => {
    const { ir } = get()
    if (!ir) return
    get().pushHistory()
    set({
      ir: {
        ...ir,
        rows: ir.rows.map((r) =>
          r.Case === caseName ? { ...r, Priority: priority } : r
        ),
      },
    })
  },

  bulkAddTag: (caseName, tag) => {
    const { ir } = get()
    if (!ir) return

    const normalizedTag = tag.trim()
    if (!normalizedTag) return

    get().pushHistory()
    set({
      ir: {
        ...ir,
        rows: ir.rows.map((r) => {
          if (r.Case !== caseName) return r
          const nextTag = mergeCaseTags(r.Tag, normalizedTag)
          return nextTag === r.Tag ? r : { ...r, Tag: nextTag }
        }),
      },
    })
  },

  bulkRemoveTag: (caseName, tag) => {
    const { ir } = get()
    if (!ir) return

    const normalizedTag = tag.trim()
    if (!normalizedTag) return

    get().pushHistory()
    set({
      ir: {
        ...ir,
        rows: ir.rows.map((r) => {
          if (r.Case !== caseName) return r
          const nextTag = removeCaseTag(r.Tag, normalizedTag)
          return nextTag === r.Tag ? r : { ...r, Tag: nextTag }
        }),
      },
    })
  },

  // ── Filters ─────────────────────────────────────────────────────────────

  setSearch: (search) =>
    set((s) => ({ filters: { ...s.filters, search } })),

  setPriorityFilter: (priorities) =>
    set((s) => ({ filters: { ...s.filters, priorities } })),

  setTagFilter: (tags) =>
    set((s) => ({ filters: { ...s.filters, tags } })),

  setCaseFilter: (casePrefix) =>
    set((s) => ({ filters: { ...s.filters, casePrefix } })),

  clearFilters: () =>
    set({ filters: { search: "", priorities: [], tags: [], casePrefix: "" } }),

  // ── Loading ─────────────────────────────────────────────────────────────

  setGenerating: (generating) => set({ generating }),
  setSaving: (saving) => set({ saving }),
  setExporting: (exporting) => set({ exporting }),
}))

// ── Autosave to localStorage ────────────────────────────────────────────────

if (typeof window !== "undefined") {
  useAppStore.subscribe((state) => {
    if (state.ir && state.designId) {
      try {
        localStorage.setItem(
          `qa-tool-${state.designId}`,
          JSON.stringify({ ir: state.ir, snapshot: state.snapshot })
        )
      } catch {
        // ignore quota errors
      }
    }
  })
}

export function restoreFromLocalStorage(designId: string): {
  ir: IR
  snapshot: GenerationSnapshot | null
} | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(`qa-tool-${designId}`)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}
