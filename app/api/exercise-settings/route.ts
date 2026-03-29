import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { exerciseId, startTempo, targetTempo } = await req.json();

    await supabase.from("exercise_settings").insert([
      {
        exercise_id: exerciseId,
        start_tempo: startTempo,
        target_tempo: targetTempo,
      },
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}