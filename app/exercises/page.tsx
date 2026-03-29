"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Exercise = {
  id: string;
  index: number;
  name: string;
  bestTempo: number;
  startTempo?: number | null;
  targetTempo?: number | null;
  percent: number;
  isCleared: boolean;
};

export default function ExercisesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <ExercisesInner />
    </Suspense>
  );
}

function ExercisesInner() {
  const params = useSearchParams();
  const router = useRouter();
  const themeId = params.get("themeId");

  const [data, setData] = useState<Exercise[]>([]);

  useEffect(() => {
    if (!themeId) return;

    fetch(`/api/exercises?themeId=${themeId}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((res) => {
        console.log("API result:", res);
        setData(res);
      });
  }, [themeId]);

  const goHome = () => {
    router.push("/");
  };

  const handleClick = (ex: Exercise) => {
    router.push(`/play?exerciseId=${ex.id}&themeId=${themeId}`);
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      {/* ===== ヘッダー ===== */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <button style={homeButton} onClick={goHome}>
          🏠 Home
        </button>

        <h1 style={{ margin: 0 }}>エクササイズ一覧</h1>
      </div>

      {/* ===== 一覧 ===== */}
      {data.map((ex) => (
        <div
          key={ex.id}
          onClick={() => handleClick(ex)}
          style={card}
        >
          {/* タイトル */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                marginRight: 8,
                color: ex.isCleared ? "#22c55e" : "#ccc",
                fontSize: 18,
              }}
            >
              ✔
            </span>

            <strong>
              No.{ex.index} {ex.name}
            </strong>
          </div>

          {/* テンポ */}
          <div style={{ marginTop: 8 }}>
            {ex.targetTempo ? (
              <>
                <ProgressBar percent={ex.percent} />

                <p style={{ marginTop: 4 }}>
                  {ex.bestTempo} / {ex.targetTempo}
                </p>
              </>
            ) : (
              <p style={{ color: "#888" }}>目標未設定</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== UI ===== */

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div style={bar}>
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          background: "#22c55e",
          borderRadius: 6,
        }}
      />
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
  background: "#fff",
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
};

const bar: React.CSSProperties = {
  background: "#eee",
  height: 10,
  borderRadius: 6,
};

const homeButton: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
};