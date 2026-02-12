# 実装プラン

## 1. プロジェクト構成
```
├─ ui/                 # Next.js UI (React + TypeScript)
│   ├─ app/
│   │   ├─ layout.tsx
│   │   └─ page.tsx
│   ├─ components/
│   │   ├─ ui/           # 共通UIコンポーネント（tailwind + shadcn）
│   │   ├─ diff/
│   │   ├─ export/
│   │   └─ ir-table/
│   └─ lib/
├─ backend/            # Express + TypeScript API
│   ├─ src/app/
│   │   ├─ profiles.ts
│   │   ├─ design.ts
│   │   ├─ export.ts
│   │   └─ health.ts
│   ├─ prisma/
│   │   └─ schema.prisma
│   └─ server.ts
├─ infra/              # データベースマイグレーション・Ollamaクライアント
└─ docs/
    ├─ IR_SCHEMA.json
    └─ implementation_plan.md
```

## 2. UI実装（Next.js）
- **ページ構成**
  - `/profiles` : プロファイル一覧・新規作成・編集。
  - `/design/new` : デザイン入力フォーム。
  - `/design/:id/ir` : IR 表示・編集。
  - `/export/:id/csv` : CSV ダウンロード。
- **状態管理**
  - React Query（データフェッチ） + Zustand（ローカル編集）
- **主要コンポーネント**
  - `components/ui/*` を再利用。
  - `components/ir-table/diff-panel.tsx` で行差分表示。
  - `components/export/csv-preview.tsx` でダウンロードリンク生成。

## 3. バックエンド実装（Express）
- **エンドポイント**
  ```ts
  POST   /api/profiles          // 新規作成
  GET    /api/profiles/:id      // 詳細取得
  PUT    /api/profiles/:id      // 更新
  POST   /api/design            // LLM 呼び出し → IR 保存
  POST   /api/export/csv        // IR→CSV
  GET    /health                // ヘルスチェック
  ```
- **LLM 呼び出し**
  - Ollama REST API (`/v1/chat/completions`), JSON Schema を `system_message` に埋め込む。
  - 再試行ロジック：JSON parse / スキーマ不一致時に 1 回リトライ。
- **バリデーション**
  - Zod スキーマで入力・レスポンスを検証。`

## 4. データベース（Prisma + SQLite）
- `profiles`, `design_jobs`, `ir_versions` テーブルを基本設計に合わせて定義。
- マイグレーションは `prisma migrate dev`。開発時は SQLite、ステージングでは PostgreSQL を想定。

## 5. CSV エクスポート
- Node の `csv-stringify` ライブラリで IR rows → RFC4180 形式に変換。
- バイト配列を Blob としてフロントへ返却し、ダウンロードリンク生成。

## 6. CI/CD（GitHub Actions）
- フロント: `pnpm install && pnpm run build`。テストは Jest + React Testing Library。
- バックエンド: `npm install && npm test`。Prisma スキーマ検証。
- Dockerfile を用意し、CI でイメージをビルドしてレジストリへ push。

## 7. ドキュメント
- `docs/IR_SCHEMA.json`（JSON Schema）
- `rules/coverage_*.yaml`（ルールエンジン設定）
- README に API スペックと UI フローを記載。

## 8. 開発フロー
1. **Profile CRUD** → UI と API を作成。データは Prisma で永続化。
2. **Design 作成** → LLM 呼び出し、IR 保存。
3. **IR 表示・編集** → テーブル表示、行追加/削除/並べ替え。
4. **CSV エクスポート** → API 実装、フロントでダウンロード。
5. **バージョン管理**（後段）→ `ir_versions` テーブルに履歴保存。

## 9. 優先度（MVP）
1. Profile CRUD + UI
2. Design 作成 (LLM 呼び出し)
3. IR 表示・編集 UI
4. CSV エクスポート
5. バージョン管理とロギング

---


