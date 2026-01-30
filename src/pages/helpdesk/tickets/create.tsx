import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { CreateTicketForm } from "./components/CreateTicketForm";
import { KBSuggestions } from "./components/KBSuggestions";

export default function CreateTicket() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce search query updates
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setShowSuggestions(query.length > 3);
  }, []);

  return (
    <div className="w-full px-4 py-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Create New Ticket</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Submit a new support request or incident report
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-4">
              <CreateTicketForm onSearchChange={handleSearchChange} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {showSuggestions && searchQuery && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Lightbulb className="h-4 w-4" />
                  Self-Service Solutions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <KBSuggestions searchQuery={searchQuery} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs text-muted-foreground">
              <p>• Provide a clear, specific title</p>
              <p>• Include relevant details in the description</p>
              <p>• Select the correct category</p>
              <p>• Set appropriate priority</p>
              <p>• Attach screenshots if helpful</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}