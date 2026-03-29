const courses = [
  { name: "パーソナルコース", progress: 65, level: "中級" },
  { name: "基礎マスターコース", progress: 40, level: "初級" },
  { name: "応用コース", progress: 20, level: "初級" },
  { name: "音楽コース", progress: 85, level: "上級" },
];

export default function Home() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">🎺 Trumpet Trainer</h1>

      {courses.map((course) => (
        <div
          key={course.name}
          className="p-4 rounded-2xl shadow bg-white"
        >
          <h2 className="text-lg font-semibold">{course.name}</h2>

          <div className="mt-2">
            <div className="h-3 bg-gray-200 rounded-full">
              <div
                className="h-3 bg-blue-500 rounded-full"
                style={{ width: `${course.progress}%` }}
              />
            </div>
            <p className="text-sm mt-1">
              {course.progress}% / {course.level}
            </p>
          </div>
        </div>
      ))}
    </main>
  );
}