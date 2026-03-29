import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const exerciseId = searchParams.get("exerciseId");

  if (!exerciseId) {
    return NextResponse.json(
      { error: "exerciseId required" },
      { status: 400 }
    );
  }

  try {
    // ===== 履歴（直近50件に制限）=====
    const { data: logs, error: logsError } = await supabase
      .from("exercise_logs")
      .select("created_at, tempo, success")
      .eq("exercise_id", exerciseId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (logsError) throw logsError;

    // ===== 成功ログから最大テンポ =====
    const successLogs = (logs || []).filter((l) => l.success);
    const maxTempo =
      successLogs.length > 0
        ? Math.max(...successLogs.map((l) => l.tempo))
        : null;

    // ===== 設定（最新1件）=====
    const { data: setting, error: settingError } = await supabase
      .from("exercise_settings")
      .select("start_tempo, target_tempo, created_at")
      .eq("exercise_id", exerciseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(); // ← singleより安全

    if (settingError) throw settingError;

    return NextResponse.json({
      logs: logs || [],
      maxTempo,
      startTempo: setting?.start_tempo ?? null,
      targetTempo: setting?.target_tempo ?? null, // ← 重要
    });
  } catch (e: any) {
    console.error("API /play error:", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}