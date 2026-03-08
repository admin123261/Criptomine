import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./supabaseSync"; // مزامنة تلقائية مع Supabase
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
