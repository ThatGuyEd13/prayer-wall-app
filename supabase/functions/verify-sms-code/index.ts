// Verifies a real SMS code sent by send-sms-code, then mints a one-time
// email OTP (via the Admin API) that the client redeems immediately with
// supabase.auth.verifyOtp() to get a real signed-in session — without ever
// needing the account's password.
import { createClient } from "jsr:@supabase/supabase-js@2";

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}
function phoneToEmail(phone: string): string {
  return `phone${phone}@phone.prayerwall.local`;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }
    const { phone: rawPhone, code } = await req.json();
    const phone = normalizePhone(rawPhone || "");
    if (phone.length !== 10 || !code) {
      return new Response(JSON.stringify({ error: "Missing phone or code." }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: otp } = await asAdmin
      .from("otp_codes")
      .select("code, expires_at, consumed")
      .eq("phone", phone)
      .maybeSingle();

    if (!otp || otp.consumed || otp.code !== code || new Date(otp.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "That code isn't right or has expired." }), { status: 401 });
    }

    await asAdmin.from("otp_codes").update({ consumed: true }).eq("phone", phone);

    const email = phoneToEmail(phone);
    const { data: linkData, error: linkErr } = await asAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !linkData?.properties?.email_otp) {
      return new Response(JSON.stringify({ error: "Could not sign you in. Try again." }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ ok: true, email, emailOtp: linkData.properties.email_otp }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
