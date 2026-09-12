// Exchanges a Google OAuth authorization code for tokens (using the Client
// Secret, which lives only here as an Edge Function secret — never on the
// client) and stores the refresh token so future exports don't need the
// user to re-authorize. Only the church owner may connect this integration.
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    const authHeader = req.headers.get("Authorization") ?? "";
    const { code, code_verifier, redirect_uri } = await req.json();
    if (!code || !code_verifier || !redirect_uri) {
      return json({ error: "Missing code, code_verifier, or redirect_uri" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client scoped to the caller's own session, so RLS/role checks apply.
    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await asCaller.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Not signed in" }, 401);
    }
    const { data: profile, error: profileErr } = await asCaller
      .from("profiles")
      .select("id, role")
      .eq("id", userData.user.id)
      .single();
    if (profileErr || profile?.role !== "owner") {
      return json({ error: "Only the church owner can connect Google Sheets" }, 403);
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri,
        grant_type: "authorization_code",
        code_verifier,
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || !tokenJson.refresh_token) {
      return json({ error: "Google token exchange failed", detail: tokenJson }, 400);
    }

    // Service-role client bypasses RLS — this table has no policies at all,
    // so only this key can write to it.
    const asAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { error: upsertErr } = await asAdmin
      .from("google_sheets_integration")
      .upsert({
        id: true,
        refresh_token: tokenJson.refresh_token,
        connected_by: userData.user.id,
      });
    if (upsertErr) {
      return json({ error: "Failed to save connection", detail: upsertErr }, 500);
    }

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
