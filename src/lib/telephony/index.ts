import type { TelephonyProvider } from "./types";
import { TwilioProvider } from "./twilio-provider";

export function getTelephonyProvider(): TelephonyProvider {
  return new TwilioProvider();
}

export type { TelephonyProvider, CallOptions, CallResult } from "./types";
