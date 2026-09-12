// Sends a real Web Push notification to every subscribed device when a
// church-wide notice goes out — this is the one push type everyone gets,
// not just the owner. Called right after send_broadcast() has already
// inserted the in-app notification rows. VAPID keys never leave this
// function.
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

    const { body } = await req.json();
    const text = String(body || "").trim();
    if (!text) {
      return json({ error: "Notice text is required" }, 400);
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
      .select("name,role")
      .eq("id", userData.user.id)
      .single();
    const allowedRoles = ["lead_pastor", "owner", "agricultural_minister", "worship_minister"];
    if (!me || !allowedRoles.includes(me.role)) {
      return json(
        { error: "Only the lead pastor, owner, or a specialty minister can send a church-wide notice" },
        403,
      );
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    webpush.setVapidDetails("https://the-bridge-naz-prayer-app.vercel.app", vapidPublicKey, vapidPrivateKey);

    const { data: subs } = await asAdmin.from("push_subscriptions").select("endpoint,p256dh,auth");

    const payload = JSON.stringify({ title: `Notice from ${me.name}`, body: text });
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
