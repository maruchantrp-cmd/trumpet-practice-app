import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // =========================
    // ① 全データ一括取得
    // =========================
    const [booksRes, themesRes, exercisesRes, logsRes] =
      await Promise.all([
        supabase.from("books").select("*"),
        supabase.from("themes").select("*"),
        supabase.from("exercises").select("id, theme_id"),
        supabase
          .from("exercise_logs")
          .select("exercise_id")
          .eq("success", true),
      ]);

    if (booksRes.error) throw booksRes.error;
    if (themesRes.error) throw themesRes.error;
    if (exercisesRes.error) throw exercisesRes.error;
    if (logsRes.error) throw logsRes.error;

    const books = booksRes.data || [];
    const themes = themesRes.data || [];
    const exercises = exercisesRes.data || [];
    const logs = logsRes.data || [];

    // =========================
    // ② Map化（高速化）
    // =========================

    // themeId → exercises
    const exercisesByTheme = new Map<string, string[]>();

    for (const ex of exercises) {
      if (!exercisesByTheme.has(ex.theme_id)) {
        exercisesByTheme.set(ex.theme_id, []);
      }
      exercisesByTheme.get(ex.theme_id)!.push(ex.id);
    }

    // 成功済みexerciseセット
    const clearedSet = new Set(logs.map((l) => l.exercise_id));

    // =========================
    // ③ 組み立て
    // =========================
    const result = books.map((book) => {
      const bookThemes = themes.filter((t) => t.book_id === book.id);

      let bookTotal = 0;
      let bookCleared = 0;

      const themeResults = bookThemes.map((theme) => {
        const exerciseIds = exercisesByTheme.get(theme.id) || [];

        const total = exerciseIds.length;

        let cleared = 0;
        for (const id of exerciseIds) {
          if (clearedSet.has(id)) cleared++;
        }

        bookTotal += total;
        bookCleared += cleared;

        return {
          id: theme.id,
          name: theme.name,
          total,
          cleared,
          percent:
            total === 0
              ? 0
              : Math.round((cleared / total) * 100),
        };
      });

      return {
        id: book.id,
        name: book.name,
        author: book.author,
        total: bookTotal,
        cleared: bookCleared,
        percent:
          bookTotal === 0
            ? 0
            : Math.round((bookCleared / bookTotal) * 100),
        themes: themeResults,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}