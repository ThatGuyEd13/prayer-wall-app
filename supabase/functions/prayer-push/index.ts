// Sends a real Web Push notification to the OWNER of a request/praise when
// someone prays for it or says Hallelujah — but only if that owner is the
// church owner. Everyone else still gets the normal in-app notification
// (already inserted by pray_for() before this runs); only the owner also
// gets buzzed on their phone/laptop. VAPID keys never leave this function.
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer /, "");
    if (!jwt) {
      return json({ error: "Not signed in" }, 401);
    }

    const { request_id } = await req.json();
    if (!request_id) {
      return json({ error: "request_id is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const asAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userErr } = await asAdmin.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return json({ error: "Not signed in" }, 401);
    }

    const { data: me } = await asAdmin
      .from("profiles")
      .select("name")
      .eq("id", userData.user.id)
      .single();
    if (!me) {
      return json({ error: "Profile not found" }, 404);
    }

    const { data: request } = await asAdmin
      .from("requests")
      .select("owner_id, kind, text")
      .eq("id", request_id)
      .single();
    if (!request) {
      return json({ error: "Request not found" }, 404);
    }

    const { data: owner } = await asAdmin.from("profiles").select("role").eq("id", request.owner_id).single();
    if (owner?.role !== "owner") {
      return json({ ok: true, sent: 0, removed: 0, notOwner: true }, 200);
    }

    const title = request.kind === "praise" ? `${me.name} said Hallelujah!` : `${me.name} prayed for you`;
    const body =
      request.kind === "praise"
        ? "Hallelujah for your praise 🙌"
        : `On your request: "${String(request.text).slice(0, 60)}${String(request.text).length > 60 ? "…" : ""}"`;

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    webpush.setVapidDetails("https://the-bridge-naz-prayer-app.vercel.app", vapidPublicKey, vapidPrivateKey);

    const { data: subs } = await asAdmin
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .eq("user_id", request.owner_id);

    const payload = JSON.stringify({ title, body });
    let sent = 0;
    let removed = 0;

    await Promise.all(
      (subs || []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          sent += 1;
        } catch (err: any) {
          const status = err?.statusCode;
          if (status === 404 || status === 410) {
            await asAdmin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
            removed += 1;
          }
        }
      }),
    );

    return json({ ok: true, sent, removed }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
