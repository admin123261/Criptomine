import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { loadFromSupabase, restoreAuthSession } from "./supabaseSync";
import App from "./App";

// تحميل البيانات من Supabase + استعادة الجلسة ثم تشغيل التطبيق
async function init() {
  try {
    await loadFromSupabase();
    await restoreAuthSession();
  } catch { /* صامت */ }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

init();
