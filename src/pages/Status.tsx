import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Status = () => {
  const navigate = useNavigate();
  const [sessionStatus, setSessionStatus] = useState<string>("Checking...");
  const [storageStatus, setStorageStatus] = useState<string>("Checking...");

  useEffect(() => {
    // Check localStorage availability
    try {
      localStorage.setItem("__test__", "1");
      localStorage.removeItem("__test__");
      setStorageStatus("Available");
    } catch {
      setStorageStatus("Blocked (using in-memory fallback)");
    }

    // Check Supabase session
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          setSessionStatus(`Error: ${error.message}`);
        } else if (data.session) {
          setSessionStatus(`Authenticated as ${data.session.user.email}`);
        } else {
          setSessionStatus("No active session");
        }
      })
      .catch((err) => {
        setSessionStatus(`Failed: ${err.message}`);
      });
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      fontFamily: "Inter, system-ui, sans-serif",
      backgroundColor: "#0f172a",
      color: "#f1f5f9"
    }}>
      <div style={{
        maxWidth: "400px",
        width: "100%",
        textAlign: "center"
      }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          RT-IT-Hub Status
        </h1>
        <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
          Diagnostic page
        </p>

        <div style={{
          backgroundColor: "#1e293b",
          padding: "1.5rem",
          borderRadius: "0.75rem",
          textAlign: "left",
          marginBottom: "1.5rem"
        }}>
          <div style={{ marginBottom: "1rem" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>React Mounted:</span>
            <span style={{ color: "#22c55e", marginLeft: "0.5rem" }}>✓ Yes</span>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Current Path:</span>
            <span style={{ color: "#f1f5f9", marginLeft: "0.5rem" }}>{window.location.pathname}</span>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>localStorage:</span>
            <span style={{ color: "#f1f5f9", marginLeft: "0.5rem" }}>{storageStatus}</span>
          </div>
          <div>
            <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Session:</span>
            <span style={{ color: "#f1f5f9", marginLeft: "0.5rem", wordBreak: "break-word" }}>{sessionStatus}</span>
          </div>
        </div>

        <Button onClick={() => navigate("/login")} className="w-full">
          Go to Login
        </Button>
      </div>
    </div>
  );
};

export default Status;
