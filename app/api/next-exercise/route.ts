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
    return NextResponse.json({ error: "exerciseId required" }, { status: 400 });
  }

  try {
    // 現在のエクササイズ取得
    const { data: current } = await supabase
      .from("exercises")
      .select("*")
      .eq("id", exerciseId)
      .single();

    if (!current) {
      return NextResponse.json({ nextId: null });
    }

    // 同じテーマ内で次を取得
    const { data: next } = await supabase
      .from("exercises")
      .select("*")
      .eq("theme_id", current.theme_id)
      .eq("index", current.index + 1)
      .single();

    return NextResponse.json({
      nextId: next?.id || null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ nextId: null });
  }
}