import { useEffect, useState } from "react";

export default function App() {
  const [toast, setToast] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // مثال (تنجم تبدلو بـ Supabase متاعك)
  useEffect(() => {
    // تجربة إشعار بعد 2 ثواني
    setTimeout(() => {
      setToast("🔔 هذا Toast تجريبي");
    }, 2000);

    // يختفي بعد 3 ثواني
    setTimeout(() => {
      setToast(null);
    }, 5000);
  }, []);

  return (
    <div className="min-h-screen pb-20">

      {/* Notification في الوسط */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-black text-white px-5 py-3 rounded-xl">
            {notification}
          </div>
        </div>
      )}

      {/* ✅ Toast في اليمين */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: "#1e293b",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
            zIndex: 9999,
            fontSize: "14px"
          }}
        >
          🔔 {toast}
        </div>
      )}

      {/* محتوى الصفحة */}
      <div style={{ padding: "20px" }}>
        <h1>مرحبا 👋</h1>

        <button
          onClick={() => setToast("تم الضغط على الزر")}
          style={{
            padding: "10px 15px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          جرّب Toast
        </button>
      </div>

    </div>
  );
}