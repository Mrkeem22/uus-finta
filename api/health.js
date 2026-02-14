// api/health.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anon) {
      return res.status(500).json({ ok: false, error: "Missing SUPABASE env" });
    }

    const supabase = createClient(url, anon);
    const { data, error } = await supabase.from("profiles").select("id").limit(1);

    return res.status(200).json({ ok: true, hasProfilesTable: true, rows: data?.length || 0, error: error?.message || null });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
