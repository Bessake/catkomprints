import { SmsStatus } from "@prisma/client";
import { normalizePhone } from "@/lib/utils";

type SendSmsInput = {
  to: string;
  body: string;
};

type SendSmsResult = {
  status: SmsStatus;
  providerId?: string;
  error?: string;
};

/**
 * Sends SMS via Twilio when TWILIO_* env vars are set.
 * Otherwise simulates delivery so front-desk flows work in local demos.
 */
export async function sendSms({ to, body }: SendSmsInput): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.info(`[sms:simulated] to=${to} body=${body}`);
    return {
      status: SmsStatus.simulated,
      providerId: `sim_${Date.now()}`,
    };
  }

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: normalizePhone(to),
          From: from,
          Body: body,
        }),
      },
    );

    const data = (await response.json()) as {
      sid?: string;
      message?: string;
      error_message?: string;
    };

    if (!response.ok) {
      return {
        status: SmsStatus.failed,
        error: data.message || data.error_message || "Twilio request failed",
      };
    }

    return {
      status: SmsStatus.sent,
      providerId: data.sid,
    };
  } catch (error) {
    return {
      status: SmsStatus.failed,
      error: error instanceof Error ? error.message : "SMS send failed",
    };
  }
}
