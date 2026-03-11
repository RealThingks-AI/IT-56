import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, AlertCircle, Clock, ShieldCheck } from "lucide-react";

interface ConfirmationItem {
  id: string;
  asset_id: string;
  asset_tag: string;
  asset_name: string;
  response: string | null;
  deny_reason: string | null;
}

interface ConfirmationData {
  id: string;
  status: string;
  requested_at: string;
  user_name: string;
  items: ConfirmationItem[];
}

type ItemResponse = { response: "confirmed" | "denied"; deny_reason?: string };

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://iarndwlbrmjbsjvugqvr.supabase.co";

export default function ConfirmAssets() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ConfirmationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [responses, setResponses] = useState<Record<string, ItemResponse>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/asset-confirmation?token=${token}`, {
          headers: { "Accept": "application/json" },
        });
        const json = await res.json();
        if (json.expired) { setExpired(true); setLoading(false); return; }
        if (json.completed) { setAlreadyCompleted(true); setLoading(false); return; }
        if (json.error) { setError(json.error); setLoading(false); return; }
        setData(json);
        // Pre-fill all as confirmed
        const initial: Record<string, ItemResponse> = {};
        json.items.forEach((item: ConfirmationItem) => {
          initial[item.id] = { response: (item.response === "confirmed" || item.response === "denied") ? item.response : "confirmed" };
        });
        setResponses(initial);
      } catch (e: any) {
        setError(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const setItemResponse = (itemId: string, response: "confirmed" | "denied") => {
    setResponses(prev => ({
      ...prev,
      [itemId]: { response, deny_reason: response === "confirmed" ? undefined : prev[itemId]?.deny_reason },
    }));
  };

  const setDenyReason = (itemId: string, reason: string) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], deny_reason: reason },
    }));
  };

  const allResponded = data?.items.every(item => responses[item.id]?.response) ?? false;

  const handleSubmit = async () => {
    if (!token || !data) return;
    setSubmitting(true);
    try {
      const items = data.items.map(item => ({
        id: item.id,
        response: responses[item.id]?.response,
        deny_reason: responses[item.id]?.deny_reason || null,
      }));
      const res = await fetch(`${SUPABASE_URL}/functions/v1/asset-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, items }),
      });
      const json = await res.json();
      if (json.success) setSubmitted(true);
      else setError(json.error || "Submission failed");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500">Loading confirmation...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-gray-500">This confirmation link has expired. Please contact your IT administrator to send a new one.</p>
        </div>
      </div>
    );
  }

  if (alreadyCompleted || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <ShieldCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {submitted ? "Response Submitted!" : "Already Completed"}
          </h1>
          <p className="text-gray-500">
            {submitted
              ? "Thank you for confirming your assets. Your IT team has been notified."
              : "This confirmation has already been completed."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 text-white">
            <h1 className="text-xl font-bold">Asset Confirmation</h1>
            <p className="text-blue-100 text-sm mt-1">
              Hello {data.user_name}, please review and confirm the assets assigned to you.
            </p>
          </div>

          {/* Asset List */}
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-500">
              Click <strong>Confirm</strong> if you have this asset, or <strong>Deny</strong> if you don't.
              Optionally provide a reason if denying.
            </p>

            {data.items.map((item) => {
              const resp = responses[item.id];
              const isDenied = resp?.response === "denied";
              const isConfirmed = resp?.response === "confirmed";

              return (
                <div
                  key={item.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    isDenied ? "border-red-300 bg-red-50" : isConfirmed ? "border-green-300 bg-green-50" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm">{item.asset_name || "Unknown Asset"}</p>
                      <p className="text-xs text-gray-500 font-mono">{item.asset_tag || "—"}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant={isConfirmed ? "default" : "outline"}
                        className={isConfirmed ? "bg-green-600 hover:bg-green-700" : ""}
                        onClick={() => setItemResponse(item.id, "confirmed")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant={isDenied ? "destructive" : "outline"}
                        onClick={() => setItemResponse(item.id, "denied")}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Deny
                      </Button>
                    </div>
                  </div>
                  {isDenied && (
                    <Textarea
                      className="mt-3 text-sm"
                      placeholder="(Optional) Reason for denial..."
                      value={resp?.deny_reason || ""}
                      onChange={(e) => setDenyReason(item.id, e.target.value)}
                      rows={2}
                    />
                  )}
                </div>
              );
            })}

            <div className="pt-4 border-t flex items-center justify-between">
              <div className="text-xs text-gray-400">
                {data.items.length} asset{data.items.length !== 1 ? "s" : ""} to review
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!allResponded || submitting}
                className="min-w-[140px]"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</>
                ) : (
                  "Submit Response"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
