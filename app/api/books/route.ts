import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, author, themes } = body;

    if (!name) {
      return NextResponse.json({ error: "Book名は必須" }, { status: 400 });
    }

    // ① Book作成
    const { data: book, error: bookError } = await supabase
      .from("books")
      .insert([{ name, author }])
      .select()
      .single();

    if (bookError) throw bookError;

    // ② テーマ＆エクササイズ作成
    if (themes && themes.length > 0) {
      for (const theme of themes) {
        // 👇 空テーマは無視
        if (!theme.name || theme.exerciseCount <= 0) continue;

        const { data: createdTheme, error: themeError } = await supabase
          .from("themes")
          .insert([
            {
              book_id: book.id,
              name: theme.name,
            },
          ])
          .select()
          .single();

        if (themeError) throw themeError;

        // エクササイズ生成
        const exercises = [];
        for (let i = 1; i <= theme.exerciseCount; i++) {
          exercises.push({
            theme_id: createdTheme.id,
            index: i,
          });
        }

        const { error: exError } = await supabase
          .from("exercises")
          .insert(exercises);

        if (exError) throw exError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}