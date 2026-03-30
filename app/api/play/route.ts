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
    // =========================
    // 🆕 0. exercise → theme → book 情報取得
    // =========================
    const { data: exercise, error: exError } = await supabase
      .from("exercises")
      .select("id, index, theme_id")
      .eq("id", exerciseId)
      .single();

    if (exError) throw exError;

    let themeName = "";
    let bookName = "";

    if (exercise?.theme_id) {
      const { data: theme, error: themeError } = await supabase
        .from("themes")
        .select("id, name, book_id")
        .eq("id", exercise.theme_id)
        .single();

      if (themeError) throw themeError;

      themeName = theme?.name || "";

      if (theme?.book_id) {
        const { data: book, error: bookError } = await supabase
          .from("books")
          .select("name")
          .eq("id", theme.book_id)
          .single();

        if (bookError) throw bookError;

        bookName = book?.name || "";
      }
    }

    // =========================
    // ① 履歴（直近50件）
    // =========================
    const { data: logs, error: logsError } = await supabase
      .from("exercise_logs")
      .select("created_at, tempo, success")
      .eq("exercise_id", exerciseId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (logsError) throw logsError;

    // =========================
    // ② 成功ログ → 最大テンポ
    // =========================
    const successLogs = (logs || []).filter((l) => l.success);
    const maxTempo =
      successLogs.length > 0
        ? Math.max(...successLogs.map((l) => l.tempo))
        : null;

    // =========================
    // ③ 設定（最新1件）
    // =========================
    const { data: setting, error: settingError } = await supabase
      .from("exercise_settings")
      .select("start_tempo, target_tempo, created_at")
      .eq("exercise_id", exerciseId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (settingError) throw settingError;

    // =========================
    // 🆕 最終レスポンス
    // =========================
    return NextResponse.json({
      logs: logs || [],
      maxTempo,
      startTempo: setting?.start_tempo ?? null,
      targetTempo: setting?.target_tempo ?? null,

      // 👇 追加情報
      bookName,
      themeName,
      exerciseIndex: exercise?.index ?? null,
    });
  } catch (e: any) {
    console.error("API /play error:", e);
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}