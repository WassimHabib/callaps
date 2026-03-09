"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TopCampaignsProps {
  data: {
    id: string;
    name: string;
    totalCalls: number;
    completedCalls: number;
    rate: number;
    avgDuration: number;
    contactsCount: number;
  }[];
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function TopCampaigns({ data }: TopCampaignsProps) {
  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold text-slate-900">
          Campagnes les plus actives
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Aucune campagne
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_120px_80px] gap-3 text-[12px] font-medium uppercase tracking-wide text-slate-400">
              <span>Campagne</span>
              <span className="text-right">Appels</span>
              <span className="text-center">Taux</span>
              <span className="text-right">Durée moy.</span>
            </div>
            {/* Rows */}
            {data.map((campaign) => (
              <div
                key={campaign.id}
                className="grid grid-cols-[1fr_80px_120px_80px] items-center gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-slate-800">
                    {campaign.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {campaign.contactsCount} contacts
                  </p>
                </div>
                <div className="text-right text-[13px] text-slate-600">
                  {campaign.completedCalls}/{campaign.totalCalls}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${campaign.rate}%` }}
                    />
                  </div>
                  <span className="text-[12px] font-medium text-slate-600">
                    {campaign.rate}%
                  </span>
                </div>
                <div className="text-right text-[13px] text-slate-600">
                  {formatDuration(campaign.avgDuration)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
