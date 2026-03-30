"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur de connexion");
        return;
      }

      if (data.role === "super_admin") {
        router.push("/admin");
      } else if (data.role === "admin") {
        router.push("/admin-portal");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Left - Animated gradient + bold typography */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden lg:flex">
        <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-[#4f46e5] via-[#7c3aed] to-[#2563eb] bg-[length:200%_200%]" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute -left-20 top-1/4 h-72 w-72 animate-float rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -right-10 bottom-1/3 h-56 w-56 animate-float-delayed rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex h-full flex-col justify-between p-14">
          <div className="h-16" />
          <div className="-mt-6">
            <h1 className="text-6xl font-black leading-[1.05] tracking-tight text-white">
              Appels.
              <br />
              IA.
              <br />
              Résultats.
            </h1>
            <p className="mt-6 max-w-sm text-lg font-medium text-white/70">
              La plateforme qui automatise vos appels commerciaux et multiplie
              vos conversions.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex -space-x-2">
              {[
                "https://i.pravatar.cc/40?img=12",
                "https://i.pravatar.cc/40?img=32",
                "https://i.pravatar.cc/40?img=44",
                "https://i.pravatar.cc/40?img=52",
              ].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="h-8 w-8 rounded-full border-2 border-[#4f46e5] object-cover"
                />
              ))}
            </div>
            <p className="text-sm font-medium text-white/60">
              +200 entreprises nous font confiance
            </p>
          </div>
        </div>
      </div>

      {/* Right - Login Form */}
      <div className="relative flex w-full items-center justify-center overflow-hidden bg-slate-50 px-6 lg:w-1/2">
        {/* Decorative blurred orbs */}
        <div className="absolute -left-32 top-1/4 h-64 w-64 animate-float rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute -right-20 bottom-1/4 h-48 w-48 animate-float-delayed rounded-full bg-violet-200/30 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 animate-float-delayed rounded-full bg-indigo-100/50 blur-3xl" />

        <div className="relative z-10 w-full max-w-md">
          {/* Logo - centered, with glow effect */}
          <div className="mb-10 flex flex-col items-center">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-indigo-500/20 blur-2xl animate-pulse-slow" />
              <Image
                src="/logoV2.png"
                alt="Callaps"
                width={200}
                height={60}
                className="relative object-contain drop-shadow-sm"
                priority
              />
            </div>
          </div>

          {/* Glass card */}
          <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-2xl shadow-indigo-500/5 backdrop-blur-xl ring-1 ring-slate-900/5">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-slate-900">Bon retour</h2>
              <p className="mt-1 text-sm text-slate-500">
                Connectez-vous pour accéder à votre espace
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="animate-shake rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200/50">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg className="h-4 w-4 text-slate-400 transition group-focus-within:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="vous@entreprise.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Mot de passe
                </label>
                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <svg className="h-4 w-4 text-slate-400 transition group-focus-within:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/30 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Connexion...
                    </span>
                  ) : (
                    "Se connecter"
                  )}
                </span>
              </button>

              <div className="text-center">
                <a
                  href="/forgot-password"
                  className="text-sm text-slate-500 transition hover:text-indigo-600"
                >
                  Mot de passe oublié ?
                </a>
              </div>
            </form>
          </div>

          {/* Bottom subtle branding */}
          <p className="mt-8 text-center text-xs text-slate-400">
            Propulsé par l&apos;intelligence artificielle
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(20px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-gradient { animation: gradient 8s ease infinite; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite 1s; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
