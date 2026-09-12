// Pushes the prayer log into the church's connected Google Sheet, creating
// the sheet on first use. Requires google-oauth-connect to have run first.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SHEET_TITLE = "Prayer Wall — Prayer Log";
const HEADER = ["Name", "Date", "Tag", "Audience", "Kind", "Prayed", "Request"];

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

async function refreshAccessToken(refreshToken: string) {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const resJson = await res.json();
  if (!res.ok) throw new Error("Failed to refresh Google access token: " + JSON.stringify(resJson));
  return resJson.access_token as string;
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await asCaller.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Not signed in" }, 401);
    }

    // export_prayer_log() itself re-checks that the caller is lead_pastor
    // or owner, and raises an exception (surfaced as a Postgres error) if not.
    const { data: rows, error: rpcErr } = await asCaller.rpc("export_prayer_log");
    if (rpcErr) {
      return json({ error: rpcErr.message }, 403);
    }

    const asAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: integration, error: integrationErr } = await asAdmin
      .from("google_sheets_integration")
      .select("refresh_token, spreadsheet_id")
      .eq("id", true)
      .maybeSingle();
    if (integrationErr || !integration) {
      return json({ error: "not_connected", message: "Google Sheets isn't connected yet." }, 409);
    }

    const accessToken = await refreshAccessToken(integration.refresh_token);

    let spreadsheetId = integration.spreadsheet_id as string | null;
    if (!spreadsheetId) {
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ properties: { title: SHEET_TITLE } }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) {
        return json({ error: "Failed to create spreadsheet", detail: createJson }, 500);
      }
      spreadsheetId = createJson.spreadsheetId;
      await asAdmin
        .from("google_sheets_integration")
        .update({ spreadsheet_id: spreadsheetId })
        .eq("id", true);
    }

    const values = [
      HEADER,
      ...rows.map((r: Record<string, unknown>) => [
        r.owner_name,
        new Date(r.created_at as string).toLocaleString(),
        r.tag,
        r.audience === "church" ? "Whole church" : "Pastors only",
        r.kind,
        r.prayed ? "Yes" : "No",
        r.request_text,
      ]),
    ];

    // Clear the sheet first so a shrinking log doesn't leave stale rows.
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:Z:clear`,
      { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      },
    );
    if (!updateRes.ok) {
      const detail = await updateRes.json();
      return json({ error: "Failed to write rows", detail }, 500);
    }

    return json(
      {
        ok: true,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        rowCount: rows.length,
      },
      200,
    );
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
