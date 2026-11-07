import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { useEffect } from "react";
import { supabaseUrl, supabaseAnonKey } from "./lib/supabase";
import ScrollToTop from "./components/feature/ScrollToTop";

// Fix chat RLS policies on startup (idempotent)
async function fixChatPolicies() {
  const alreadyRan = sessionStorage.getItem("chat_rls_fixed");
  if (alreadyRan) return;
  try {
    await fetch(`${supabaseUrl}/functions/v1/fix-chat-policies-v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ run: true }),
    });
    sessionStorage.setItem("chat_rls_fixed", "1");
  } catch (_) { /* silent */ }
}

function App() {
  useEffect(() => {
    fixChatPolicies();
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;