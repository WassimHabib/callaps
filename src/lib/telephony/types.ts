export interface CallOptions {
  to: string;
  from: string;
  webhookUrl: string;
  metadata?: Record<string, string>;
}

export interface CallResult {
  sid: string;
  status: string;
}

export interface TelephonyProvider {
  name: string;
  makeCall(options: CallOptions): Promise<CallResult>;
  endCall(sid: string): Promise<void>;
  getCallStatus(sid: string): Promise<string>;
}
