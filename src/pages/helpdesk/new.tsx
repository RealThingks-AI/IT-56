import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTicketDialog } from "@/components/helpdesk/CreateTicketDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NewTicket() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(true);

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      navigate("/helpdesk");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/helpdesk")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create New Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Fill out the form to submit a new helpdesk ticket. Our team will respond as soon as possible.
            </p>
          </CardContent>
        </Card>

        <CreateTicketDialog open={dialogOpen} onOpenChange={handleOpenChange} />
      </div>
    </div>
  );
}
