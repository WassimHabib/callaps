import twilio from "twilio";
import type { TelephonyProvider, CallOptions, CallResult } from "./types";

export class TwilioProvider implements TelephonyProvider {
  name = "twilio";
  private client: twilio.Twilio;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    this.client = twilio(accountSid, authToken);
  }

  async makeCall(options: CallOptions): Promise<CallResult> {
    const call = await this.client.calls.create({
      to: options.to,
      from: options.from,
      url: options.webhookUrl,
      statusCallback: `${options.webhookUrl}/status`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    });

    return { sid: call.sid, status: call.status };
  }

  async endCall(sid: string): Promise<void> {
    await this.client.calls(sid).update({ status: "completed" });
  }

  async getCallStatus(sid: string): Promise<string> {
    const call = await this.client.calls(sid).fetch();
    return call.status;
  }
}
