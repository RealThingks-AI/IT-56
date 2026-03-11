import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";

const ConfirmationResult = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status"); // confirmed | denied
  const asset = searchParams.get("asset");
  const count = searchParams.get("count");
  const error = searchParams.get("error"); // expired | already_completed | invalid | not_found | already_responded
  const already = searchParams.get("already"); // confirmed | denied (for already_responded)

  // Determine display config
  let icon: React.ReactNode;
  let title: string;
  let message: string;
  let accentClass: string;
  let bgClass: string;

  if (error) {
    switch (error) {
      case "expired":
        icon = <Clock className="h-12 w-12 text-amber-500" />;
        title = "Link Expired";
        message = "This confirmation link has expired. Please contact your IT department.";
        accentClass = "border-amber-500";
        bgClass = "bg-amber-50";
        break;
      case "already_completed":
        icon = <CheckCircle2 className="h-12 w-12 text-blue-500" />;
        title = "Already Completed";
        message = "All assets in this confirmation have already been responded to.";
        accentClass = "border-blue-500";
        bgClass = "bg-blue-50";
        break;
      case "already_responded":
        icon = <CheckCircle2 className="h-12 w-12 text-blue-500" />;
        title = "Already Responded";
        message = asset
          ? `Asset "${asset}" has already been ${already || "responded to"}.`
          : "This asset has already been responded to.";
        accentClass = "border-blue-500";
        bgClass = "bg-blue-50";
        break;
      case "not_found":
        icon = <XCircle className="h-12 w-12 text-destructive" />;
        title = "Asset Not Found";
        message = "This asset could not be found in the confirmation request.";
        accentClass = "border-destructive";
        bgClass = "bg-red-50";
        break;
      default:
        icon = <XCircle className="h-12 w-12 text-destructive" />;
        title = "Invalid Link";
        message = "This confirmation link is invalid or has already been used.";
        accentClass = "border-destructive";
        bgClass = "bg-red-50";
        break;
    }
  } else if (status === "confirmed") {
    icon = <CheckCircle2 className="h-12 w-12 text-green-600" />;
    accentClass = "border-green-600";
    bgClass = "bg-green-50";
    if (count) {
      title = `All ${count} Asset(s) Confirmed`;
      message = `You have successfully confirmed all ${count} asset(s) assigned to you. Thank you!`;
    } else {
      title = "Asset Confirmed";
      message = asset
        ? `You have successfully confirmed asset "${asset}". Thank you for your response.`
        : "Asset confirmed successfully.";
    }
  } else if (status === "denied") {
    icon = <XCircle className="h-12 w-12 text-destructive" />;
    accentClass = "border-destructive";
    bgClass = "bg-red-50";
    if (count) {
      title = `All ${count} Asset(s) Denied`;
      message = `You have denied all ${count} asset(s). Your IT department has been notified.`;
    } else {
      title = "Asset Denied";
      message = asset
        ? `You have denied asset "${asset}". Your IT department has been notified and will follow up.`
        : "Asset denied. Your IT department has been notified.";
    }
  } else {
    icon = <AlertTriangle className="h-12 w-12 text-amber-500" />;
    title = "Unknown Action";
    message = "Something went wrong. Please contact your IT department.";
    accentClass = "border-amber-500";
    bgClass = "bg-amber-50";
  }

  const assets = searchParams.getAll("assets");

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="bg-card rounded-xl shadow-lg max-w-md w-full overflow-hidden text-center">
        <div className={`p-6 ${bgClass} border-b-[3px] ${accentClass}`}>
          <div className="flex justify-center mb-3">{icon}</div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-[15px] text-muted-foreground leading-relaxed">{message}</p>

          {(asset || assets.length > 0) && (
            <div className="text-left bg-muted/50 rounded-lg p-3">
              <p className="text-xs font-semibold text-foreground mb-1.5">Assets:</p>
              <ul className="space-y-1">
                {asset && !assets.length && (
                  <li>
                    <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{asset}</code>
                  </li>
                )}
                {assets.map((a, i) => (
                  <li key={i}>
                    <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{a}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground/60">You can close this tab.</p>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationResult;
