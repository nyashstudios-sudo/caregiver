/**
 * Safaricom Daraja (M-Pesa) client — server-side only.
 *
 * Rails used:
 *  - OAuth 2.0 client-credentials token (cached until expiry)
 *  - STK Push (Lipa Na M-Pesa Online) — client pays the platform
 *  - B2C Payment API — platform pays a user (earnings / refunds / withdrawals)
 *
 * Security invariants:
 *  - Credentials never leave this module; nothing here runs on the client.
 *  - All amounts are KES integers computed by the caller from DB state.
 *  - Timestamps are EAT (UTC+3), formatted yyyyMMddHHmmss as Daraja requires.
 *  - Every STK push stores its checkoutRequestId so callbacks can be matched
 *    exactly once; callbacks re-verify amount server-side before crediting.
 */

const BASES = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
} as const;

type Env = keyof typeof BASES;

function env(): Env {
  return process.env.DARAJA_ENV === "production" ? "production" : "sandbox";
}

export function darajaConfigured(): boolean {
  return Boolean(
    process.env.DARAJA_CONSUMER_KEY &&
      process.env.DARAJA_CONSUMER_SECRET &&
      process.env.DARAJA_SHORTCODE &&
      process.env.DARAJA_PASSKEY
  );
}

function base(): string {
  return BASES[env()];
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Daraja misconfigured: ${name} is not set`);
  return value;
}

/** yyyyMMddHHmmss in East Africa Time (UTC+3). */
function eatTimestamp(): string {
  const eat = new Date(Date.now() + 3 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    eat.getUTCFullYear() +
    p(eat.getUTCMonth() + 1) +
    p(eat.getUTCDate()) +
    p(eat.getUTCHours()) +
    p(eat.getUTCMinutes()) +
    p(eat.getUTCSeconds())
  );
}

/**
 * Normalize Kenyan MSISDN to 2547XXXXXXXX / 2541XXXXXXXX.
 * Accepts 07…, 7…, +2547…, 2547…, 01…, 1….
 */
export function normalizeMsisdn(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  let msisdn = digits;
  if (msisdn.startsWith("254")) {
    // ok
  } else if (msisdn.startsWith("0")) {
    msisdn = "254" + msisdn.slice(1);
  } else if (msisdn.startsWith("7") || msisdn.startsWith("1")) {
    msisdn = "254" + msisdn;
  } else {
    return null;
  }
  // Safaricom mobile ranges: 2547XXXXXXXX or 2541XXXXXXXX (10 digits after 254)
  return /^254[71]\d{8}$/.test(msisdn) ? msisdn : null;
}

/* ------------------------------- OAuth token ------------------------------- */

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }

  const key = requireEnv("DARAJA_CONSUMER_KEY");
  const secret = requireEnv("DARAJA_CONSUMER_SECRET");
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");

  const res = await fetch(`${base()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Daraja OAuth failed (${res.status})`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: string | number };
  const ttlMs = Number(data.expires_in) * 1000;
  tokenCache = { token: data.access_token, expiresAt: Date.now() + ttlMs };
  return tokenCache.token;
}

/** Test helper — clears the cached OAuth token. */
export function resetDarajaToken(): void {
  tokenCache = null;
}

/* ------------------------------- STK push --------------------------------- */

export type StkPushResult = {
  checkoutRequestId: string;
  merchantRequestId: string;
  customerMessage: string;
};

/**
 * Initiate an STK Push: the customer's phone prompts them to enter their
 * M-Pesa PIN and the platform receives the money (Paybill/shortcode).
 *
 * @param msisdn  2547… phone paying
 * @param amount  KES integer (never floats — Daraja rejects decimals)
 * @param accountReference shown on the M-Pesa SMS (max 12 chars)
 */
export async function stkPush(
  msisdn: string,
  amount: number,
  accountReference: string,
  transactionDesc: string
): Promise<StkPushResult> {
  const phone = normalizeMsisdn(msisdn);
  if (!phone) throw new Error("Invalid M-Pesa phone number");
  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error("Amount must be a whole KES number of at least 1");
  }

  const shortcode = requireEnv("DARAJA_SHORTCODE");
  const passkey = requireEnv("DARAJA_PASSKEY");
  const callbackUrl = requireEnv("DARAJA_CALLBACK_URL"); // https public URL
  const timestamp = eatTimestamp();
  // Password = base64(BusinessShortCode + Passkey + Timestamp)
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

  const token = await getToken();
  const res = await fetch(`${base()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference.slice(0, 12),
      TransactionDesc: transactionDesc.slice(0, 13),
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as {
    ResponseCode?: string;
    CustomerMessage?: string;
    CheckoutRequestID?: string;
    MerchantRequestID?: string;
    errorCode?: string;
    errorMessage?: string;
  };

  if (!res.ok || data.ResponseCode !== "0" || !data.CheckoutRequestID) {
    throw new Error(
      data.errorMessage || data.errorCode || `STK push rejected (${res.status})`
    );
  }

  return {
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID ?? "",
    customerMessage: data.CustomerMessage || "Enter your M-Pesa PIN to approve the payment",
  };
}

/** Ask Daraja the fate of an STK push (used if a callback never arrives). */
export async function stkQuery(checkoutRequestId: string): Promise<{
  resultCode: number;
  resultDesc: string;
  mpesaReceipt?: string;
}> {
  const shortcode = requireEnv("DARAJA_SHORTCODE");
  const passkey = requireEnv("DARAJA_PASSKEY");
  const timestamp = eatTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  const token = await getToken();

  const res = await fetch(`${base()}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as {
    ResultCode?: string | number;
    ResultDesc?: string;
    CallbackMetadata?: { Item?: Array<{ Name: string; Value?: string | number }> };
    errorCode?: string;
    errorMessage?: string;
  };
  if (data.ResultCode === undefined) {
    throw new Error(data.errorMessage || data.errorCode || "STK query failed");
  }
  const receipt = data.CallbackMetadata?.Item?.find((i) => i.Name === "MpesaReceiptNumber")
    ?.Value;
  return {
    resultCode: Number(data.ResultCode),
    resultDesc: data.ResultDesc ?? "",
    mpesaReceipt: receipt ? String(receipt) : undefined,
  };
}

/* --------------------------------- B2C ------------------------------------ */

export type B2CResult = {
  conversationId: string;
  originatorConversationId: string;
  responseCode: string;
  responseDescription: string;
};

/**
 * B2C Payment — platform pays a user's M-Pesa wallet (withdrawals, refunds,
 * earnings payouts). Requires an initiator user + B2C security credential.
 */
export async function b2cPayment(
  msisdn: string,
  amount: number,
  remarks: string,
  occasion: string
): Promise<B2CResult> {
  const phone = normalizeMsisdn(msisdn);
  if (!phone) throw new Error("Invalid M-Pesa phone number");
  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error("Amount must be a whole KES number of at least 1");
  }

  const shortcode = requireEnv("DARAJA_SHORTCODE");
  const initiator = requireEnv("DARAJA_B2C_INITIATOR");
  const credential = requireEnv("DARAJA_B2C_SECURITY_CREDENTIAL"); // encrypted per Safaricom cert
  const callbackUrl = requireEnv("DARAJA_CALLBACK_URL");

  const token = await getToken();
  const res = await fetch(`${base()}/mpesa/b2c/v3/transfers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      InitiatorName: initiator,
      SecurityCredential: credential,
      CommandID: "BusinessPayment",
      Amount: amount,
      PartyA: shortcode,
      PartyB: phone,
      Remarks: remarks.slice(0, 12),
      Occasion: occasion.slice(0, 12),
      QueueTimeOutURL: callbackUrl,
      ResultURL: callbackUrl,
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as {
    ConversationID?: string;
    OriginatorConversationID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
    errorCode?: string;
    errorMessage?: string;
  };

  if (!res.ok || data.ResponseCode !== "0") {
    throw new Error(
      data.errorMessage || data.errorCode || `B2C transfer rejected (${res.status})`
    );
  }

  return {
    conversationId: data.ConversationID ?? "",
    originatorConversationId: data.OriginatorConversationID ?? "",
    responseCode: data.ResponseCode ?? "0",
    responseDescription: data.ResponseDescription ?? "",
  };
}
