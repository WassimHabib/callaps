"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PhoneCall, PhoneOff, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWebCallToken } from "@/app/(dashboard)/agents/actions";

interface WebCallButtonProps {
  agentId: string; // Our DB agent ID
}

export function WebCallButton({ agentId }: WebCallButtonProps) {
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "ended" | "error"
  >("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const retellRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startCall = async () => {
    // Prevent double calls — stop any existing call first
    if (retellRef.current) {
      try { retellRef.current.stopCall(); } catch { /* ignore */ }
      retellRef.current = null;
    }

    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMsg("Accès au microphone refusé. Autorisez le micro dans votre navigateur.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
      return;
    }

    setStatus("connecting");
    setErrorMsg("");

    try {
      // Get access token from server
      const { access_token } = await getWebCallToken(agentId);

      const RetellModule = await import("retell-client-js-sdk");
      const { RetellWebClient } = RetellModule;
      const retell = new RetellWebClient();

      retell.on("call_started", () => {
        setStatus("connected");
        startTimer();
      });

      retell.on("call_ended", () => {
        setStatus("ended");
        stopTimer();
        setIsMuted(false);
        retellRef.current = null;
        // Force stop all audio
        try {
          document.querySelectorAll("audio").forEach((el) => {
            el.pause();
            el.srcObject = null;
          });
        } catch { /* ignore */ }
        setTimeout(() => setStatus("idle"), 3000);
      });

      retell.on("error", (err: unknown) => {
        console.error("[Retell] Error:", err);
        let msg = "Erreur inconnue";
        if (err instanceof Error) {
          msg = err.message;
        } else if (typeof err === "string") {
          msg = err;
        } else if (typeof err === "object" && err !== null) {
          const errObj = err as Record<string, unknown>;
          msg = errObj.message as string || errObj.error as string || JSON.stringify(err);
        }
        setErrorMsg(msg);
        setStatus("error");
        stopTimer();
        setTimeout(() => setStatus("idle"), 5000);
      });

      retellRef.current = retell;
      await retell.startCall({ accessToken: access_token });
    } catch (err) {
      console.error("[Retell] Failed to start:", err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
      stopTimer();
      setTimeout(() => setStatus("idle"), 5000);
    }
  };

  const endCall = () => {
    if (retellRef.current) {
      try {
        retellRef.current.stopCall();
      } catch {
        // ignore
      }
      retellRef.current = null;
    }
    // Force stop all audio tracks to ensure silence
    try {
      const audioElements = document.querySelectorAll("audio");
      audioElements.forEach((el) => {
        el.pause();
        el.srcObject = null;
        el.src = "";
      });
    } catch {
      // ignore
    }
    stopTimer();
    setIsMuted(false);
    setStatus("idle");
  };

  const toggleMute = () => {
    if (retellRef.current) {
      if (isMuted) {
        retellRef.current.unmute();
      } else {
        retellRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  if (status === "idle") {
    return (
      <Button onClick={startCall} variant="outline" size="sm" disabled={status !== "idle"}>
        <PhoneCall className="h-4 w-4 mr-1" />
        Tester dans le navigateur
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium max-w-xs",
          status === "connecting" && "bg-yellow-50 text-yellow-700",
          status === "connected" && "bg-green-50 text-green-700",
          status === "ended" && "bg-slate-100 text-slate-500",
          status === "error" && "bg-red-50 text-red-600"
        )}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full shrink-0",
            status === "connecting" && "bg-yellow-500 animate-pulse",
            status === "connected" && "bg-green-500 animate-pulse",
            status === "ended" && "bg-slate-400",
            status === "error" && "bg-red-500"
          )}
        />
        <span className="truncate">
          {status === "connecting" && "Connexion..."}
          {status === "connected" && formatDuration(duration)}
          {status === "ended" && "Appel terminé"}
          {status === "error" && errorMsg}
        </span>
      </div>

      {status === "connected" && (
        <Button
          onClick={toggleMute}
          variant="outline"
          size="sm"
          className={cn(isMuted && "bg-red-50 text-red-600")}
        >
          {isMuted ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
      )}

      {(status === "connecting" || status === "connected") && (
        <Button
          onClick={endCall}
          variant="outline"
          size="sm"
          className="text-red-600 hover:bg-red-50"
        >
          <PhoneOff className="h-4 w-4 mr-1" />
          Raccrocher
        </Button>
      )}

      {status === "error" && (
        <Button
          onClick={() => setStatus("idle")}
          variant="outline"
          size="sm"
        >
          Réessayer
        </Button>
      )}
    </div>
  );
}
