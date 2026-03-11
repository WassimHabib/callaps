import { Header } from "@/components/layout/header";
import { NewAgentFlow } from "@/components/agents/new-agent-flow";

export default function NewAgentPage() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Nouvel Agent IA"
        description="Choisissez un modele ou partez de zero"
      />
      <NewAgentFlow />
    </div>
  );
}
