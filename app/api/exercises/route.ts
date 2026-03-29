import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const themeId = searchParams.get("themeId");

  if (!themeId) {
    return NextResponse.json({ error: "themeId required" }, { status: 400 });
  }

  try {
    // ===== exercises =====
    const { data: exercises, error: exError } = await supabase
      .from("exercises")
      .select("*")
      .eq("theme_id", themeId)
      .order("index", { ascending: true });

    if (exError) throw exError;

    const results = [];

    for (const ex of exercises || []) {
      // ===== 最新設定 =====
      const { data: setting } = await supabase
        .from("exercise_settings")
        .select("*")
        .eq("exercise_id", ex.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // ===== ログ =====
      const { data: logs, error: logError } = await supabase
        .from("exercise_logs")
        .select("tempo, success")
        .eq("exercise_id", ex.id);

      if (logError) throw logError;

      // ★ 成功ログだけ抽出
      const successLogs = logs?.filter((l) => l.success) || [];

      // ★ 成功した中で最大
      const bestTempo =
        successLogs.length > 0
          ? Math.max(...successLogs.map((l) => l.tempo))
          : 0;

      // ★ 安全なクリア判定
      const isCleared =
        setting?.target_tempo != null &&
        bestTempo >= setting.target_tempo;

      // ===== 進捗 =====
      let percent = 0;

      if (
        setting?.target_tempo != null &&
        setting?.start_tempo != null &&
        setting.target_tempo > setting.start_tempo
      ) {
        percent =
          ((bestTempo - setting.start_tempo) /
            (setting.target_tempo - setting.start_tempo)) *
          100;

        percent = Math.max(0, Math.min(100, Math.round(percent)));
      }

      results.push({
        id: ex.id,
        index: ex.index,
        name: ex.name,
        bestTempo,
        startTempo: setting?.start_tempo ?? null,
        targetTempo: setting?.target_tempo ?? null,
        percent,
        isCleared,
      });
    }

    return NextResponse.json(results);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}