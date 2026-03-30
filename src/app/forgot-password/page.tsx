"use client";

import { useState } from "react";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 flex justify-center">
          <Image src="/logoV2.png" alt="Callaps" width={180} height={54} className="object-contain" priority />
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-10 shadow-xl shadow-slate-200/50">
          {sent ? (
            <div className="text-center">
              <h1 className="text-xl font-bold text-slate-900">Email envoyé</h1>
              <p className="mt-2 text-sm text-slate-500">
                Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.
              </p>
              <a href="/sign-in" className="mt-6 inline-block text-sm text-indigo-600 hover:underline">
                Retour à la connexion
              </a>
            </div>
          ) : (
            <>
              <h1 className="text-center text-2xl font-bold text-slate-900">
                Mot de passe oublié
              </h1>
              <p className="mt-2 text-center text-sm text-slate-500">
                Entrez votre email pour recevoir un lien de réinitialisation
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="vous@entreprise.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Envoi..." : "Envoyer le lien"}
                </button>

                <div className="text-center">
                  <a href="/sign-in" className="text-sm text-indigo-600 hover:underline">
                    Retour à la connexion
                  </a>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
