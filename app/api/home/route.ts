import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // books取得
    const { data: books, error: bookError } = await supabase
      .from("books")
      .select("*");

    if (bookError) throw bookError;

    const result = [];

    for (const book of books) {
      // themes取得
      const { data: themes } = await supabase
        .from("themes")
        .select("*")
        .eq("book_id", book.id);

      let bookTotal = 0;
      let bookCleared = 0;

      const themeResults = [];

      for (const theme of themes || []) {
        // exercises取得
        const { data: exercises } = await supabase
          .from("exercises")
          .select("id")
          .eq("theme_id", theme.id);

        const exerciseIds = exercises?.map((e) => e.id) || [];

        const total = exerciseIds.length;

        let cleared = 0;

        if (exerciseIds.length > 0) {
          const { data: logs } = await supabase
            .from("exercise_logs")
            .select("exercise_id")
            .in("exercise_id", exerciseIds)
            .eq("success", true);

          const unique = new Set(logs?.map((l) => l.exercise_id));
          cleared = unique.size;
        }

        bookTotal += total;
        bookCleared += cleared;

        themeResults.push({
          id: theme.id,
          name: theme.name,
          total,
          cleared,
          percent: total === 0 ? 0 : Math.round((cleared / total) * 100),
        });
      }

      result.push({
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
      });
    }

    return new Response(JSON.stringify(result), {
    headers: {
        "Content-Type": "application/json; charset=utf-8",
    },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}