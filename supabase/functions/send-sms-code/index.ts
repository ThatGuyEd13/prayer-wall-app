// Sends a real 6-digit SMS code via Twilio to a phone that already has an
// account (the "Text a code to this number" sign-in path — not for new
// sign-ups). Twilio credentials never leave this function.
import { createClient } from "jsr:@supabase/supabase-js@2";

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }
    const { phone: rawPhone } = await req.json();
    const phone = normalizePhone(rawPhone || "");
    if (phone.length !== 10) {
      return new Response(JSON.stringify({ error: "Enter a 10-digit phone number." }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profile } = await asAdmin.from("profiles").select("id").eq("phone", phone).maybeSingle();
    if (!profile) {
      return new Response(
        JSON.stringify({ error: "We don't have that number on file. Ask the church office to add you, or check the digits." }),
        { status: 404 },
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: upsertErr } = await asAdmin
      .from("otp_codes")
      .upsert({ phone, code, expires_at: expiresAt, consumed: false });
    if (upsertErr) {
      return new Response(JSON.stringify({ error: "Could not generate a code. Try again." }), { status: 500 });
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER")!;

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: `+1${phone}`,
          From: fromNumber,
          Body: `Your Prayer Wall code is ${code}. It expires in 10 minutes.`,
        }),
      },
    );
    const twilioJson = await twilioRes.json();
    if (!twilioRes.ok) {
      return new Response(
        JSON.stringify({ error: "Could not send the text.", detail: twilioJson.message || twilioJson }),
        { status: 502 },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
