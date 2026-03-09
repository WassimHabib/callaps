import { SignUp } from "@clerk/nextjs";
import { Bot } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left - Branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-12 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Wevlap</span>
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight text-white">
            Rejoignez la
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              révolution IA
            </span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-slate-400">
            Créez votre compte et commencez à automatiser vos appels dès
            aujourd&apos;hui.
          </p>
        </div>

        <p className="text-xs text-slate-600">
          &copy; {new Date().getFullYear()} Wevlap. Tous droits réservés.
        </p>
      </div>

      {/* Right - Sign Up */}
      <div className="flex w-full items-center justify-center bg-slate-50 px-4 lg:w-1/2">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:hidden">
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">Wevlap</span>
            </div>
          </div>
          <SignUp
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
