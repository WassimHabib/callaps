import { Header } from "@/components/layout/header";
import { PhoneNumbersClient } from "@/components/phone-numbers/phone-numbers-client";
import { fetchPhoneNumbers, fetchAgents, hasTwilioCredentials } from "./actions";

export default async function PhoneNumbersPage() {
  let phoneNumbers: { id: string; number?: string; name?: string; assistantId?: string; provider?: string }[] = [];
  try {
    const retellNumbers = await fetchPhoneNumbers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    phoneNumbers = retellNumbers.map((pn: any) => ({
      id: pn.phone_number,
      number: pn.phone_number_pretty || pn.phone_number,
      name: pn.nickname || undefined,
      assistantId: pn.inbound_agent_id || undefined,
      provider: pn.phone_number_type,
    }));
  } catch {
    // Continue with empty list
  }

  const [agents, hasTwilio] = await Promise.all([
    fetchAgents(),
    hasTwilioCredentials(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header
        title="Numéros de téléphone"
        description="Gérez vos numéros de téléphone pour les appels sortants et entrants"
      />
      <PhoneNumbersClient
        initialNumbers={phoneNumbers}
        agents={agents}
        hasTwilio={hasTwilio}
      />
    </div>
  );
}
