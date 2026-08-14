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

const NKOMO_SEND_URL =
  process.env.NKOMO_SMS_API_URL ||
  "https://app.nkomosms.com/api/v3/sms/send";

function nkomoConfigured() {
  return Boolean(
    process.env.NKOMO_SMS_API_TOKEN && process.env.NKOMO_SMS_SENDER_ID,
  );
}

function twilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

export function isLiveSmsConfigured() {
  return nkomoConfigured() || twilioConfigured();
}

/** Nkomo/Ultimate SMS expects international numbers without a plus, e.g. 233244123456 */
function toNkomoRecipient(phone: string) {
  return normalizePhone(phone).replace(/^\+/, "");
}

async function sendViaNkomo({ to, body }: SendSmsInput): Promise<SendSmsResult> {
  const token = process.env.NKOMO_SMS_API_TOKEN!;
  const senderId = process.env.NKOMO_SMS_SENDER_ID!;
  const recipient = toNkomoRecipient(to);

  const response = await fetch(NKOMO_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient,
      sender_id: senderId,
      type: "plain",
      message: body,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    status?: string;
    message?: string | string[];
    data?: { uid?: string; id?: string };
  };

  const errorText = Array.isArray(data.message)
    ? data.message.join(" ")
    : data.message;

  if (!response.ok || data.status === "error") {
    return {
      status: SmsStatus.failed,
      error: errorText || "Nkomo SMS request failed",
    };
  }

  return {
    status: SmsStatus.sent,
    providerId: data.data?.uid || data.data?.id,
  };
}

async function sendViaTwilio({ to, body }: SendSmsInput): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;
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
}

/**
 * Sends SMS via Nkomo SMS when NKOMO_SMS_* env vars are set.
 * Falls back to Twilio, then simulated delivery for local demos.
 */
export async function sendSms({ to, body }: SendSmsInput): Promise<SendSmsResult> {
  try {
    if (nkomoConfigured()) return await sendViaNkomo({ to, body });
    if (twilioConfigured()) return await sendViaTwilio({ to, body });
  } catch (error) {
    return {
      status: SmsStatus.failed,
      error: error instanceof Error ? error.message : "SMS send failed",
    };
  }

  console.info(`[sms:simulated] to=${to} body=${body}`);
  return {
    status: SmsStatus.simulated,
    providerId: `sim_${Date.now()}`,
  };
}
