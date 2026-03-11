"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { voices, providers, accents, type Voice } from "@/lib/voices";
import { Mic, Play, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceSelectorProps {
  value: string;
  provider: string;
  onSelect: (voiceId: string, provider: string) => void;
}

export function VoiceSelector({ value, provider, onSelect }: VoiceSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedVoiceProvider = voices.find((v) => v.id === value)?.provider;
  const [activeTab, setActiveTab] = useState(selectedVoiceProvider || provider || "cartesia");
  const [search, setSearch] = useState("");
  const [filterAccent, setFilterAccent] = useState("all");
  const [filterGender, setFilterGender] = useState("all");

  const selectedVoice = voices.find((v) => v.id === value);

  const filteredVoices = useMemo(() => {
    return voices.filter((v) => {
      if (v.provider !== activeTab) return false;
      if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterAccent !== "all" && v.accent !== filterAccent) return false;
      if (filterGender !== "all" && v.gender !== filterGender) return false;
      return true;
    });
  }, [activeTab, search, filterAccent, filterGender]);

  const handleSelect = (voice: Voice) => {
    onSelect(voice.id, voice.provider);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-[12px] transition-colors hover:bg-slate-100"
          />
        }
      >
        <Mic className="h-3.5 w-3.5 text-slate-400" />
        <span className="flex-1 truncate text-slate-700">
          {selectedVoice ? selectedVoice.name : "Sélectionner une voix"}
        </span>
        {selectedVoice && (
          <Badge className="border-0 bg-slate-200 text-[9px] text-slate-600">
            {selectedVoice.provider}
          </Badge>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0" showCloseButton={false}>
        <DialogHeader className="border-b border-slate-100 px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold text-slate-900">
            Sélectionner une voix
          </DialogTitle>

          {/* Provider tabs */}
          <div className="mt-3 flex gap-1 overflow-x-auto">
            {providers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setActiveTab(p);
                  setSearch("");
                  setFilterAccent("all");
                  setFilterGender("all");
                }}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-medium capitalize transition-colors",
                  activeTab === p
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                {p === "elevenlabs" ? "ElevenLabs" : p === "openai" ? "OpenAI" : p === "platform" ? "Retell" : p === "minimax" ? "Minimax" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-3">
          <Select value={filterAccent} onValueChange={(v) => setFilterAccent(v ?? "all")}>
            <SelectTrigger className="h-8 w-[120px] rounded-lg border-slate-200 bg-slate-50 text-[11px]">
              <SelectValue placeholder="Accent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {accents.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterGender} onValueChange={(v) => setFilterGender(v ?? "all")}>
            <SelectTrigger className="h-8 w-[100px] rounded-lg border-slate-200 bg-slate-50 text-[11px]">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-8 rounded-lg border-slate-200 bg-slate-50 pl-8 text-[11px]"
            />
          </div>
        </div>

        {/* Voice list */}
        <div className="max-h-[50vh] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-slate-100 text-left text-[11px] font-medium text-slate-500">
                <th className="w-12 px-6 py-2.5"></th>
                <th className="px-3 py-2.5">Voice</th>
                <th className="px-3 py-2.5">Trait</th>
                <th className="px-3 py-2.5">Voice ID</th>
                <th className="w-12 px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filteredVoices.map((voice) => {
                const isSelected = voice.id === value;
                return (
                  <tr
                    key={voice.id}
                    onClick={() => handleSelect(voice)}
                    className={cn(
                      "cursor-pointer border-b border-slate-50 transition-colors",
                      isSelected
                        ? "bg-indigo-50/50"
                        : "hover:bg-slate-50"
                    )}
                  >
                    <td className="px-6 py-3">
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-indigo-300 hover:text-indigo-500"
                      >
                        <Play className="h-3 w-3" />
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[13px] font-medium text-slate-900">
                        {voice.name}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge className="border-0 bg-slate-100 text-[10px] font-medium text-slate-600">
                          {voice.accent}
                        </Badge>
                        <Badge className="border-0 bg-slate-100 text-[10px] font-medium text-slate-600">
                          {voice.gender}
                        </Badge>
                        <Badge className="border-0 bg-slate-100 text-[10px] font-medium text-slate-600">
                          {voice.age}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-[11px] text-slate-400">
                        {voice.id}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {isSelected && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredVoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[12px] text-slate-400">
                    Aucune voix trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
          <p className="text-[11px] text-slate-400">
            {filteredVoices.length} voix disponibles
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="rounded-lg text-[12px]"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
