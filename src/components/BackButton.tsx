import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const BackButton = () => {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate(-1)}
      className="fixed left-4 z-40 h-8 w-8 hover:bg-accent opacity-0 hover:opacity-100 transition-opacity duration-200"
      style={{ top: "calc((52px - 32px) / 2)" }}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
};
