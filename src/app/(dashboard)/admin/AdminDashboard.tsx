"use client";

import React, { useState, useTransition } from "react";
import {
  listAllTenants,
  createTenant,
  updateTenantPlan,
  deactivateTenant,
  deleteTenant,
  listTenantUsers,
  deleteUser,
} from "./actions";
import {
  PLAN_DISPLAY_NAMES,
  type PlanType,
} from "@/lib/plan-limits";

interface Tenant {
  id: string;
  name: string;
  plan: string;
  is_active?: boolean;
  created_at: string;
  user_count: number;
  deactivated_at?: string | null;
}

interface Stats {
  totalTenants: number;
  totalUsers: number;
  planCounts: Record<string, number>;
}

interface AdminDashboardProps {
  initialTenants: Tenant[];
  totalTenants: number;
  stats: Stats | null;
}

const PLAN_OPTIONS: PlanType[] = ["free", "starter", "professional", "enterprise"];

export function AdminDashboard({
  initialTenants,
  totalTenants,
  stats,
}: AdminDashboardProps) {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    tenantName: string;
  } | null>(null);
  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);
  const [tenantUsers, setTenantUsers] = useState<
    { id: string; email: string; name: string; role: string; created_at: string }[]
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Create tenant form state
  const [newTenant, setNewTenant] = useState({
    name: "",
    plan: "free" as PlanType,
    adminEmail: "",
    adminName: "",
  });

  function handleSearch() {
    startTransition(async () => {
      const result = await listAllTenants({ search, page: 1, perPage: 50 });
      if (result.success && result.data) {
        setTenants(result.data as Tenant[]);
      }
    });
  }

  function handleCreateTenant() {
    if (!newTenant.name || !newTenant.adminEmail || !newTenant.adminName) {
      setError("全ての項目を入力してください。");
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await createTenant(newTenant);
      if (result.success && result.data) {
        setShowCreateDialog(false);
        setCreatedCredentials({
          email: newTenant.adminEmail,
          password: result.data.tempPassword,
          tenantName: newTenant.name,
        });
        setNewTenant({ name: "", plan: "free", adminEmail: "", adminName: "" });
        // Refresh list
        const refreshed = await listAllTenants({ page: 1, perPage: 50 });
        if (refreshed.success && refreshed.data) {
          setTenants(refreshed.data as Tenant[]);
        }
      } else {
        setError(result.error || "テナントの作成に失敗しました。");
      }
    });
  }

  function handlePlanChange(tenantId: string, plan: PlanType) {
    startTransition(async () => {
      setError(null);
      const result = await updateTenantPlan(tenantId, plan);
      if (result.success) {
        setTenants((prev) =>
          prev.map((t) => (t.id === tenantId ? { ...t, plan } : t))
        );
        setSuccess("プランを更新しました。");
      } else {
        setError(result.error || "プランの更新に失敗しました。");
      }
    });
  }

  function handleDeleteTenant(tenantId: string, tenantName: string) {
    if (
      !confirm(
        `「${tenantName}」を完全に削除しますか？\n\n所属する全ユーザーとデータが削除されます。この操作は元に戻せません。`
      )
    ) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await deleteTenant(tenantId);
      if (result.success) {
        setTenants((prev) => prev.filter((t) => t.id !== tenantId));
        if (expandedTenantId === tenantId) {
          setExpandedTenantId(null);
          setTenantUsers([]);
        }
        setSuccess("テナントを削除しました。");
      } else {
        setError(result.error || "テナントの削除に失敗しました。");
      }
    });
  }

  function handleToggleUsers(tenantId: string) {
    if (expandedTenantId === tenantId) {
      setExpandedTenantId(null);
      setTenantUsers([]);
      return;
    }

    setLoadingUsers(true);
    setExpandedTenantId(tenantId);
    startTransition(async () => {
      const result = await listTenantUsers(tenantId);
      if (result.success && result.data) {
        setTenantUsers(result.data);
      } else {
        setError(result.error || "ユーザー一覧の取得に失敗しました。");
        setTenantUsers([]);
      }
      setLoadingUsers(false);
    });
  }

  function handleDeleteUser(userId: string, userName: string, tenantId: string) {
    if (!confirm(`「${userName}」を削除しますか？この操作は元に戻せません。`)) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await deleteUser(userId);
      if (result.success) {
        setTenantUsers((prev) => prev.filter((u) => u.id !== userId));
        setTenants((prev) =>
          prev.map((t) =>
            t.id === tenantId ? { ...t, user_count: t.user_count - 1 } : t
          )
        );
        setSuccess("ユーザーを削除しました。");
      } else {
        setError(result.error || "ユーザーの削除に失敗しました。");
      }
    });
  }

  function handleDeactivate(tenantId: string, tenantName: string) {
    if (!confirm(`「${tenantName}」を無効化しますか？この操作は元に戻せません。`)) {
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await deactivateTenant(tenantId);
      if (result.success) {
        setTenants((prev) =>
          prev.map((t) =>
            t.id === tenantId ? { ...t, is_active: false } : t
          )
        );
        setSuccess("テナントを無効化しました。");
      } else {
        setError(result.error || "テナントの無効化に失敗しました。");
      }
    });
  }

  return (
    <div>
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="border border-border rounded-lg p-5">
            <p className="text-sm text-gray mb-1">総テナント数</p>
            <p className="text-3xl font-bold font-mono text-navy">
              {stats.totalTenants}
            </p>
          </div>
          <div className="border border-border rounded-lg p-5">
            <p className="text-sm text-gray mb-1">総ユーザー数</p>
            <p className="text-3xl font-bold font-mono text-navy">
              {stats.totalUsers}
            </p>
          </div>
          <div className="border border-border rounded-lg p-5">
            <p className="text-sm text-gray mb-1">プラン別</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {PLAN_OPTIONS.map((plan) => (
                <span
                  key={plan}
                  className="text-xs px-2 py-1 rounded border border-border text-dark"
                >
                  {PLAN_DISPLAY_NAMES[plan]}:{" "}
                  <span className="font-mono font-bold">
                    {stats.planCounts[plan] || 0}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm">
          {success}
          <button
            onClick={() => setSuccess(null)}
            className="ml-2 underline text-xs"
          >
            閉じる
          </button>
        </div>
      )}

      {/* Search and actions bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="テナント名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleSearch}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-border text-sm text-dark hover:bg-mid-bg transition-colors"
          >
            検索
          </button>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 rounded-lg bg-navy text-white text-sm hover:bg-navy/90 transition-colors"
        >
          テナント作成
        </button>
      </div>

      {/* Create tenant dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-border w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-navy mb-4">
              新規テナント作成
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark mb-1">
                  テナント名
                </label>
                <input
                  type="text"
                  value={newTenant.name}
                  onChange={(e) =>
                    setNewTenant((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  placeholder="株式会社サンプル"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1">
                  プラン
                </label>
                <select
                  value={newTenant.plan}
                  onChange={(e) =>
                    setNewTenant((prev) => ({
                      ...prev,
                      plan: e.target.value as PlanType,
                    }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                >
                  {PLAN_OPTIONS.map((plan) => (
                    <option key={plan} value={plan}>
                      {PLAN_DISPLAY_NAMES[plan]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1">
                  管理者名
                </label>
                <input
                  type="text"
                  value={newTenant.adminName}
                  onChange={(e) =>
                    setNewTenant((prev) => ({
                      ...prev,
                      adminName: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  placeholder="田中 太郎"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark mb-1">
                  管理者メールアドレス
                </label>
                <input
                  type="email"
                  value={newTenant.adminEmail}
                  onChange={(e) =>
                    setNewTenant((prev) => ({
                      ...prev,
                      adminEmail: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
                  placeholder="admin@example.com"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm text-dark hover:bg-mid-bg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateTenant}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-navy text-white text-sm hover:bg-navy/90 transition-colors disabled:opacity-50"
              >
                {isPending ? "作成中..." : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created credentials dialog */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-border w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-navy mb-2">
              テナントを作成しました
            </h3>
            <p className="text-sm text-gray mb-4">
              以下のログイン情報を管理者に共有してください。このダイアログを閉じるとパスワードは再表示できません。
            </p>
            <div className="space-y-3 bg-light-bg rounded-lg p-4 border border-border">
              <div>
                <p className="text-xs text-gray">テナント</p>
                <p className="font-medium text-dark">{createdCredentials.tenantName}</p>
              </div>
              <div>
                <p className="text-xs text-gray">メールアドレス</p>
                <p className="font-mono text-dark">{createdCredentials.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray">初期パスワード</p>
                <p className="font-mono text-dark select-all">{createdCredentials.password}</p>
              </div>
            </div>
            <p className="text-xs text-red-500 mt-3">
              ※ 初回ログイン後、パスワードの変更を推奨します。
            </p>
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `テナント: ${createdCredentials.tenantName}\nメール: ${createdCredentials.email}\nパスワード: ${createdCredentials.password}`
                  );
                  setSuccess("クリップボードにコピーしました。");
                }}
                className="px-4 py-2 rounded-lg border border-border text-sm text-dark hover:bg-mid-bg transition-colors"
              >
                コピー
              </button>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2 rounded-lg bg-navy text-white text-sm hover:bg-navy/90 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tenant table */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-light-bg">
              <th className="text-left p-3 font-medium text-navy">
                テナント名
              </th>
              <th className="text-left p-3 font-medium text-navy">プラン</th>
              <th className="text-right p-3 font-medium text-navy">
                ユーザー数
              </th>
              <th className="text-left p-3 font-medium text-navy">作成日</th>
              <th className="text-center p-3 font-medium text-navy">
                ステータス
              </th>
              <th className="text-right p-3 font-medium text-navy">操作</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray">
                  テナントが見つかりません。
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <React.Fragment key={tenant.id}>
                  <tr className="border-b border-border last:border-b-0 hover:bg-light-bg/50">
                    <td className="p-3 text-dark font-medium">
                      <button
                        onClick={() => handleToggleUsers(tenant.id)}
                        className="text-left hover:text-navy transition-colors flex items-center gap-1"
                      >
                        <span className="text-xs text-gray">
                          {expandedTenantId === tenant.id ? "▼" : "▶"}
                        </span>
                        {tenant.name}
                      </button>
                    </td>
                    <td className="p-3">
                      <select
                        value={tenant.plan || "free"}
                        onChange={(e) =>
                          handlePlanChange(
                            tenant.id,
                            e.target.value as PlanType
                          )
                        }
                        disabled={isPending}
                        className="px-2 py-1 border border-border rounded text-xs focus:outline-none focus:border-accent"
                      >
                        {PLAN_OPTIONS.map((plan) => (
                          <option key={plan} value={plan}>
                            {PLAN_DISPLAY_NAMES[plan]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-right font-mono text-dark">
                      {tenant.user_count}
                    </td>
                    <td className="p-3 text-gray">
                      {new Date(tenant.created_at).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="p-3 text-center">
                      {tenant.is_active === false ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                          無効
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-600 border border-green-200">
                          有効
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {tenant.is_active !== false && (
                          <button
                            onClick={() =>
                              handleDeactivate(tenant.id, tenant.name)
                            }
                            disabled={isPending}
                            className="text-xs text-amber-600 hover:underline disabled:opacity-50"
                          >
                            無効化
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleDeleteTenant(tenant.id, tenant.name)
                          }
                          disabled={isPending}
                          className="text-xs text-red-600 hover:underline disabled:opacity-50"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedTenantId === tenant.id && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <div className="bg-light-bg border-t border-border px-6 py-3">
                          <p className="text-xs font-medium text-navy mb-2">
                            ユーザー一覧 — {tenant.name}
                          </p>
                          {loadingUsers ? (
                            <p className="text-xs text-gray py-2">読み込み中...</p>
                          ) : tenantUsers.length === 0 ? (
                            <p className="text-xs text-gray py-2">ユーザーがいません。</p>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray">
                                  <th className="text-left py-1 pr-3">名前</th>
                                  <th className="text-left py-1 pr-3">メール</th>
                                  <th className="text-left py-1 pr-3">ロール</th>
                                  <th className="text-left py-1 pr-3">作成日</th>
                                  <th className="text-right py-1">操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tenantUsers.map((u) => (
                                  <tr
                                    key={u.id}
                                    className="border-t border-border/50"
                                  >
                                    <td className="py-1.5 pr-3 text-dark">{u.name}</td>
                                    <td className="py-1.5 pr-3 text-gray font-mono">{u.email}</td>
                                    <td className="py-1.5 pr-3">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-xs ${
                                          u.role === "admin"
                                            ? "bg-blue-50 text-blue-600"
                                            : u.role === "manager"
                                              ? "bg-amber-50 text-amber-600"
                                              : u.role === "super_admin"
                                                ? "bg-purple-50 text-purple-600"
                                                : "bg-gray-50 text-gray-600"
                                        }`}
                                      >
                                        {u.role === "super_admin"
                                          ? "SA"
                                          : u.role === "admin"
                                            ? "管理者"
                                            : u.role === "manager"
                                              ? "MGR"
                                              : "メンバー"}
                                      </span>
                                    </td>
                                    <td className="py-1.5 pr-3 text-gray">
                                      {new Date(u.created_at).toLocaleDateString("ja-JP")}
                                    </td>
                                    <td className="py-1.5 text-right">
                                      {u.role !== "super_admin" && (
                                        <button
                                          onClick={() =>
                                            handleDeleteUser(u.id, u.name, tenant.id)
                                          }
                                          disabled={isPending}
                                          className="text-red-600 hover:underline disabled:opacity-50"
                                        >
                                          削除
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray mt-3">
        全 {totalTenants} テナント中 {tenants.length} 件表示
      </p>
    </div>
  );
}
