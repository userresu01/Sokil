import React, { useEffect, useMemo, useRef, useState } from "react";
import { zones as PATH_ZONES } from "./zones.paths";
import engMap from "./assets/eng.png";
import { features as ENG_FEATURES } from "./engineering.paths"; 

import {
  HardHat,
  MapPin,
  Layers,
  Shield,
  LogIn,
  LogOut,
  Search,
  Info,
  Move,
  ZoomIn,
  ZoomOut,
  X,
  Undo2,
  AlertTriangle,
  Plus,
  Trash2,
  Copy,
  Settings,
  Table2,
  SlidersHorizontal,
  FileJson,
  Eye,
  EyeOff,
  Filter,
  CheckCircle2,
  Clock,
  Ban,
  Upload,
  Hammer,
} from "lucide-react";

import baseMap from "./assets/base.png";
import projectMap from "./assets/project.png";

/* =========================
   Storage keys
========================= */
const LS_ZONES = "bap_zones_v4_fixed";
const LS_ADMIN = "bap_admin_session_v4_fixed";
const LS_SETTINGS = "bap_project_settings_v4_fixed";
const LS_ENG = "bap_eng_v1";


/* =========================
   Helpers
========================= */
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function safeJsonParse(str, fallback) {
  try {
    const v = JSON.parse(str);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function statusMeta(status) {
  const s = (status || "").toLowerCase();
  if (["active", "активна", "в роботі", "construction", "у роботі"].includes(s)) {
    return {
      label: status,
      icon: CheckCircle2,
      cls: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    };
  }
  if (["planned", "план", "планується"].includes(s)) {
    return {
      label: status,
      icon: Clock,
      cls: "bg-amber-50 text-amber-900 ring-amber-200",
    };
  }
  if (["blocked", "стоп", "пауза", "hold", "зупинено"].includes(s)) {
    return {
      label: status,
      icon: Ban,
      cls: "bg-rose-50 text-rose-900 ring-rose-200",
    };
  }
  return {
    label: status || "—",
    icon: Info,
    cls: "bg-slate-50 text-slate-800 ring-slate-200",
  };
}

/* =========================
   Default strings/settings
========================= */
const DEFAULT_STRINGS = {
  overviewTitle: "Огляд",
  overviewDesc:
    "Інструмент для аналізу ділянок",
  navigation: "Навігація",
  navDesc: "Перетягування — панорамування; Колесо — масштабування",
  selectedZone: "Вибрана ділянка",
  selectZonePrompt: "Вибери ділянку на мапі або в списку.",
  zones: "Зони",
  inProject: "ЖК",
  active: "Активні",
  searchPlaceholder: "Пошук зон…",
  filterOnlyProject: "Фільтр: тільки ЖК",
  interactiveMapTitle: "Мапа",
  interactiveMapDesc: "Зони",
  showContours: "Контури",
  onlyProjectContours: "Лише ЖК",
  detailsButton: "Деталі",
  addZone: "Додати текст",
  tableEditor: "Таблиця",
  paramTitle: "Параметри ділянки",
  paramEmpty: "Немає параметрів.",
  projectInfoTitle: "Інформація по об’єкту",
  noProject: "Для цієї ділянки проєктних об’єктів немає.",
  adminLoginTitle: "Вхід адміністратора",
  adminLoginDesc: "Локальний режим редагування. Пароль можна змінити у налаштуваннях.",
  adminPasswordLabel: "Пароль",
  cancel: "Скасувати",
  login: "Увійти",
  export: "Експорт",
  import: "Імпорт",
  logout: "Вийти",
  navigationHintPan: "Перетягування — панорамування",
  navigationHintZoom: "Колесо — масштабування",
};

const DEFAULT_SETTINGS = {
  projectName: 'Забудова "Сокіл"',
  projectSubtitle: "Інтерактивна мапа території",
  adminPassword: "admin999",
  strings: DEFAULT_STRINGS,
};

/* =========================
   Zones preset
   rect is in PERCENT (0..100)
========================= */
const AUTO_ZONES = Array.isArray(PATH_ZONES)
  ? PATH_ZONES.map((z, i) => ({
      id: z.id,
      name: z.name ?? `Zone ${String(i + 1).padStart(2, "0")}`,
      status: "план",
      area: "",
      type: "",
      hasProject: true,
      shape: "path",
      d: z.d,
      params: {},
      project: { title: "", description: "", metrics: {} },
    }))
  : [];


const AUTO_ENG = Array.isArray(ENG_FEATURES)
  ? ENG_FEATURES.map((f, i) => ({
      id: f.id,
      name: f.name ?? (f.kind === "line" ? `Line ${f.id}` : `Zone ${f.id}`),
      status: "",
      area: "",
      type: "",
      hasProject: true,
      shape: f.kind === "polygon" ? "path" : "line",
      d: f.d,
      dash: f.dash ?? null,
      params: {},
      project: { title: "", description: "", metrics: {} },
    }))
  : [];




/* =========================
   Small UI components
========================= */
function Card({ children, className = "" }) {
  return (
    <div className={"rounded-2xl bg-white border border-slate-200 shadow-sm " + className}>
      {children}
    </div>
  );
}

function SoftButton({ children, onClick, className = "", disabled, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={
        "px-3 py-2 rounded-xl border text-sm transition flex items-center gap-2 active:scale-[0.99] " +
        (disabled
          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 hover:shadow-sm") +
        " " +
        className
      }
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, className = "", disabled, title }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={
        "px-3 py-2 rounded-xl text-sm transition flex items-center gap-2 border active:scale-[0.99] " +
        (disabled
          ? "bg-amber-100/40 text-amber-300 border-amber-200 cursor-not-allowed"
          : "bg-amber-500 text-white border-amber-500 hover:bg-amber-600 hover:shadow-sm") +
        " " +
        className
      }
    >
      {children}
    </button>
  );
}

function Tag({ icon: IconCmp, text, className = "" }) {
  return (
    <div className={"inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs " + className}>
      {IconCmp ? <IconCmp className="w-4 h-4" /> : null}
      <span>{text}</span>
    </div>
  );
}

function Modal({ title, children, onClose, small = false }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={
          "relative w-full rounded-2xl border border-slate-200 bg-white shadow-lg p-5 " +
          (small ? "max-w-md" : "max-w-4xl")
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-lg font-semibold">{title}</div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}


function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <div className="text-xs text-slate-600 mb-1">{label}</div>
      {children}
    </div>
  );
}

function RectTiny({ value, onChange }) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(clamp(parseFloat(e.target.value || "0"), 0, 100))}
      className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200 text-xs"
      title="0..100 (%)"
    />
  );
}

/* =========================
   Admin components
========================= */
function AdminDetails({
  selected,
  mapMode,
  createZone,
  duplicateZone,
  deleteZone,
  updateZone,
  updateZoneParam,
  deleteZoneParam,
  ensureProject,
  removeProject,
  updateProjectMetric,
  deleteProjectMetric,
}) {
  const [newParamK, setNewParamK] = useState("");
  const [newParamV, setNewParamV] = useState("");
  const [newMetricK, setNewMetricK] = useState("");
  const [newMetricV, setNewMetricV] = useState("");

  if (!selected) {
    return (
      <div className="text-sm text-slate-600">
        Виберіть зону, щоб редагувати її дані.
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => createZone()}
            className="px-3 py-2 rounded-xl bg-amber-500 text-white border border-amber-500 hover:bg-amber-600 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Додати текст
          </button>
        </div>
      </div>
    );
  }

  const m = statusMeta(selected.status);
  const IconCmp = m.icon;

 
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 md:col-span-5">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Зона: {selected.id}</div>
          <div className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ring-1 ${m.cls}`}>
            <IconCmp className="w-4 h-4" /> {m.label}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-12 gap-2">
          <Field label="Назва" className="col-span-12">
            <input
              value={selected.name || ""}
              onChange={(e) => updateZone(selected.id, { name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>

          <Field label="Статус" className="col-span-6">
            <input
              value={selected.status || ""}
              onChange={(e) => updateZone(selected.id, { status: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>

          <Field label="Площа" className="col-span-6">
            <input
              value={selected.area || ""}
              onChange={(e) => updateZone(selected.id, { area: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>

          <Field label="Тип" className="col-span-12">
            <input
              value={selected.type || ""}
              onChange={(e) => updateZone(selected.id, { type: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
            />
          </Field>

          <div className="col-span-12 flex flex-wrap gap-2">
            <button
              onClick={() => updateZone(selected.id, { hasProject: !selected.hasProject })}
              className={
                "px-3 py-2 rounded-xl border text-sm transition flex items-center gap-2 " +
                (selected.hasProject
                  ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600"
                  : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50")
              }
              title="Чи є зона ЖК?"
            >
              <Layers className="w-4 h-4" />
              Чи це ЖК?: {selected.hasProject ? "ТАК" : "НІ"}
            </button>

            <button
              onClick={() => duplicateZone(selected.id)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition text-sm flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Клонувати
            </button>

            <button
              onClick={() => deleteZone(selected.id)}
              className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition text-sm text-rose-700 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Видалити
            </button>
          </div>
        </div>
      </div>

      <div className="col-span-12 md:col-span-7">
        {/* Params */}
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm">Параметри (гнучкі поля)</div>
          </div>

          <div className="mt-2 space-y-2">
            {Object.entries(selected.params || {}).map(([k, v]) => (
              <div key={k} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5 text-xs text-slate-600 border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 break-all">
                  {k}
                </div>
                <input
                  value={String(v)}
                  onChange={(e) => updateZoneParam(selected.id, k, e.target.value)}
                  className="col-span-6 px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200 break-all"
                />
                <button
                  onClick={() => deleteZoneParam(selected.id, k)}
                  className="col-span-1 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition text-rose-700"
                  title="Видалити"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-12 gap-2">
            <input
              value={newParamK}
              onChange={(e) => setNewParamK(e.target.value)}
              placeholder="Ключ"
              className="col-span-5 px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
            />
            <input
              value={newParamV}
              onChange={(e) => setNewParamV(e.target.value)}
              placeholder="Значення"
              className="col-span-6 px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
            />
            <button
              onClick={() => {
                const k = newParamK.trim();
                if (!k) return;
                updateZoneParam(selected.id, k, newParamV);
                setNewParamK("");
                setNewParamV("");
              }}
              className="col-span-1 px-3 py-2 rounded-xl bg-amber-500 text-white border border-amber-500 hover:bg-amber-600 transition"
              title="Додати параметр"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Project section */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm">Проєктні дані</div>
            <div className="flex gap-2">
              {!selected.project ? (
                <button
                  onClick={() => ensureProject(selected.id)}
                  className="px-3 py-2 rounded-xl bg-amber-500 text-white border border-amber-500 hover:bg-amber-600 transition text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Створити проєкт
                </button>
              ) : (
                <button
                  onClick={() => removeProject(selected.id)}
                  className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition text-sm text-rose-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Видалити проєкт
                </button>
              )}
            </div>
          </div>

          {!selected.project ? (
            <div className="mt-2 text-sm text-slate-600">
              Немає проєктних даних. Якщо ділянка входить до ЖК — натисни <b>Створити&nbsp;проєкт</b>.
            </div>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-12 gap-2">
                <Field label="Назва проєкту" className="col-span-12 md:col-span-6">
                  <input
                    value={selected.project.title || ""}
                    onChange={(e) =>
                      updateZone(selected.id, {
                        project: { ...selected.project, title: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </Field>

                <Field label="Опис проєкту" className="col-span-12 md:col-span-6">
                  <input
                    value={selected.project.description || ""}
                    onChange={(e) =>
                      updateZone(selected.id, {
                        project: { ...selected.project, description: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </Field>
              </div>

              <div className="mt-3 text-sm font-semibold">Показники</div>

              <div className="mt-2 space-y-2">
                {Object.entries(selected.project.metrics || {}).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5 text-xs text-slate-600 border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 break-all">
                      {k}
                    </div>
                    <input
                      value={String(v)}
                      onChange={(e) => updateProjectMetric(selected.id, k, e.target.value)}
                      className="col-span-6 px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200 break-all"
                    />
                    <button
                      onClick={() => deleteProjectMetric(selected.id, k)}
                      className="col-span-1 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition text-rose-700"
                      title="Видалити"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-12 gap-2">
                <input
                  value={newMetricK}
                  onChange={(e) => setNewMetricK(e.target.value)}
                  placeholder="Ключ"
                  className="col-span-5 px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
                />
                <input
                  value={newMetricV}
                  onChange={(e) => setNewMetricV(e.target.value)}
                  placeholder="Значення"
                  className="col-span-6 px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
                />
                <button
                  onClick={() => {
                    const k = newMetricK.trim();
                    if (!k) return;
                    updateProjectMetric(selected.id, k, newMetricV);
                    setNewMetricK("");
                    setNewMetricV("");
                  }}
                  className="col-span-1 px-3 py-2 rounded-xl bg-amber-500 text-white border border-amber-500 hover:bg-amber-600 transition"
                  title="Додати показник"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminTable({ zones, setSelectedId, updateZone, deleteZone, duplicateZone }) {
  return (
    <div className="overflow-auto">
      <div className="text-sm text-slate-600 mb-2">
        Табличне редагування: змінюй поля, rect (% координати) та hasProject.
      </div>

      <div className="min-w-[1000px] rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
          <div className="col-span-1 px-3 py-2">ID</div>
          <div className="col-span-3 px-3 py-2">Назва</div>
          <div className="col-span-2 px-3 py-2">Статус</div>
          <div className="col-span-2 px-3 py-2">Тип</div>
          <div className="col-span-1 px-3 py-2">ЖК</div>
          <div className="col-span-3 px-3 py-2">rect (x y w h) %</div>
          <div className="col-span-1 px-3 py-2 text-right">Дії</div>
        </div>

        {zones.map((z) => (
          <div key={z.id} className="grid grid-cols-12 border-b border-slate-100 text-sm">
            <button
              className="col-span-1 px-3 py-2 text-left font-semibold text-slate-900 hover:underline"
              onClick={() => setSelectedId(z.id)}
              title="Вибрати ділянку"
            >
              {z.id}
            </button>

            <div className="col-span-3 px-3 py-2">
              <input
                value={z.name || ""}
                onChange={(e) => updateZone(z.id, { name: e.target.value })}
                className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <div className="col-span-2 px-3 py-2">
              <input
                value={z.status || ""}
                onChange={(e) => updateZone(z.id, { status: e.target.value })}
                className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <div className="col-span-2 px-3 py-2">
              <input
                value={z.type || ""}
                onChange={(e) => updateZone(z.id, { type: e.target.value })}
                className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <div className="col-span-1 px-3 py-2 flex items-center">
              <input
                type="checkbox"
                checked={!!z.hasProject}
                onChange={(e) => updateZone(z.id, { hasProject: e.target.checked })}
                className="w-4 h-4 accent-amber-500"
              />
            </div>

            <div className="col-span-3 px-3 py-2">
              {z.shape === "rect" && z.rect ? (
                <div className="grid grid-cols-4 gap-1">
                  <RectTiny value={z.rect.x ?? 0} onChange={(v) => updateZone(z.id, { rect: { ...z.rect, x: v }, shape: "rect" })} />
                  <RectTiny value={z.rect.y ?? 0} onChange={(v) => updateZone(z.id, { rect: { ...z.rect, y: v }, shape: "rect" })} />
                  <RectTiny value={z.rect.w ?? 0} onChange={(v) => updateZone(z.id, { rect: { ...z.rect, w: v }, shape: "rect" })} />
                  <RectTiny value={z.rect.h ?? 0} onChange={(v) => updateZone(z.id, { rect: { ...z.rect, h: v }, shape: "rect" })} />
                </div>
              ) : (
                <div className="text-xs text-slate-400">—</div>
              )}
            </div>

            <div className="col-span-1 px-3 py-2 flex justify-end gap-2">
              <button
                onClick={() => duplicateZone(z.id)}
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
                title="Клонувати"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                onClick={() => deleteZone(z.id)}
                className="p-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 transition text-rose-700"
                title="Видалити"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminSettings({ settings, setSettings, resetData }) {
  const [localStrings, setLocalStrings] = useState(() => ({ ...settings.strings }));

  useEffect(() => {
    setLocalStrings({ ...settings.strings });
  }, [settings.strings]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 md:col-span-7">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="font-semibold">Налаштування проєкту</div>
          <div className="text-xs text-slate-600 mt-1">Зберігається локально.</div>

          <div className="mt-4 grid grid-cols-12 gap-2">
            <Field label="Назва проєкту" className="col-span-12">
              <input
                value={settings.projectName}
                onChange={(e) => setSettings((s) => ({ ...s, projectName: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>

            <Field label="Підзаголовок" className="col-span-12">
              <input
                value={settings.projectSubtitle}
                onChange={(e) => setSettings((s) => ({ ...s, projectSubtitle: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>

            <Field label="Пароль адміністратора" className="col-span-12 md:col-span-6">
              <input
                value={settings.adminPassword}
                onChange={(e) => setSettings((s) => ({ ...s, adminPassword: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="col-span-12 md:col-span-5">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="font-semibold text-rose-800">Ризикована зона</div>
          <div className="text-xs text-rose-700 mt-1">
            Скидання демонстраційних даних зон. Після цього всі поточні зміни буде втрачено.
          </div>

          <button
            onClick={resetData}
            className="mt-4 px-3 py-2 rounded-xl border border-rose-200 bg-white hover:bg-rose-100 transition text-rose-800 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Скинути зони
          </button>
        </div>
      </div>

      <div className="col-span-12">
        <div className="rounded-xl border border-slate-200 bg-white p-4 mt-4">
          <div className="font-semibold">Тексти інтерфейсу</div>
          <div className="text-xs text-slate-600 mt-1">
            Редагуй підписи та назви. Порожні поля повернуть значення за замовчуванням.
          </div>

          <div className="mt-3 grid grid-cols-12 gap-2">
            {Object.keys(DEFAULT_STRINGS).map((key) => (
              <React.Fragment key={key}>
                <div className="col-span-3 text-xs text-slate-600 flex items-center">{key}</div>
                <input
                  className="col-span-9 px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
                  value={localStrings[key] ?? ""}
                  onChange={(e) => setLocalStrings((ls) => ({ ...ls, [key]: e.target.value }))}
                  onBlur={() => {
                    setSettings((s) => ({
                      ...s,
                      strings: {
                        ...s.strings,
                        [key]: localStrings[key] || DEFAULT_STRINGS[key],
                      },
                    }));
                  }}
                  placeholder={DEFAULT_STRINGS[key]}
                />
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   App
========================= */
export default function App() {
 
  const [settings, setSettings] = useState(() => {
    const saved = safeJsonParse(localStorage.getItem(LS_SETTINGS), null);
    return saved
      ? { ...DEFAULT_SETTINGS, ...saved, strings: { ...DEFAULT_STRINGS, ...(saved.strings || {}) } }
      : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Oswald:wght@400;600&family=Montserrat:wght@400;500;600&display=swap";
    document.head.appendChild(link);
    return () => link.remove();
  }, []);

  const [imagesLoaded, setImagesLoaded] = useState(false);
 useEffect(() => {
  let loaded = 0;
  const b = new Image();
  const p = new Image();
  const e = new Image();

  const handleLoad = () => {
    loaded++;
    if (loaded === 3) setImagesLoaded(true);
  };

  b.src = baseMap;
  p.src = projectMap;
  e.src = engMap;

  b.onload = handleLoad;
  p.onload = handleLoad;
  e.onload = handleLoad;
}, []);


  const [isMapHovered, setIsMapHovered] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPanel, setAdminPanel] = useState("details");
  

  const [zones, setZones] = useState(() => {
    const saved = safeJsonParse(localStorage.getItem(LS_ZONES), null);
    return Array.isArray(saved) ? saved : AUTO_ZONES;
  });

  useEffect(() => {
    localStorage.setItem(LS_ZONES, JSON.stringify(zones));
  }, [zones]);

  useEffect(() => {
    const saved = safeJsonParse(localStorage.getItem(LS_ADMIN), null);
    if (saved?.isAdmin) setIsAdmin(true);
  }, []);

  const [engItems, setEngItems] = useState(() => {
  const saved = safeJsonParse(localStorage.getItem(LS_ENG), null);
  return Array.isArray(saved) ? saved : AUTO_ENG;
});

useEffect(() => {
  localStorage.setItem(LS_ENG, JSON.stringify(engItems));
}, [engItems]);


  const [selectedId, setSelectedId] = useState(null);



  const [query, setQuery] = useState("");
  const [filterProjectOnly, setFilterProjectOnly] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  const [mapMode, setMapMode] = useState("base");

  const showProject = mapMode === "project" || (mapMode === "base" && isMapHovered);
  const showBase = mapMode === "base" && !isMapHovered;
  const showEng = mapMode === "eng";
  
  const VIEW = mapMode === "eng"
  ? { w: 1151, h: 766 }
  : { w: 1280, h: 844 };

  const [contoursVisible, setContoursVisible] = useState(true);
  const [onlyProjectContours, setOnlyProjectContours] = useState(true);

  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const dragRef = useRef({
    dragging: false,
    pid: null,
    sx: 0,
    sy: 0,
    px: 0,
    py: 0,
    moved: false,
  });

  const [hover, setHover] = useState({ id: null, x: 0, y: 0 });

  const fileInputRef = useRef(null);

  const filteredZones = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = zones;

    if (!isAdmin) list = list.filter((z) => !!z.hasProject);
    if (filterProjectOnly) list = list.filter((z) => !!z.hasProject);

    if (!q) return list;
    return list.filter((z) => {
      const hay = `${z.id} ${z.name} ${z.status} ${z.type} ${z.area}`.toLowerCase();
      return hay.includes(q);
    });
  }, [zones, query, filterProjectOnly, isAdmin]);

  const activeItems = mapMode === "eng" ? engItems : zones;
  const selected = useMemo(
  () => activeItems.find((z) => z.id === selectedId) || null,
  [activeItems, selectedId]
);

const filteredItems = useMemo(() => {
  const q = query.trim().toLowerCase();
  let list = activeItems;

  // В eng режиме НЕ фильтруем по hasProject, там всё должно быть кликабельно
  if (mapMode !== "eng") {
    if (!isAdmin) list = list.filter((z) => !!z.hasProject);
    if (filterProjectOnly) list = list.filter((z) => !!z.hasProject);
  }

  if (!q) return list;
  return list.filter((z) => {
    const hay = `${z.id} ${z.name} ${z.status} ${z.type} ${z.area}`.toLowerCase();
    return hay.includes(q);
  });
}, [activeItems, query, filterProjectOnly, isAdmin, mapMode]);


  const stats = useMemo(() => {
    const total = zones.length;
    const withProject = zones.filter((z) => z.hasProject).length;
    const active = zones.filter((z) =>
      ["active", "активна", "в роботі", "construction", "у роботі"].includes((z.status || "").toLowerCase()),
    ).length;
    return { total, withProject, active };
  }, [zones]);

  function canClickZone(z) {
    if (!z) return false;
    if (mapMode == "eng") return true;
    return isAdmin ? true : !!z.hasProject;
  }

  function zoomIn() {
    setScale((s) => clamp(s * 1.12, 0.6, 3.5));
  }
  function zoomOut() {
    setScale((s) => clamp(s * 0.89, 0.6, 3.5));
  }
  function resetView() {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }

  function zoomToZone(zone) {
    if (!zone || !zone.rect) return;
    const el = containerRef.current;
    if (!el) return;

    const newScale = 2.5;
    const cx = parseFloat(zone.rect.x) + parseFloat(zone.rect.w) / 2; // percent
    const cy = parseFloat(zone.rect.y) + parseFloat(zone.rect.h) / 2; // percent

    const { width, height } = el.getBoundingClientRect();
    const newPanX = ((50 - cx) / 100) * width * newScale;
    const newPanY = ((50 - cy) / 100) * height * newScale;

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  }

  function onWheel(e) {
    e.preventDefault();
    e.stopPropagation();
    const delta = -e.deltaY;
    const zoom = delta > 0 ? 1.08 : 0.92;
    setScale((s) => clamp(s * zoom, 0.6, 3.5));
  }

  function onPointerDown(e) {
  if (e.button !== 0) return;

  const zoneEl = e.target?.closest?.("[data-zoneid]");
  if (zoneEl) {
    dragRef.current.moved = false;
    return;
  }

  // ✅ ALT+CLICK по пустоте => создаём зону из пустыря (только админ)
  if (isAdmin && e.altKey) {
    const ok = createZoneFromVoidAt(e.clientX, e.clientY);
    if (ok) return; // не начинаем пан
  }

  const el = containerRef.current;
  if (!el) return;

  dragRef.current.dragging = true;
  dragRef.current.pid = e.pointerId;
  dragRef.current.sx = e.clientX;
  dragRef.current.sy = e.clientY;
  dragRef.current.px = pan.x;
  dragRef.current.py = pan.y;
  dragRef.current.moved = false;

  try {
    el.setPointerCapture(e.pointerId);
  } catch {}
}


  function onPointerMove(e) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setHover((h) => ({ ...h, x: e.clientX - rect.left, y: e.clientY - rect.top }));

    if (!dragRef.current.dragging) return;
    if (dragRef.current.pid !== e.pointerId) return;

    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
    setPan({ x: dragRef.current.px + dx, y: dragRef.current.py + dy });
  }

  function onPointerUp(e) {
    if (dragRef.current.pid !== e.pointerId) return;
    dragRef.current.dragging = false;
    dragRef.current.pid = null;
  }

  function onPointerLeaveContainer() {
    dragRef.current.dragging = false;
    dragRef.current.pid = null;
    setHover({ id: null, x: 0, y: 0 });
    setIsMapHovered(false);
  }

  function loginAdmin() {
    if (adminPassword === settings.adminPassword) {
      setIsAdmin(true);
      localStorage.setItem(LS_ADMIN, JSON.stringify({ isAdmin: true, at: Date.now() }));
      setAdminLoginOpen(false);
      setAdminPassword("");
    } else {
      alert("Невірний пароль адміністратора.");
    }
  }

  function logoutAdmin() {
    setIsAdmin(false);
    localStorage.removeItem(LS_ADMIN);
    setAdminPanel("details");
  }

  function updateZone(id, patch) {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }

  function createZoneTextOnly() {
    let n = 1;
    let id = `ZNEW${n}`;
    const setIds = new Set(zones.map((z) => z.id));
    while (setIds.has(id)) {
      n += 1;
      id = `ZNEW${n}`;
    }

    const z = {
      id,
      name: `Нова ділянка ${id}`,
      status: "planned",
      area: "",
      type: "",
      hasProject: true,
      shape: "path",
      d: "",
      params: {},
      project: { title: "", description: "", metrics: {} },
    };

    setZones((prev) => [z, ...prev]);
    setSelectedId(id);
    setModalOpen(true);
    return id;
  }

  function duplicateZone(id) {
    const orig = zones.find((z) => z.id === id);
    if (!orig) return;

    let n = 1;
    let newId = `${orig.id}_copy${n}`;
    const setIds = new Set(zones.map((z) => z.id));
    while (setIds.has(newId)) {
      n += 1;
      newId = `${orig.id}_copy${n}`;
    }

    const copy = { ...orig, id: newId, name: `${orig.name} (copy)` };
    setZones((prev) => [copy, ...prev]);
    setSelectedId(newId);
  }

  function deleteZone(id) {
    if (!confirm(`Видалити зону ${id}?`)) return;
    setZones((prev) => prev.filter((z) => z.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setModalOpen(false);
    }
  }

  function updateZoneParam(id, key, value) {
    setZones((prev) =>
      prev.map((z) => (z.id === id ? { ...z, params: { ...(z.params || {}), [key]: value } } : z)),
    );
  }

  function deleteZoneParam(id, key) {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== id) return z;
        const p = { ...(z.params || {}) };
        delete p[key];
        return { ...z, params: p };
      }),
    );
  }

  function ensureProject(id) {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== id) return z;
        if (z.project) return z;
        return { ...z, project: { title: "", description: "", metrics: {} } };
      }),
    );
  }

  function removeProject(id) {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, project: null } : z)));
  }

  function updateProjectMetric(id, key, value) {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== id) return z;
        const proj = z.project || { title: "", description: "", metrics: {} };
        return { ...z, project: { ...proj, metrics: { ...(proj.metrics || {}), [key]: value } } };
      }),
    );
  }

  function deleteProjectMetric(id, key) {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== id) return z;
        if (!z.project) return z;
        const m = { ...(z.project.metrics || {}) };
        delete m[key];
        return { ...z, project: { ...z.project, metrics: m } };
      }),
    );
  }

  function exportAll() {
    downloadJson("build-area.export.json", { settings, zones });
  }

  function openImport() {
    fileInputRef.current?.click();
  }

  async function onImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (Array.isArray(json)) {
        setZones(json);
        alert("Імпорт зон успішний.");
        return;
      }

      if (json && Array.isArray(json.zones)) {
        if (json.settings) {
          setSettings((s) => ({
            ...s,
            ...json.settings,
            strings: { ...DEFAULT_STRINGS, ...(json.settings.strings || {}) },
          }));
        }
        setZones(json.zones);
        alert("Імпорт (settings+zones) успішний.");
        return;
      }

      throw new Error("Невірний формат JSON");
    } catch (err) {
      alert("Помилка імпорту: " + (err?.message || "невідомо"));
    }
  }

  function resetData() {
    if (!confirm("Скинути всі дані зон до PRESET? Поточні зміни буде втрачено.")) return;
    setZones(AUTO_ZONES);
    setSelectedId(null);
    setModalOpen(false);
  }

  // Convert rect percent (0..100) into SVG viewBox coordinates (1280x844)
  const VIEW_W = 1280;
  const VIEW_H = 844;
  function rectToSvg(r) {
    return {
      x: (r.x / 100) * VIEW_W,
      y: (r.y / 100) * VIEW_H,
      w: (r.w / 100) * VIEW_W,
      h: (r.h / 100) * VIEW_H,
    };
  }

  function clientToSvgPoint(clientX, clientY) {
  const svg = svgRef.current;
  if (!svg) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const inv = ctm.inverse();
  const sp = pt.matrixTransform(inv);
  return { x: sp.x, y: sp.y };
}

function nextVoidId(existing) {
  let n = 1;
  while (existing.has(`ZVOID${String(n).padStart(2, "0")}`)) n++;
  return `ZVOID${String(n).padStart(2, "0")}`;
}

// Рисуем все зоны как "занято" на канвас (mask = 1), затем flood fill по "пустоте" (mask=0)
function buildOccupiedMaskFromZones(w, h, zonesList) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, w, h);

  // Заполняем занятые области белым
  ctx.fillStyle = "#fff";

  for (const z of zonesList) {
    if (!z?.d) continue;
    // в твоём приложении зоны — path, линии можно игнорировать
    if (z.shape === "line") continue;

    try {
      const p = new Path2D(z.d);
      ctx.fill(p);
    } catch {
      // если какая-то path-строка битая — просто пропускаем
    }
  }

  const img = ctx.getImageData(0, 0, w, h).data;
  const occ = new Uint8Array(w * h);
  // если alpha>0 => занято
  for (let i = 0, px = 0; i < img.length; i += 4, px++) {
    occ[px] = img[i + 3] > 0 ? 1 : 0;
  }
  return { occ, w, h };
}

function floodFillVoid(occ, w, h, sx, sy) {
  // sx,sy в координатах w/h
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  if (ix < 0 || iy < 0 || ix >= w || iy >= h) return null;

  const idx0 = iy * w + ix;
  if (occ[idx0] === 1) return null; // старт попал в "занято"

  const visited = new Uint8Array(w * h);
  const qx = new Int32Array(w * h);
  const qy = new Int32Array(w * h);
  let qh = 0, qt = 0;

  visited[idx0] = 1;
  qx[qt] = ix; qy[qt] = iy; qt++;

  // Сохраним bounding box, чтобы ускорить потом
  let minX = ix, maxX = ix, minY = iy, maxY = iy;

  // 4-связность
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

  while (qh < qt) {
    const x = qx[qh];
    const y = qy[qh];
    qh++;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (visited[ni]) continue;
      if (occ[ni] === 1) continue; // нельзя залезать в занято
      visited[ni] = 1;
      qx[qt] = nx; qy[qt] = ny; qt++;
    }
  }

  return { visited, minX, maxX, minY, maxY };
}

// Простая marching squares для получения контура области visited==1
function marchingSquares(visited, w, h, bb) {
  const { minX, maxX, minY, maxY } = bb;

  // берём область на 1 пиксель шире, чтобы контур не обрезался
  const x0 = Math.max(minX - 1, 0);
  const x1 = Math.min(maxX + 1, w - 2);
  const y0 = Math.max(minY - 1, 0);
  const y1 = Math.min(maxY + 1, h - 2);

  // helper: внутри ли область
  const inside = (x, y) => visited[y * w + x] === 1;

  // Собираем сегменты (много), потом склеим в полилинию
  const segments = [];

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const a = inside(x, y) ? 1 : 0;
      const b = inside(x + 1, y) ? 1 : 0;
      const c = inside(x + 1, y + 1) ? 1 : 0;
      const d = inside(x, y + 1) ? 1 : 0;
      const code = (a << 3) | (b << 2) | (c << 1) | d;

      // Координаты углов клетки: (x,y)-(x+1,y+1)
      // Середины рёбер:
      const top = [x + 0.5, y];
      const right = [x + 1, y + 0.5];
      const bottom = [x + 0.5, y + 1];
      const left = [x, y + 0.5];

      // Таблица для стандартного marching squares (без амбигуити-решения — нам достаточно для “дырки”)
      // Добавляем сегмент(ы) в формате [x1,y1,x2,y2]
      switch (code) {
        case 0:
        case 15:
          break;
        case 1:
        case 14:
          segments.push([...left, ...bottom]);
          break;
        case 2:
        case 13:
          segments.push([...bottom, ...right]);
          break;
        case 3:
        case 12:
          segments.push([...left, ...right]);
          break;
        case 4:
        case 11:
          segments.push([...top, ...right]);
          break;
        case 5:
          segments.push([...top, ...left]);
          segments.push([...bottom, ...right]);
          break;
        case 6:
        case 9:
          segments.push([...top, ...bottom]);
          break;
        case 7:
        case 8:
          segments.push([...top, ...left]);
          break;
        case 10:
          segments.push([...top, ...right]);
          segments.push([...bottom, ...left]);
          break;
        default:
          break;
      }
    }
  }

  if (!segments.length) return null;

  // Склейка сегментов в один контур: быстрый greedy по совпадению концов
  // (для “дырки” обычно получается один связный цикл)
  const key = (x, y) => `${x.toFixed(3)},${y.toFixed(3)}`;
  const map = new Map();
  for (const s of segments) {
    const k1 = key(s[0], s[1]);
    if (!map.has(k1)) map.set(k1, []);
    map.get(k1).push(s);
  }

  // стартуем с первого сегмента
  const first = segments[0];
  let cx = first[2], cy = first[3];
  const poly = [[first[0], first[1]], [first[2], first[3]]];

  const used = new Set();
  used.add(first);

  // ищем следующий сегмент по стартовой точке
  for (let guard = 0; guard < 200000; guard++) {
    const k = key(cx, cy);
    const arr = map.get(k);
    if (!arr || !arr.length) break;

    let next = null;
    for (const s of arr) {
      if (used.has(s)) continue;
      next = s;
      break;
    }
    if (!next) break;

    used.add(next);
    cx = next[2]; cy = next[3];
    poly.push([cx, cy]);

    // замкнули
    const [sx, sy] = poly[0];
    if (Math.abs(cx - sx) < 1e-3 && Math.abs(cy - sy) < 1e-3) break;
  }

  // Упростим (уберём лишние точки)
  const simplified = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const prev = simplified[simplified.length - 1];
    if (!prev || Math.hypot(p[0] - prev[0], p[1] - prev[1]) > 0.3) simplified.push(p);
  }

  if (simplified.length < 10) return null;
  return simplified;
}

function polyToSvgPath(poly, scaleX, scaleY) {
  // poly в координатах mask (пиксели), переводим обратно в viewBox
  const pts = poly.map(([x, y]) => [x * scaleX, y * scaleY]);
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    d += `L${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)}`;
  }
  d += "Z";
  return d;
}

function createZoneFromVoidAt(clientX, clientY) {
  if (!isAdmin) return false;
  if (mapMode === "eng") return false; // если нужно — можно включить и для eng отдельно

  const svgPt = clientToSvgPoint(clientX, clientY);
  if (!svgPt) return false;

  // Маска делается уменьшенной, чтобы не лагало
  const MASK_W = 420;
  const MASK_H = Math.round((MASK_W * VIEW.h) / VIEW.w);

  // Масштаб: viewBox -> mask
  const sx = MASK_W / VIEW.w;
  const sy = MASK_H / VIEW.h;

  const seedX = svgPt.x * sx;
  const seedY = svgPt.y * sy;

  const { occ, w, h } = buildOccupiedMaskFromZones(MASK_W, MASK_H, zones);

  const filled = floodFillVoid(occ, w, h, seedX, seedY);
  if (!filled) {
    alert("Тут не пустота (або занадто малий зазор).");
    return false;
  }

  // Если пустота слишком большая (например фон вокруг всего) — не создаём
  const area = (() => {
    // грубо оцениваем площадь по bbox
    const bw = (filled.maxX - filled.minX + 1);
    const bh = (filled.maxY - filled.minY + 1);
    return bw * bh;
  })();
  // if (area > w * h * 0.45) {
    // alert("Це схоже на зовнішній фон, а не локальний 'пустир'.");
    // return false;
  // }

  const poly = marchingSquares(filled.visited, w, h, filled);
  if (!poly) {
    alert("Не вдалося побудувати контур пустоти.");
    return false;
  }

  // mask -> viewBox
  const d = polyToSvgPath(poly, VIEW.w / MASK_W, VIEW.h / MASK_H);

  const existingIds = new Set(zones.map((z) => z.id));
  const id = nextVoidId(existingIds);

  const newZone = {
    id,
    name: `Void ${id}`,
    status: "план",
    area: "",
    type: "",
    hasProject: true,
    shape: "path",
    d,
    params: {},
    project: { title: "", description: "", metrics: {} },
  };

  setZones((prev) => [newZone, ...prev]);
  setSelectedId(id);
  setModalOpen(true);
  return true;
}



  return (
    <>
      <style>{`
        @keyframes orangeGradient {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div
        className="min-h-screen text-slate-900"
        style={{
          background: "linear-gradient(-45deg, #7a3b1c, #9a4a1f, #c1652a, #e38a3f)",
          backgroundSize: "400% 400%",
          animation: "orangeGradient 18s ease infinite",
          fontFamily: "'Montserrat', sans-serif",
        }}
      >
        {/* Top bar */}
        <div className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
          <div className="px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-[260px]">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white grid place-items-center shadow-sm">
                <HardHat className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <div className="font-semibold tracking-tight" style={{ fontFamily: "'Oswald', sans-serif" }}>
                    {settings.projectName}
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                    SOKIL
                  </span>
                </div>
                <div className="text-xs text-slate-600">{settings.projectSubtitle}</div>
              </div>
            </div>

            {/* Desktop controls */}
            <div className="hidden md:flex items-center gap-2">
              {/* Search and filter */}
              <div className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <Search className="w-4 h-4 text-slate-500 ml-3" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={settings.strings.searchPlaceholder}
                  className="bg-transparent outline-none text-sm placeholder:text-slate-400 w-[220px] px-3 py-2"
                />
                {/*<button
                  onClick={() => setFilterProjectOnly((v) => !v)}
                  className={
                    "ml-2 px-2 py-1 rounded-lg border text-xs flex items-center gap-1 transition " +
                    (filterProjectOnly
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white border-slate-200 text-slate-700")
                  }
                  title={settings.strings.filterOnlyProject}
                >
                  <Filter className="w-3.5 h-3.5" />
                  
                </button>
                */}
              </div>

              
              <SoftButton
                onClick={() =>
                  setMapMode((m) => (m === "base" ? "project" : m === "project" ? "eng" : "base"))
                }
                title="Перемкнути режим"
                className={mapMode !== "base" ? "bg-amber-50 border-amber-200" : ""}
              >
                <Layers className="w-4 h-4" />
                {mapMode === "base"
                  ? "КАРТА БЕЗ ЖК"
                  : mapMode === "project"
                  ? "КАРТА З ЖК"
                  : "СХЕМА ІНЖ. ЗАБЕЗПЕЧЕННЯ"}
              </SoftButton>


              {/* Admin controls */}
              {!isAdmin ? (
                <PrimaryButton onClick={() => setAdminLoginOpen(true)} title="Увійти як адміністратор">
                  <Shield className="w-4 h-4" />
                  Адмін
                </PrimaryButton>
              ) : (
                <div className="flex items-center gap-2">
                  <SoftButton onClick={exportAll} title="Експорт даних (settings + zones)">
                    <FileJson className="w-4 h-4" />
                    {settings.strings.export}
                  </SoftButton>
                  <SoftButton onClick={openImport} title="Імпорт JSON">
                    <Upload className="w-4 h-4" />
                    {settings.strings.import}
                  </SoftButton>
                  <SoftButton
                    onClick={logoutAdmin}
                    title="Вийти"
                    className="text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100"
                  >
                    <LogOut className="w-4 h-4" />
                    {settings.strings.logout}
                  </SoftButton>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={onImportFile}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="px-5 py-5">
          <div className="grid grid-cols-12 gap-4">
            {/* Left column */}
            <div className="col-span-12 lg:col-span-3">
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{settings.strings.overviewTitle}</div>
                    <div className="text-xs text-slate-600 mt-1 whitespace-pre-line">
                      {settings.strings.overviewDesc}
                    </div>
                  </div>
                  <Tag
                    icon={MapPin}
                    text={`Масштаб: ${scale.toFixed(2)}x`}
                    className="bg-slate-50 border-slate-200 text-slate-700"
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs text-slate-600">{settings.strings.zones}</div>
                    <div className="text-xl font-semibold">{stats.total}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs text-slate-600">{settings.strings.inProject}</div>
                    <div className="text-xl font-semibold">{stats.withProject}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs text-slate-600">{settings.strings.active}</div>
                    <div className="text-xl font-semibold">{stats.active}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-2 text-slate-800">
                    <Move className="w-4 h-4" />
                    <span className="text-sm font-medium">{settings.strings.navigation}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {settings.strings.navDesc}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{settings.strings.selectedZone}</div>
                    <SoftButton
                      onClick={() => selected && setModalOpen(true)}
                      disabled={!selected || !canClickZone(selected)}
                      title="Відкрити деталі"
                    >
                      <Info className="w-4 h-4" />
                      {settings.strings.detailsButton}
                    </SoftButton>
                  </div>

                  {!selected ? (
                    <div className="mt-2 text-sm text-slate-600">{settings.strings.selectZonePrompt}</div>
                  ) : (
                    <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{selected.name}</div>
                        <span className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                          {selected.id}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(() => {
                          const m = statusMeta(selected.status);
                          const IconCmp = m.icon;
                          return (
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ring-1 ${m.cls}`}>
                              <IconCmp className="w-4 h-4" /> {m.label}
                            </span>
                          );
                        })()}
                        <Tag icon={MapPin} text={selected.area || "—"} className="bg-slate-50 border-slate-200 text-slate-700" />
                        <Tag icon={Hammer} text={selected.type || "—"} className="bg-slate-50 border-slate-200 text-slate-700" />
                        <Tag
                          icon={Layers}
                          text={selected.hasProject ? "ЖК" : "—"}
                          className={
                            selected.hasProject
                              ? "bg-amber-50 border-amber-200 text-amber-900"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <div className="mt-4">
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{settings.strings.zones}</div>
                    <span className="text-xs text-slate-600">{filteredItems.length}</span>
                  </div>

                  <div className="mt-2 max-h-[360px] overflow-auto pr-1">
                    {filteredItems.map((z) => {
                      const clickable = canClickZone(z);
                      const isSel = selectedId === z.id;
                      return (
                        <button
                          key={z.id}
                          onClick={() => {
                            setSelectedId(z.id);
                            if (clickable) setModalOpen(true);
                          }}
                          className={
                            "w-full text-left px-3 py-2 rounded-xl transition mb-1 border " +
                            (isSel
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white border-slate-200 hover:bg-slate-50") +
                            (clickable ? "" : " opacity-80")
                          }
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">
                              {z.id} • {z.name}
                            </div>
                            <span
                              className={
                                "text-[11px] px-2 py-0.5 rounded-full border " +
                                (z.hasProject
                                  ? "bg-amber-50 border-amber-200 text-amber-900"
                                  : "bg-slate-50 border-slate-200 text-slate-600")
                              }
                            >
                              {z.hasProject ? "ЖК" : "—"}
                            </span>
                          </div>
                          <div className={"mt-1 text-xs " + (isSel ? "text-white/70" : "text-slate-600")}>
                            {z.type || "—"} <span className="opacity-50">•</span> {z.status || "—"}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {isAdmin ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <PrimaryButton onClick={() => createZoneTextOnly()} title="Додати текстову зону">
                        <Plus className="w-4 h-4" />
                        {settings.strings.addZone}
                      </PrimaryButton>
                      <SoftButton onClick={() => setAdminPanel("table")} title="Табличний редактор">
                        <Table2 className="w-4 h-4" />
                        {settings.strings.tableEditor}
                      </SoftButton>
                    </div>
                  ) : null}
                </Card>
              </div>
            </div>

            {/* Right column */}
            <div className="col-span-12 lg:col-span-9">
              <Card className="p-3">
  <div className="flex items-center justify-between px-2 pb-3">
    <div>
      <div className="font-semibold">{settings.strings.interactiveMapTitle}</div>
      <div className="text-xs text-slate-600">{settings.strings.interactiveMapDesc}</div>
    </div>
                {/*
    <div className="flex items-center gap-2">
      <SoftButton onClick={() => setContoursVisible((v) => !v)} title={settings.strings.showContours}>
        {contoursVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        {settings.strings.showContours}
      </SoftButton>
      <SoftButton
        onClick={() => setOnlyProjectContours((v) => !v)}
        title={settings.strings.onlyProjectContours}
        className={onlyProjectContours ? "bg-amber-50 border-amber-200" : ""}
      >
        <SlidersHorizontal className="w-4 h-4" />
        {settings.strings.onlyProjectContours}
      </SoftButton>

      <PrimaryButton onClick={() => setModalOpen(true)} disabled={!selected || !canClickZone(selected)} title="Деталі">
        <Info className="w-4 h-4" />
        {settings.strings.detailsButton}
      </PrimaryButton>
    </div>
    */}
  </div>

  <div
    ref={containerRef}
    onWheel={onWheel}
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    onPointerLeave={onPointerLeaveContainer}
    className="relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-white select-none cursor-grab"
    style={{ touchAction: "none", aspectRatio: mapMode === "eng" ? "1151/766" : "1280/844" }}
    onMouseEnter={() => setIsMapHovered(true)}
    onMouseLeave={() => setIsMapHovered(false)}
  >
    <div
      className="absolute inset-0"
      style={{
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        transformOrigin: "50% 50%",
        willChange: "transform",
      }}
    >
      {!imagesLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm text-slate-500">Завантаження карти…</span>
        </div>
      ) : (
        <>
          <img
  src={baseMap}
  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
  draggable={false}
  style={{ opacity: showBase ? 1 : 0, transition: "opacity 0.25s ease" }}
/>

<img
  src={projectMap}
  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
  draggable={false}
  style={{ opacity: showProject ? 1 : 0, transition: "opacity 0.25s ease" }}
/>

<img
  src={engMap}
  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
  draggable={false}
  style={{ opacity: showEng ? 1 : 0, transition: "opacity 0.25s ease" }}
/>


        </>
      )}

      <svg
        ref={svgRef}
        className="absolute inset-0"
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%" }}
      >
        {activeItems.map((z) => {
          if (onlyProjectContours && !z.hasProject && !isAdmin) return null;
          const isLine = z.shape === "line";
          const isPath = z.shape === "path";
          if((isPath && isLine) || !z.d) return null;

          const clickable = canClickZone(z);
          const isSel = selectedId === z.id;
          const isHoverZone = hover.id === z.id;

          const strokeWidth = isSel ? 2.4 : isHoverZone ? 1.8 : 1.15;

          const strokeColor = clickable
            ? isSel
              ? "rgba(255,255,255,0.95)"
              : isHoverZone
              ? "rgba(255,255,255,0.85)"
              : "rgba(255,255,255,0.55)"
            : "rgba(148,163,184,0.45)";

          const fillColor = isSel
            ? "rgba(255,255,255,0.14)"
            : isHoverZone
            ? "rgba(255,255,255,0.20)"
            : "rgba(255,255,255,0.06)";

return (
  <g key={z.id}>
    {(() => {
      const isLine = z.shape === "line"; // для engItems ты так и задаёшь
      const hitStroke = isLine ? 18 : 1;

      return (
        <path
          data-zoneid={z.id}
          d={z.d}
          fill={isLine ? "none" : "rgba(0,0,0,0)"}   // ВАЖНО: полигон ловит по fill
          stroke="rgba(0,0,0,0)"
          strokeWidth={hitStroke}
          pointerEvents={
            contoursVisible ? (isLine ? "stroke" : "all") : "none"
          }
          onMouseEnter={() => setHover((h) => ({ ...h, id: z.id }))}
          onMouseLeave={() => setHover((h) => (h.id === z.id ? { ...h, id: null } : h))}
          onClick={() => {
            if (!clickable) return;
            if (dragRef.current.moved) return;
            setSelectedId(z.id);
            setModalOpen(true);
          }}
        />
      );
    })()}

    <path
      d={z.d}
      fill={z.shape === "line" ? "none" : fillColor}
      stroke={strokeColor}
      strokeWidth={
        z.shape === "line"
          ? (isSel ? 3.2 : isHoverZone ? 2.6 : 2.0)
          : strokeWidth
      }
      strokeDasharray={z.dash ? z.dash : undefined}
      vectorEffect="non-scaling-stroke"
      style={{
        pointerEvents: "none",
        strokeOpacity: contoursVisible ? 1 : 0,
        fillOpacity: contoursVisible ? 1 : 0,
        transition: "fill 0.15s ease, stroke 0.15s ease, stroke-width 0.15s ease",
        filter: isHoverZone || isSel ? "drop-shadow(0 0 10px rgba(255,255,255,0.22))" : "none",
      }}
    />
  </g>
);


        })}
      </svg>
    </div>

    {/* Tooltip — ВНУТРИ container */}
    {hover.id ? (
      <div className="absolute z-30 pointer-events-none" style={{ left: hover.x + 12, top: hover.y + 12 }}>
        {(() => {
          const z = activeItems.find((x) => x.id === hover.id);
          if (!z) return null;
          return (
            <div className="rounded-2xl bg-white border border-slate-200 px-3 py-2 shadow-md">
              <div className="text-sm font-semibold text-slate-900">{z.name}</div>
              <div className="mt-1 text-xs text-slate-600 flex items-center gap-2">
                <span>{z.type || "—"}</span>
                <span className="opacity-50">•</span>
                <span>{z.status || "—"}</span>
                <span className="opacity-50">•</span>
                <span>{z.hasProject ? "ЖК" : "—"}</span>
              </div>
            </div>
          );
        })()}
      </div>
    ) : null}

    {/* Navigation hint overlay — ВНУТРИ container */}
    <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 pointer-events-none">
      <span className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm">
        {settings.strings.navigationHintPan}
      </span>
      <span className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 shadow-sm">
        {settings.strings.navigationHintZoom}
      </span>
      {mapMode === "base" ? (
        <span className="text-xs px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 shadow-sm">
          Зони
        </span>
      ) : null}
    </div>
  </div>
</Card>


              {/* Admin panel */}
              {isAdmin ? (
                <div className="mt-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-slate-700" />
                        <div>
                          <div className="font-semibold">Адмін-панель</div>
                          <div className="text-xs text-slate-600">Редагування зон та налаштувань.</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <SoftButton onClick={() => setAdminPanel("details")} className={adminPanel === "details" ? "bg-slate-50" : ""}>
                          <Info className="w-4 h-4" />
                          Деталі
                        </SoftButton>
                        <SoftButton onClick={() => setAdminPanel("table")} className={adminPanel === "table" ? "bg-slate-50" : ""}>
                          <Table2 className="w-4 h-4" />
                          Таблиця
                        </SoftButton>
                        <SoftButton onClick={() => setAdminPanel("settings")} className={adminPanel === "settings" ? "bg-slate-50" : ""}>
                          <Settings className="w-4 h-4" />
                          Налаштування
                        </SoftButton>
                      </div>
                    </div>

                    <div className="mt-4">
                      {adminPanel === "details" ? (
                        <AdminDetails
                          selected={selected}
                          mapMode={mapMode}
                          createZone={createZoneTextOnly}
                          duplicateZone={duplicateZone}
                          deleteZone={deleteZone}
                          updateZone={updateZone}
                          updateZoneParam={updateZoneParam}
                          deleteZoneParam={deleteZoneParam}
                          ensureProject={ensureProject}
                          removeProject={removeProject}
                          updateProjectMetric={updateProjectMetric}
                          deleteProjectMetric={deleteProjectMetric}
                        />
                      ) : null}

                      {adminPanel === "table" ? (
                        <AdminTable
                          zones={zones}
                          setSelectedId={setSelectedId}
                          updateZone={updateZone}
                          deleteZone={deleteZone}
                          duplicateZone={duplicateZone}
                        />
                      ) : null}

                      {adminPanel === "settings" ? (
                        <AdminSettings settings={settings} setSettings={setSettings} resetData={resetData} />
                      ) : null}
                    </div>
                  </Card>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Public modal for zone details */}
        {modalOpen && selected ? (
          <Modal onClose={() => setModalOpen(false)} title={`${selected.id} • ${selected.name}`}>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-5">
                <div className="text-sm font-semibold">{settings.strings.paramTitle}</div>
                <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {selected.params && Object.keys(selected.params).length ? (
                    <div className="space-y-2">
                      {Object.entries(selected.params).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-3">
                          <div className="text-xs text-slate-600 break-all">{k}</div>
                          <div className="text-sm text-slate-900 text-right break-all">{String(v)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-600">{settings.strings.paramEmpty}</div>
                  )}
                </div>
              </div>

              <div className="col-span-12 md:col-span-7">
                <div className="text-sm font-semibold">{settings.strings.projectInfoTitle}</div>
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
                  {selected.project ? (
                    <>
                      <div className="text-base font-semibold">{selected.project.title || "—"}</div>
                      <div className="mt-1 text-sm text-slate-600 leading-relaxed">
                        {selected.project.description || "—"}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {Object.entries(selected.project.metrics || {}).map(([k, v]) => (
                          <div key={k} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs text-slate-600 break-all">{k}</div>
                            <div className="text-sm font-semibold mt-1">{String(v)}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-600">{settings.strings.noProject}</div>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        ) : null}

        {/* Admin login modal */}
        {adminLoginOpen ? (
          <Modal onClose={() => setAdminLoginOpen(false)} title={settings.strings.adminLoginTitle} small>
            <div className="text-sm text-slate-600">{settings.strings.adminLoginDesc}</div>
            <div className="mt-4">
              <label className="text-xs text-slate-600">{settings.strings.adminPasswordLabel}</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loginAdmin()}
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="••••••••"
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <SoftButton onClick={() => setAdminLoginOpen(false)}>{settings.strings.cancel}</SoftButton>
              <PrimaryButton onClick={loginAdmin} title="Увійти">
                <LogIn className="w-4 h-4" />
                {settings.strings.login}
              </PrimaryButton>
            </div>
          </Modal>
        ) : null}
      </div>
    </>
  );
}
