"use client";

import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/sign-in");
  }

  return (
    <header className="flex h-[72px] items-center justify-between border-b border-slate-100 bg-white/80 px-8 backdrop-blur-sm">
      <div>
        <h1 className="text-[17px] font-semibold text-slate-900">{title}</h1>
        {description && (
          <p className="text-[13px] text-slate-500">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
        </Button>
        <div className="h-6 w-px bg-slate-200" />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          onClick={handleLogout}
        >
          <LogOut className="h-[18px] w-[18px]" />
        </Button>
      </div>
    </header>
  );
}
