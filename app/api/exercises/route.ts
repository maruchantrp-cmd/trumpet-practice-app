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
    // exercises取得
    const { data: exercises } = await supabase
      .from("exercises")
      .select("*")
      .eq("theme_id", themeId)
      .order("index", { ascending: true });

    const results = [];

    for (const ex of exercises || []) {
      // 最新設定
      const { data: setting } = await supabase
        .from("exercise_settings")
        .select("*")
        .eq("exercise_id", ex.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // ログ
      const { data: logs } = await supabase
        .from("exercise_logs")
        .select("*")
        .eq("exercise_id", ex.id);

      const bestTempo = logs?.length
        ? Math.max(...logs.map((l) => l.tempo))
        : 0;

      const isCleared =
        setting?.target_tempo &&
        bestTempo >= setting.target_tempo;

      let percent = 0;

      if (setting?.target_tempo && setting?.start_tempo) {
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
        startTempo: setting?.start_tempo,
        targetTempo: setting?.target_tempo,
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