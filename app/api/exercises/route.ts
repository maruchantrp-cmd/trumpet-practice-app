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
    return NextResponse.json(
      { error: "themeId required" },
      { status: 400 }
    );
  }

  try {
    // =========================
    // 🆕 0. theme → book取得
    // =========================
    const { data: theme, error: themeError } = await supabase
      .from("themes")
      .select("id, name, book_id")
      .eq("id", themeId)
      .single();

    if (themeError) throw themeError;

    let bookName = "";
    let themeName = theme?.name || "";

    if (theme?.book_id) {
      const { data: book, error: bookError } = await supabase
        .from("books")
        .select("name")
        .eq("id", theme.book_id)
        .single();

      if (bookError) throw bookError;

      bookName = book?.name || "";
    }

    // =========================
    // ① exercises
    // =========================
    const { data: exercises, error: exError } = await supabase
      .from("exercises")
      .select("*")
      .eq("theme_id", themeId)
      .order("index", { ascending: true });

    if (exError) throw exError;

    if (!exercises || exercises.length === 0) {
      return NextResponse.json({
        bookName,
        themeName,
        exercises: [],
      });
    }

    const exerciseIds = exercises.map((e) => e.id);

    // =========================
    // ② settings
    // =========================
    const { data: settings, error: settingError } = await supabase
      .from("exercise_settings")
      .select("*")
      .in("exercise_id", exerciseIds)
      .order("created_at", { ascending: false });

    if (settingError) throw settingError;

    const latestSettingMap = new Map<string, any>();

    for (const s of settings || []) {
      const prev = latestSettingMap.get(s.exercise_id);

      if (
        !prev ||
        new Date(s.created_at).getTime() >
          new Date(prev.created_at).getTime()
      ) {
        latestSettingMap.set(s.exercise_id, s);
      }
    }

    // =========================
    // ③ logs
    // =========================
    const { data: logs, error: logError } = await supabase
      .from("exercise_logs")
      .select("exercise_id, tempo, success")
      .in("exercise_id", exerciseIds);

    if (logError) throw logError;

    const logsMap = new Map<string, any[]>();

    for (const l of logs || []) {
      if (!logsMap.has(l.exercise_id)) {
        logsMap.set(l.exercise_id, []);
      }
      logsMap.get(l.exercise_id)!.push(l);
    }

    // =========================
    // ④ 集計
    // =========================
    const results = exercises.map((ex) => {
      const setting = latestSettingMap.get(ex.id);
      const logsForEx = logsMap.get(ex.id) || [];

      const successLogs = logsForEx.filter((l) => l.success);

      const bestTempo =
        successLogs.length > 0
          ? Math.max(...successLogs.map((l) => l.tempo))
          : 0;

      const isCleared =
        setting?.target_tempo != null &&
        bestTempo >= setting.target_tempo;

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

      return {
        id: ex.id,
        index: ex.index,
        name: ex.name,
        bestTempo,
        startTempo: setting?.start_tempo ?? null,
        targetTempo: setting?.target_tempo ?? null,
        percent,
        isCleared,
      };
    });

    // =========================
    // 🆕 最終レスポンス
    // =========================
    return NextResponse.json({
      bookName,
      themeName,
      exercises: results,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}