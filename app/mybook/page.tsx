"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ThemeInput = {
  name: string;
  count: string;
};

export default function MyBookPage() {
  const router = useRouter();

  const [bookName, setBookName] = useState("");
  const [author, setAuthor] = useState("");
  const [themes, setThemes] = useState<ThemeInput[]>([]);

  const addTheme = () => {
    setThemes([...themes, { name: "", count: "" }]);
  };

  const updateTheme = (index: number, key: keyof ThemeInput, value: string) => {
    const updated = [...themes];
    updated[index][key] = value;
    setThemes(updated);
  };

  const handleSave = async () => {
    if (!bookName) {
      alert("Book名は必須です");
      return;
    }

    await fetch("/api/books", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: bookName,
        author,
        themes: themes
          .filter((t) => t.name && t.count)
          .map((t) => ({
            name: t.name,
            exerciseCount: Number(t.count),
          })),
      }),
    });

    alert("保存しました！");
    router.push("/");
  };

  return (
    <div style={container}>
      {/* ===== ヘッダー ===== */}
      <div style={header}>
        <button onClick={() => router.push("/")} style={backButton}>
          ← Home
        </button>

        <h1 style={{ margin: 0 }}>MyBook登録</h1>
      </div>

      {/* ===== フォームカード ===== */}
      <div style={card}>
        <h2>Book情報</h2>

        <div style={field}>
          <label>Book名（必須）</label>
          <input
            value={bookName}
            onChange={(e) => setBookName(e.target.value)}
            placeholder="例: Clarke Studies"
            style={input}
          />
        </div>

        <div style={field}>
          <label>著者名（任意）</label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="例: Herbert L. Clarke"
            style={input}
          />
        </div>
      </div>

      {/* ===== テーマ ===== */}
      <div style={card}>
        <div style={rowBetween}>
          <h2>テーマ</h2>

          <button onClick={addTheme} style={addButton}>
            ＋ 追加
          </button>
        </div>

        {themes.length === 0 && (
          <p style={{ color: "#888" }}>テーマは未登録でもOKです</p>
        )}

        {themes.map((theme, i) => (
          <div key={i} style={themeRow}>
            <input
              placeholder="テーマ名"
              value={theme.name}
              onChange={(e) =>
                updateTheme(i, "name", e.target.value)
              }
              style={input}
            />

            <input
              type="number"
              placeholder="数"
              value={theme.count}
              onChange={(e) =>
                updateTheme(i, "count", e.target.value)
              }
              style={{ ...input, width: 80 }}
            />
          </div>
        ))}
      </div>

      {/* ===== 保存ボタン ===== */}
      <button onClick={handleSave} style={saveButton}>
        保存する
      </button>
    </div>
  );
}

/* ===== スタイル ===== */

const container: React.CSSProperties = {
  padding: 20,
  maxWidth: 500,
  margin: "0 auto",
};

const header: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 20,
};

const backButton: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "none",
  background: "#eee",
  cursor: "pointer",
};

const card: React.CSSProperties = {
  background: "#fff",
  padding: 16,
  borderRadius: 10,
  marginBottom: 16,
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
};

const field: React.CSSProperties = {
  marginBottom: 12,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 8,
  marginTop: 4,
  borderRadius: 6,
  border: "1px solid #ccc",
};

const rowBetween: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const addButton: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "none",
  background: "#1976d2",
  color: "#fff",
  cursor: "pointer",
};

const themeRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 8,
};

const saveButton: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 8,
  border: "none",
  background: "#4caf50",
  color: "#fff",
  fontSize: 16,
  cursor: "pointer",
};