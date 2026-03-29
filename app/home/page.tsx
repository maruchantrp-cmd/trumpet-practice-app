"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Theme = {
  id: string;
  name: string;
  total: number;
  cleared: number;
  percent: number;
};

type Book = {
  id: string;
  name: string;
  author: string;
  total: number;
  cleared: number;
  percent: number;
  themes: Theme[];
};

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/home")
      .then((res) => res.json())
      .then(setBooks);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      {/* ===== ヘッダー ===== */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1>Home</h1>

        {/* 👇 追加ポイント */}
        <button
          onClick={() => router.push("/mybook")}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "none",
            background: "#1976d2",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          MyBookへ
        </button>
      </div>

      {books.map((book) => (
        <div
          key={book.id}
          style={{
            border: "1px solid #ccc",
            borderRadius: 10,
            padding: 16,
            marginBottom: 24,
            background: "#fff",
          }}
        >
          {/* ===== Book情報 ===== */}
          <h2 style={{ marginBottom: 8 }}>
            {book.name}
            {book.author && (
              <span style={{ fontSize: 14, color: "#666" }}>
                {" "}
                / {book.author}
              </span>
            )}
          </h2>

          {/* ===== 全体進捗 ===== */}
          <ProgressBar percent={book.percent} />

          <p style={{ marginTop: 4, fontSize: 14 }}>
            {book.cleared} / {book.total}（{book.percent}%）
          </p>

          {/* ===== テーマ一覧 ===== */}
          <div style={{ marginTop: 16 }}>
            {book.themes.map((theme) => (
              <div
                key={theme.id}
                onClick={() =>
                  router.push(`/exercises?themeId=${theme.id}`)
                }
                style={{
                  marginBottom: 12,
                  padding: 10,
                  borderRadius: 6,
                  background: "#fafafa",
                  cursor: "pointer",
                  transition: "0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f0f0f0")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#fafafa")
                }
              >
                <strong>{theme.name}</strong>

                <ProgressBar percent={theme.percent} />

                <p style={{ marginTop: 4, fontSize: 13 }}>
                  {theme.cleared} / {theme.total}（{theme.percent}%）
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== プログレスバー ===== */
function ProgressBar({ percent }: { percent: number }) {
  const color =
    percent === 100
      ? "#4caf50"
      : percent > 50
      ? "#8bc34a"
      : percent > 20
      ? "#ffc107"
      : "#f44336";

  return (
    <div
      style={{
        background: "#eee",
        height: 10,
        width: "100%",
        borderRadius: 5,
        overflow: "hidden",
        marginTop: 4,
      }}
    >
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          background: color,
          transition: "0.3s",
        }}
      />
    </div>
  );
}