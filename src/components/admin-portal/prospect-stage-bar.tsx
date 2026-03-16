"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronRight, X } from "lucide-react";

const STAGE_CONFIG = [
  { slug: "prospect", label: "Prospect", color: "slate" },
  { slug: "contacted", label: "Contacté", color: "blue" },
  { slug: "demo_scheduled", label: "Démo planifiée", color: "indigo" },
  { slug: "demo_done", label: "Démo faite", color: "violet" },
  { slug: "proposal_sent", label: "Proposition", color: "amber" },
  { slug: "negotiation", label: "Négociation", color: "orange" },
  { slug: "converted", label: "Converti", color: "emerald" },
  { slug: "lost", label: "Perdu", color: "red" },
];

const colorMap: Record<string, { bg: string; ring: string; text: string; line: string }> = {
  slate: { bg: "bg-slate-400", ring: "ring-slate-200", text: "text-slate-600", line: "bg-slate-200" },
  blue: { bg: "bg-blue-500", ring: "ring-blue-200", text: "text-blue-600", line: "bg-blue-200" },
  indigo: { bg: "bg-indigo-500", ring: "ring-indigo-200", text: "text-indigo-600", line: "bg-indigo-200" },
  violet: { bg: "bg-violet-500", ring: "ring-violet-200", text: "text-violet-600", line: "bg-violet-200" },
  amber: { bg: "bg-amber-500", ring: "ring-amber-200", text: "text-amber-600", line: "bg-amber-200" },
  orange: { bg: "bg-orange-500", ring: "ring-orange-200", text: "text-orange-600", line: "bg-orange-200" },
  emerald: { bg: "bg-emerald-500", ring: "ring-emerald-200", text: "text-emerald-600", line: "bg-emerald-200" },
  red: { bg: "bg-red-500", ring: "ring-red-200", text: "text-red-600", line: "bg-red-200" },
};

interface ProspectStageBarProps {
  currentStage: string;
  onAdvance: () => void;
  onMarkLost: () => void;
  disabled?: boolean;
}

export function ProspectStageBar({
  currentStage,
  onAdvance,
  onMarkLost,
  disabled,
}: ProspectStageBarProps) {
  const currentIndex = STAGE_CONFIG.findIndex((s) => s.slug === currentStage);
  const isTerminal = currentStage === "converted" || currentStage === "lost";
  const canAdvance = !isTerminal && currentIndex < STAGE_CONFIG.indexOf(STAGE_CONFIG.find((s) => s.slug === "negotiation")!);

  return (
    <div className="space-y-4">
      {/* Stage progression */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STAGE_CONFIG.map((stage, index) => {
          const colors = colorMap[stage.color];
          const isCurrent = stage.slug === currentStage;
          const isPast = index < currentIndex;
          const isFuture = index > currentIndex;

          return (
            <div key={stage.slug} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                    isCurrent && `${colors.bg} ring-4 ${colors.ring} text-white`,
                    isPast && `${colors.bg} text-white`,
                    isFuture && "bg-slate-100 text-slate-300"
                  )}
                >
                  <span className="text-[10px] font-bold">{index + 1}</span>
                </div>
                <span
                  className={cn(
                    "whitespace-nowrap text-[10px] font-medium",
                    isCurrent ? colors.text : isPast ? "text-slate-500" : "text-slate-300"
                  )}
                >
                  {stage.label}
                </span>
              </div>
              {index < STAGE_CONFIG.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-0.5 w-6",
                    index < currentIndex ? colors.line : "bg-slate-100"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {!isTerminal && (
        <div className="flex gap-2">
          {canAdvance && (
            <Button
              size="sm"
              onClick={onAdvance}
              disabled={disabled}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <ChevronRight className="mr-1 h-4 w-4" />
              Avancer
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onMarkLost}
            disabled={disabled}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <X className="mr-1 h-4 w-4" />
            Marquer perdu
          </Button>
        </div>
      )}
    </div>
  );
}
