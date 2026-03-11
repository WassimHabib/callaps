import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import { Zap, BarChart3, Globe, Bot } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left - Branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-12 lg:flex">
        <div>
          <div className="flex items-center">
            <Image
              src="/logo.png"
              alt="Wevlap"
              width={200}
              height={60}
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-white">
              Automatisez vos appels
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                avec l&apos;IA
              </span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-slate-400">
              Lancez des campagnes d&apos;appels intelligents, qualifiez vos leads et
              prenez des rendez-vous automatiquement.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Zap, title: "Appels automatisés", desc: "Agents IA configurables" },
              { icon: BarChart3, title: "Analytics", desc: "Statistiques en temps réel" },
              { icon: Globe, title: "Intégrations", desc: "CRM, calendriers, webhooks" },
              { icon: Bot, title: "Multi-agents", desc: "Un agent par besoin" },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm"
              >
                <feature.icon className="mb-2 h-5 w-5 text-indigo-400" />
                <p className="text-sm font-medium text-white">{feature.title}</p>
                <p className="text-xs text-slate-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">
          &copy; {new Date().getFullYear()} Wevlap. Tous droits réservés.
        </p>
      </div>

      {/* Right - Sign In */}
      <div className="flex w-full items-center justify-center bg-slate-50 px-4 lg:w-1/2">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:hidden">
            <div className="mb-4 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Wevlap"
                width={180}
                height={54}
                className="object-contain"
                priority
              />
            </div>
          </div>
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none",
                card: "w-full shadow-xl rounded-2xl border border-slate-200 bg-white",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
