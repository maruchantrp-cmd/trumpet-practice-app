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
      return NextResponse.json(
        { error: "Book名は必須" },
        { status: 400 }
      );
    }

    // =========================
    // ① Book作成
    // =========================
    const { data: book, error: bookError } = await supabase
      .from("books")
      .insert([{ name, author }])
      .select()
      .single();

    if (bookError) throw bookError;

    if (!themes || themes.length === 0) {
      return NextResponse.json({ success: true });
    }

    // =========================
    // ② themesを一括フィルタリング
    // =========================
    const validThemes = themes.filter(
      (t: any) => t.name && t.exerciseCount > 0
    );

    if (validThemes.length === 0) {
      return NextResponse.json({ success: true });
    }

    // =========================
    // ③ themes一括insert
    // =========================
    const { data: createdThemes, error: themeError } = await supabase
      .from("themes")
      .insert(
        validThemes.map((t: any) => ({
          book_id: book.id,
          name: t.name,
        }))
      )
      .select();

    if (themeError) throw themeError;

    // =========================
    // ④ exercisesを一括生成
    // =========================
    const exercisesToInsert: any[] = [];

    createdThemes.forEach((theme, idx) => {
      const original = validThemes[idx];

      for (let i = 1; i <= original.exerciseCount; i++) {
        exercisesToInsert.push({
          theme_id: theme.id,
          index: i,
        });
      }
    });

    // =========================
    // ⑤ exercises一括insert
    // =========================
    if (exercisesToInsert.length > 0) {
      const { error: exError } = await supabase
        .from("exercises")
        .insert(exercisesToInsert);

      if (exError) throw exError;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "server error" },
      { status: 500 }
    );
  }
}