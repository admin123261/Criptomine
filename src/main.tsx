import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { loadFromSupabase } from "./supabaseSync";
import App from "./App";

// تحميل البيانات من Supabase أولاً ثم تشغيل التطبيق
loadFromSupabase().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
