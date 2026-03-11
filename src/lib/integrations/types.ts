export type IntegrationProvider =
  | "hubspot"
  | "pipedrive"
  | "slack"
  | "google_calendar"
  | "google_sheets";

export interface IntegrationConfig {
  hubspot: { accessToken: string };
  pipedrive: { apiToken: string; domain: string }; // domain = company.pipedrive.com
  slack: { webhookUrl: string; channel?: string };
  google_calendar: { apiKey: string; calendarId: string };
  google_sheets: { apiKey: string; spreadsheetId: string };
}

export interface ContactData {
  name: string;
  email?: string | null;
  phone: string;
  company?: string | null;
  notes?: string | null;
}

export interface CallActivityData {
  contactName: string;
  contactPhone: string;
  duration: number; // seconds
  outcome: string;
  summary?: string | null;
  transcript?: string | null;
  sentiment?: string | null;
  recordingUrl?: string | null;
  date: Date;
}

export interface SyncResult {
  success: boolean;
  message: string;
  externalId?: string;
}
