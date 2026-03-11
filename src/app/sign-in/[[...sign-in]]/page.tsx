"use client";

import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen overflow-hidden">
      {/* Left - Animated gradient + bold typography */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden lg:flex">
        {/* Animated gradient background */}
        <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 bg-[length:200%_200%]" />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Floating shapes */}
        <div className="absolute -left-20 top-1/4 h-72 w-72 animate-float rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -right-10 bottom-1/3 h-56 w-56 animate-float-delayed rounded-full bg-white/10 blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-14">
          <Image
            src="/logo-dark.png"
            alt="Callaps"
            width={280}
            height={84}
            className="object-contain drop-shadow-lg"
            priority
          />

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
                  className="h-8 w-8 rounded-full border-2 border-indigo-600 object-cover"
                />
              ))}
            </div>
            <p className="text-sm font-medium text-white/60">
              +200 entreprises nous font confiance
            </p>
          </div>
        </div>
      </div>

      {/* Right - Form */}
      <div className="relative flex w-full items-center justify-center bg-slate-50 px-6 lg:w-1/2">
        {/* Decorative shapes */}
        <div className="absolute -left-32 top-1/4 h-64 w-64 rounded-full bg-indigo-100/50 blur-3xl" />
        <div className="absolute -right-20 bottom-1/4 h-48 w-48 rounded-full bg-violet-100/40 blur-3xl" />

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-10 text-center lg:hidden">
            <Image
              src="/logo-light.png"
              alt="Callaps"
              width={200}
              height={60}
              className="mx-auto object-contain"
              priority
            />
            <p className="mt-3 text-2xl font-bold text-slate-900">
              Bon retour parmi nous
            </p>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Connexion</h2>
            <p className="mt-1 text-slate-500">
              Accédez à votre tableau de bord
            </p>
          </div>

          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none",
                card: "w-full shadow-none border-0 bg-transparent p-0",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
              },
            }}
          />
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
        .animate-gradient { animation: gradient 8s ease infinite; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite 1s; }
      `}</style>
    </div>
  );
}
