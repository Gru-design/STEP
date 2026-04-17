# 請求書管理 設計書（Phase 7 / 商用化）

> **ステータス**: ドラフト
> **最終更新**: 2026-04-17
> **対象**: 開発・経理・カスタマーサクセス
> **関連ドキュメント**:
> - `supabase/migrations/00032_billing_invoices.sql` (DB 実装)
> - `docs/schema.sql` (DB スキーマ同期)
> - `docs/legal/act-on-specified-commercial-transactions.md` (特商法表記)
> - `docs/legal/sla.md` (SLA)
> - `docs/legal/terms-of-service.md` (利用規約)

---

## 1. 方針

STEP は法人向け B2B SaaS として提供する。Stripe 等のオンライン決済は採
用せず、**請求書管理 (銀行振込 / 口座振替)** を課金の中核とする。これに
より:

- 日本の法人の一般的な支払フロー（月末締め翌月末払い等）に適合
- 大企業・上場企業の購買・経理プロセスに乗る
- 与信枠・締日・請求書フォーマットなど、取引先ごとの要件に柔軟対応
- **適格請求書等保存方式（インボイス制度）**に準拠

## 2. 料金体系

| プラン | 月額単価 (税抜/1 シート) | 最低契約シート数 | 主な用途 |
|---|---|---|---|
| Starter | ¥1,200 | 10 | 小チーム |
| Professional | ¥2,000 | 20 | 部門展開 |
| Enterprise | 個別見積 | 100 以上 | 全社・カスタマイズ |

- 契約単位は **シート × 月**。月次スナップショットにより請求算定。
- 年払い契約は割引率設定可（`billing_contracts.discount_rate`）。
- 最低契約シート数を下回った場合でも最低額を請求（min seat guarantee）。
- 契約シート数を超過した月は超過分を別明細で計上。
- プラン変更は翌契約期間から適用。

## 3. 主要テーブル

| テーブル | 役割 |
|---|---|
| `billing_accounts` | 請求先情報（法人名、住所、担当者、支払方法、締日等） |
| `billing_contracts` | 契約（期間・プラン・単価・シート数） |
| `billing_seat_snapshots` | 月次シート数スナップショット（請求の根拠、監査証跡） |
| `invoices` | 請求書本体（ヘッダ、税額、発行情報、支払情報） |
| `invoice_items` | 請求明細（税率区分あり） |
| `invoice_payments` | 入金記録（消込） |

`tenants.billing_customer_code` はテナントごとに自社採番する法人識別コード。

## 4. ライフサイクル

```
申込
  ↓
billing_accounts 作成 (admin または super_admin)
  ↓
billing_contracts 作成 (super_admin が登録)
  ↓ 月次バッチ
billing_seat_snapshots 生成 (月次 cron)
  ↓
invoices (status=draft) 自動生成 + invoice_items 積み上げ
  ↓ 経理レビュー
invoices → issued (請求書番号採番、PDF生成、内容確定)
  ↓ 送付
invoices → sent (送付先メール記録)
  ↓ 入金
invoice_payments 登録 → invoices.paid_amount_jpy 加算
  ↓ 全額入金
invoices → paid
  ↓ 支払遅延
invoices → overdue (cron による自動ステータス更新)
  ↓ 修正が必要な場合
credit_note 発行 or void (事由を voided_reason に記録)
```

## 5. 月次締め処理

毎月 1 日 05:00 JST（Vercel Cron + advisory lock）に以下を実行:

1. 前月分 active 契約一覧の取得
2. 各契約の `billing_seat_snapshots` を生成
   - `calculation_method = 'max_mid_and_end'`: 月中（15日）と月末のアクティブユーザー数の **大きい方** を採用（不正な削除による回避防止）
   - `seat_detail` に各ユーザーの在籍期間を JSON で記録
3. `invoices` を `status=draft` で作成
4. `invoice_items` を生成:
   - 基本料金: `committed_seats * unit_price_jpy` (1 行)
   - 超過料金: `max(0, active_seats - committed_seats) * overage_unit_price_jpy` (超過があれば別行)
   - 割引: `discount_rate > 0` であれば `item_type='discount'` で負数計上
5. 税額計算: 全明細を税率区分ごとに集計し、ヘッダに格納
6. 請求書番号は **発行時** に採番（`draft` 段階では採番しない）

## 6. インボイス制度対応

### 6.1 記載必須項目

適格請求書（インボイス）として必要な項目を `invoices` に格納:

- 発行者の氏名または名称および登録番号
  → `issuer_name`, `issuer_qualified_invoice_number`
- 取引年月日 → `issue_date`, `period_start`, `period_end`
- 取引内容（軽減税率対象品目である旨） → `invoice_items.description`, `invoice_items.tax_rate`
- 税率ごとの合計額（税抜 or 税込）および適用税率
  → `tax_10_subtotal_jpy`, `tax_10_amount_jpy` 等
- 税率ごとの消費税額等
  → `tax_10_amount_jpy` 等
- 書類交付を受ける事業者の氏名または名称
  → `billing_company_name`

### 6.2 税率区分

`invoice_items.tax_rate` の enum:

- `standard_10`: 10% 標準税率
- `reduced_8`: 8% 軽減税率（通常、SaaS では該当なし）
- `tax_exempt`: 非課税
- `non_taxable`: 不課税

### 6.3 端数処理

- 税額計算は **税率区分ごとに 1 回のみ** 端数処理（インボイス制度の要件）
- 端数処理方法: 切り捨て（全社統一。契約書にも記載）

### 6.4 電子帳簿保存法対応

- 請求書 PDF は Supabase Storage に **7 年間以上** 保管
  （`invoices.pdf_storage_path`）
- 改ざん防止のため、発行後は PDF を書き換えない（修正時は credit_note
  または新規発行）
- 取引日、取引先、金額による検索機能を提供

## 7. RLS（行レベルセキュリティ）

請求データは機密性が高いため、以下の制約:

- **member / manager**: アクセス不可
- **admin**: 自テナントの閲覧のみ可、書き込みは請求先情報（`billing_accounts`）のみ
- **super_admin**: 全テナントの全操作可（運営側）

契約登録・請求書発行・入金消込は **super_admin のみ**が行う運用（誤操作・内部不正防止）。

## 8. 画面構成（実装予定）

### 8.1 契約者側 (admin)

- `/settings/billing` トップ: 請求先情報の表示・編集
- `/settings/billing/invoices` 請求書一覧（発行日 DESC、ステータスフィルタ）
- `/settings/billing/invoices/[id]` 請求書詳細（PDF ダウンロード、支払状況）
- `/settings/billing/usage` 当月のシート使用状況（予測請求額）

### 8.2 運営側 (super_admin)

- `/admin/billing/contracts` 契約一覧・新規作成
- `/admin/billing/invoices` 全テナント請求書一覧（status 横串検索）
- `/admin/billing/invoices/new` 手動請求書作成（単発の請求 / スポット作業分）
- `/admin/billing/payments` 入金消込
- `/admin/billing/aging` 売掛金年齢表（aging report）
- `/admin/billing/reports` 月次売上・MRR・ARR ダッシュボード

## 9. バッチ処理

Vercel Cron にて以下を自動実行（PostgreSQL advisory lock で二重実行防止）:

| Cron | 時刻 (JST) | 処理 |
|---|---|---|
| 請求書ドラフト生成 | 毎月 1 日 05:00 | 前月のシートスナップショット → invoices(draft) 作成 |
| 督促リマインダー | 毎日 09:00 | `due_date < today` かつ `status in (issued, sent)` を overdue へ |
| 与信アラート | 毎日 09:05 | 60 日以上未払いの契約を運営に通知 |

## 10. メール連携

| イベント | 送信先 | 内容 |
|---|---|---|
| 請求書発行 | `billing_accounts.delivery_email` | 請求書 PDF 添付または DL リンク |
| 支払期限 7 日前 | 同上 | リマインダー |
| 支払期限超過 | 同上 + 運営 | 督促 |
| 入金確認 | 同上 | 受領お知らせ |

メール送信は Resend 等の SMTP リレーを利用予定（実装は Phase 7 後半）。

## 11. 経理システム連携（将来）

- freee / マネーフォワードクラウド / SAP 等への会計仕訳連携
- CSV エクスポート（売上・売掛金・仕訳）
- 銀行口座明細の取込（振込消込の自動化）

## 12. テスト方針

- 請求額計算ロジックの単体テスト（税率、端数、超過、割引の組合せ）
- `billing_seat_snapshots` の計算方法ごとの正確性テスト
- インボイス番号フォーマットの検証（`^T[0-9]{13}$`）
- RLS テスト（member がアクセスできないこと）
- E2E: 申込 → 契約登録 → 月次バッチ → 請求書発行 → 入金 → 消込のゴールデンパス

## 13. リスクと対応

| リスク | 対応 |
|---|---|
| 締め後のシート変更による請求額争い | `billing_seat_snapshots.seat_detail` に全履歴を保管、顧客に開示可能 |
| 請求書番号の欠番・重複 | 連番採番を DB シーケンスで管理、発行時のみ採番 |
| インボイス制度非対応取引先からの不利益 | 登録番号欄を空欄で発行可（`billing_accounts.qualified_invoice_number IS NULL` 可） |
| 入金消込ミス | 複数人レビュー体制、銀行 API 連携による自動照合（将来） |
| 発行後の金額訂正 | credit_note または void + 再発行のみ。発行済 invoice 本体は不変 |

## 14. 未解決事項 / 今後の検討

- 年間前払い契約時の収益認識（月割按分）の会計処理
- 海外法人との取引（消費税不課税、外貨建て）
- 口座振替の初期登録フロー（金融機関との連携）
- 与信管理（契約時の与信審査フロー）
- 督促の段階化（0 日 → 7 日 → 14 日 → 30 日 → 法務対応）
