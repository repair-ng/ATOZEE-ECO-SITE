"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/inv-client";
import type { Lang } from "@/lib/inv-types";

const en = {
  appTitle: "Inventory",
  navItems: "Inventory", navLog: "Stock log", navInvoices: "Invoices", navUsers: "Users", logout: "Log out",
  loginTitle: "Staff sign-in", username: "Username", password: "Password", signIn: "Sign in",
  roleGLOBAL_ADMIN: "Global admin", roleYUCHAI_STAFF: "Yuchai staff", roleATOZEE_STAFF: "Atozee staff",
  search: "Search part no. or name…", allCategories: "All categories", lowOnly: "Low stock only",
  partNo: "Part no.", name: "Name", category: "Category", qty: "Qty", unit: "Unit", price: "Price (NGN)",
  actions: "Actions", addItem: "Add item", edit: "Edit", stockIn: "Stock in", stockOut: "Stock out", del: "Delete",
  noItems: "No items found.", lowBadge: "Low",
  nameEn: "Name (English)", nameZh: "Name (Chinese)", description: "Description", lowStockAt: "Low-stock alert at",
  invoiceable: "Can be invoiced", startQty: "Starting quantity", reason: "Reason",
  reasonHint: "e.g. Received from supplier, damaged, returned", quantity: "Quantity",
  save: "Save", cancel: "Cancel", confirm: "Confirm",
  confirmDelete: "Delete this item? It will disappear from the list and the deletion will be recorded in the stock log.",
  deleteTitle: "Delete item", stockInTitle: "Stock in", stockOutTitle: "Stock out", editTitle: "Edit item",
  addTitle: "Add item", currentStock: "Current stock",
  logTitle: "Stock log", date: "Date", type: "Type", added: "Added", removed: "Removed", allTypes: "All types",
  by: "By", balance: "Balance", from: "From", to: "To", filterUser: "Filter by user",
  searchLog: "Search item or reason…", clearFilters: "Clear filters",
  invoicesTitle: "Invoices", newInvoice: "New invoice", invNumber: "Invoice no.", customer: "Customer",
  contact: "Contact", notes: "Notes", total: "Total", addLine: "Add line", removeLine: "Remove",
  deductStock: "Also deduct from stock", unitPrice: "Unit price", lineTotal: "Line total", print: "Print",
  createInvoice: "Create invoice", pickItem: "Select item…", back: "Back", issuedBy: "Issued by",
  noInvoices: "No invoices yet.", invoiceOnlyNote: "Only items marked “Can be invoiced” appear here.",
  usersTitle: "Users", addUser: "Add user", displayName: "Display name", roleLabel: "Role", active: "Active",
  disabled: "Disabled", newPassword: "New password (leave blank to keep)", status: "Status",
  createdAt: "Created", passwordHint: "At least 10 characters",
  loading: "Loading…", prev: "Previous", next: "Next", language: "Language",
  err_INSUFFICIENT_STOCK: "Not enough stock for that.", err_DUPLICATE_PART: "That part number already exists.",
  err_INVALID_LOGIN: "Wrong username or password.", err_RATE_LIMITED: "Too many attempts. Try again in a few minutes.",
  err_FORBIDDEN: "You don't have permission to do that.", err_UNAUTHORIZED: "Please sign in again.",
  err_VALIDATION: "Please check the form and try again.", err_DUPLICATE_USER: "That username is already taken.",
  err_SELF_PROTECT: "You can't disable or demote your own account.", err_NOT_FOUND: "That record no longer exists.",
  err_NOT_INVOICEABLE: "That item can't be invoiced.", err_generic: "Something went wrong. Please try again.",
};

export type Key = keyof typeof en;

const zh: Record<Key, string> = {
  appTitle: "库存管理",
  navItems: "库存", navLog: "出入库记录", navInvoices: "发票", navUsers: "用户管理", logout: "退出登录",
  loginTitle: "员工登录", username: "用户名", password: "密码", signIn: "登录",
  roleGLOBAL_ADMIN: "全局管理员", roleYUCHAI_STAFF: "玉柴员工", roleATOZEE_STAFF: "Atozee 员工",
  search: "搜索零件号或名称…", allCategories: "全部分类", lowOnly: "仅显示低库存",
  partNo: "零件号", name: "名称", category: "分类", qty: "数量", unit: "单位", price: "价格（奈拉）",
  actions: "操作", addItem: "新增物品", edit: "编辑", stockIn: "入库", stockOut: "出库", del: "删除",
  noItems: "未找到物品。", lowBadge: "低库存",
  nameEn: "名称（英文）", nameZh: "名称（中文）", description: "描述", lowStockAt: "低库存预警值",
  invoiceable: "允许开具发票", startQty: "初始数量", reason: "原因",
  reasonHint: "例如：供应商到货、损坏报废、客户退货", quantity: "数量",
  save: "保存", cancel: "取消", confirm: "确认",
  confirmDelete: "确定要删除该物品吗？它将从列表中移除，删除操作会记录在出入库记录中。",
  deleteTitle: "删除物品", stockInTitle: "入库", stockOutTitle: "出库", editTitle: "编辑物品",
  addTitle: "新增物品", currentStock: "当前库存",
  logTitle: "出入库记录", date: "日期", type: "类型", added: "入库", removed: "出库", allTypes: "全部类型",
  by: "操作人", balance: "结余", from: "开始日期", to: "结束日期", filterUser: "按操作人筛选",
  searchLog: "搜索物品或原因…", clearFilters: "清除筛选",
  invoicesTitle: "发票", newInvoice: "新建发票", invNumber: "发票号", customer: "客户",
  contact: "联系方式", notes: "备注", total: "合计", addLine: "添加一行", removeLine: "移除",
  deductStock: "同时扣减库存", unitPrice: "单价", lineTotal: "小计", print: "打印",
  createInvoice: "生成发票", pickItem: "选择物品…", back: "返回", issuedBy: "开具人",
  noInvoices: "暂无发票。", invoiceOnlyNote: "只有标记为“允许开具发票”的物品才会显示在此处。",
  usersTitle: "用户管理", addUser: "添加用户", displayName: "姓名", roleLabel: "角色", active: "启用",
  disabled: "已停用", newPassword: "新密码（留空则不修改）", status: "状态",
  createdAt: "创建时间", passwordHint: "至少 10 个字符",
  loading: "加载中…", prev: "上一页", next: "下一页", language: "语言",
  err_INSUFFICIENT_STOCK: "库存不足。", err_DUPLICATE_PART: "该零件号已存在。",
  err_INVALID_LOGIN: "用户名或密码错误。", err_RATE_LIMITED: "尝试次数过多，请几分钟后再试。",
  err_FORBIDDEN: "您没有权限执行此操作。", err_UNAUTHORIZED: "请重新登录。",
  err_VALIDATION: "请检查填写内容后重试。", err_DUPLICATE_USER: "该用户名已被使用。",
  err_SELF_PROTECT: "不能停用或降级自己的账号。", err_NOT_FOUND: "该记录已不存在。",
  err_NOT_INVOICEABLE: "该物品不可开具发票。", err_generic: "出错了，请重试。",
};

const dict: Record<Lang, Record<Key, string>> = { en, zh };

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
  err: (e: unknown) => string;
  itemName: (i: { nameEn: string; nameZh: string | null }) => string;
  fmtDate: (iso: string) => string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({
  initial, persist, children,
}: { initial: Lang; persist: boolean; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    document.cookie = `inv_lang=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l === "zh" ? "zh-CN" : "en";
    if (persist) api("/api/inventory/me", { method: "PATCH", body: { language: l } }).catch(() => {});
  }, [persist]);

  const value = useMemo<LangCtx>(() => ({
    lang,
    setLang,
    t: (k) => dict[lang][k],
    err: (e) => {
      if (e instanceof ApiError && e.code) {
        const key = `err_${e.code}` as Key;
        if (key in en) return dict[lang][key];
      }
      return dict[lang].err_generic;
    },
    itemName: (i) => (lang === "zh" && i.nameZh ? i.nameZh : i.nameEn),
    fmtDate: (iso) =>
      new Date(iso).toLocaleString(lang === "zh" ? "zh-CN" : "en-GB", {
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
      }),
  }), [lang, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLang must be used inside <LangProvider>");
  return c;
}

/** Always-visible two-button switch so Chinese-speaking staff can find it instantly. */
export function LanguageToggle() {
  const { lang, setLang } = useLang();
  const base = "px-3 py-1 text-sm font-medium transition";
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-300" role="group" aria-label="Language / 语言">
      <button type="button" onClick={() => setLang("zh")} aria-pressed={lang === "zh"}
        className={`${base} ${lang === "zh" ? "bg-brand-blue text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
        中文
      </button>
      <button type="button" onClick={() => setLang("en")} aria-pressed={lang === "en"}
        className={`${base} border-l border-slate-300 ${lang === "en" ? "bg-brand-blue text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
        EN
      </button>
    </div>
  );
}
