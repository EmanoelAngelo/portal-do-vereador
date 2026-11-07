import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function EmpresaPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/sistema/painel/empresa", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D1629" }}>
      <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(59,191,212,0.3)", borderTopColor: "#3BBFD4" }}></div>
    </div>
  );
}