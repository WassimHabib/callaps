import { Header } from "@/components/layout/header";
import { AgentForm } from "@/components/agents/agent-form";

export default function NewAgentPage() {
  return (
    <div>
      <Header title="Nouvel Agent IA" description="Configurez votre agent d'appels" />
      <div className="mx-auto max-w-2xl p-6">
        <AgentForm />
      </div>
    </div>
  );
}
