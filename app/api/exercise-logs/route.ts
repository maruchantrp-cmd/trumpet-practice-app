import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { exerciseId, tempo, success } = await req.json();

    if (!exerciseId || !tempo) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    const { error } = await supabase.from("exercise_logs").insert([
      {
        exercise_id: exerciseId,
        tempo,
        success,
      },
    ]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}