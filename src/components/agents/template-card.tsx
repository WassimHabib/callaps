"use client";

import {
  CalendarCheck,
  Target,
  FileText,
  Headphones,
  Star,
  PackageCheck,
  Bell,
  Rocket,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentTemplate, TemplateCategory } from "@/lib/agent-templates";

const ICON_MAP: Record<string, LucideIcon> = {
  CalendarCheck,
  Target,
  FileText,
  Headphones,
  Star,
  PackageCheck,
  Bell,
  Rocket,
  Plus,
};

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  sales: "Ventes",
  support: "Support",
  marketing: "Marketing",
  operations: "Operations",
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  sales: "bg-blue-50 text-blue-700 border-blue-200",
  support: "bg-emerald-50 text-emerald-700 border-emerald-200",
  marketing: "bg-pink-50 text-pink-700 border-pink-200",
  operations: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

interface TemplateCardProps {
  template: AgentTemplate;
  selected: boolean;
  onClick: () => void;
}

export function TemplateCard({ template, selected, onClick }: TemplateCardProps) {
  const Icon = ICON_MAP[template.icon] ?? CalendarCheck;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-200/50",
        selected
          ? "ring-2 ring-indigo-500 ring-offset-2 border-indigo-300 shadow-lg shadow-indigo-100"
          : "border-slate-200 shadow-sm hover:border-slate-300"
      )}
    >
      {/* Gradient header */}
      <div
        className={cn(
          "flex h-24 items-center justify-center bg-gradient-to-br",
          template.color
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              CATEGORY_COLORS[template.category]
            )}
          >
            {CATEGORY_LABELS[template.category]}
          </span>
        </div>
        <h3 className="mb-1 text-[15px] font-semibold text-slate-900">
          {template.name}
        </h3>
        <p className="text-[13px] leading-relaxed text-slate-500">
          {template.description}
        </p>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md">
          <div className="h-3 w-3 rounded-full bg-indigo-500" />
        </div>
      )}
    </button>
  );
}

interface BlankTemplateCardProps {
  selected: boolean;
  onClick: () => void;
}

export function BlankTemplateCard({ selected, onClick }: BlankTemplateCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-200/50",
        selected
          ? "ring-2 ring-indigo-500 ring-offset-2 border-indigo-300 bg-white shadow-lg shadow-indigo-100"
          : "border-dashed border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-white"
      )}
    >
      {/* Gradient header */}
      <div className="flex h-24 items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 transition-transform duration-200 group-hover:scale-110 group-hover:border-slate-400">
          <Plus className="h-7 w-7 text-slate-400" />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="mb-1 text-[15px] font-semibold text-slate-900">
          Agent vierge
        </h3>
        <p className="text-[13px] leading-relaxed text-slate-500">
          Partez de zero avec une configuration par defaut. Ideal pour les cas
          d&apos;usage personnalises.
        </p>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md">
          <div className="h-3 w-3 rounded-full bg-indigo-500" />
        </div>
      )}
    </button>
  );
}
