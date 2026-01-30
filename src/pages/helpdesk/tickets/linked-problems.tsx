import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Plus, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/BackButton";
import { Badge } from "@/components/ui/badge";
import { CreateProblemDialog } from "@/components/helpdesk/CreateProblemDialog";

export default function LinkedProblems() {
  const navigate = useNavigate();
  const [createProblemOpen, setCreateProblemOpen] = useState(false);

  const { data: problems, isLoading } = useQuery({
    queryKey: ["problems-with-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_problems")
        .select(`
          *,
          category:helpdesk_categories(name),
          linked_tickets:helpdesk_problem_tickets(
            ticket:helpdesk_tickets(id, ticket_number, title, status)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-500";
      case "investigating":
        return "bg-yellow-500";
      case "resolved":
        return "bg-green-500";
      case "closed":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <BackButton />
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/helpdesk/tickets")}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tickets
            </Button>
            <h1 className="text-3xl font-bold">Problems Management</h1>
            <p className="text-muted-foreground mt-2">
              Track and manage recurring issues and their root causes
            </p>
          </div>
          <Button onClick={() => setCreateProblemOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Problem
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ) : problems && problems.length > 0 ? (
          <div className="space-y-4">
            {problems.map((problem: any) => (
              <Card key={problem.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="font-mono">
                          {problem.problem_number}
                        </Badge>
                        <Badge className={getStatusColor(problem.status)}>
                          {problem.status}
                        </Badge>
                        {problem.priority && (
                          <Badge
                            className={
                              problem.priority === "urgent"
                                ? "bg-red-500"
                                : problem.priority === "high"
                                ? "bg-orange-500"
                                : problem.priority === "medium"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }
                          >
                            {problem.priority}
                          </Badge>
                        )}
                        {problem.category && (
                          <Badge variant="outline">{problem.category.name}</Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{problem.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {problem.description?.substring(0, 200)}
                        {problem.description?.length > 200 ? "..." : ""}
                      </p>

                      {problem.root_cause && (
                        <div className="mb-2">
                          <span className="text-sm font-medium">Root Cause: </span>
                          <span className="text-sm text-muted-foreground">
                            {problem.root_cause}
                          </span>
                        </div>
                      )}

                      {problem.workaround && (
                        <div className="mb-2">
                          <span className="text-sm font-medium">Workaround: </span>
                          <span className="text-sm text-muted-foreground">
                            {problem.workaround}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Linked Tickets */}
                  {problem.linked_tickets && problem.linked_tickets.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Linked Tickets ({problem.linked_tickets.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {problem.linked_tickets.map((link: any) => {
                          const ticket = link.ticket;
                          if (!ticket) return null;
                          return (
                            <Button
                              key={ticket.id}
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/helpdesk/tickets/${ticket.id}`)}
                            >
                              {ticket.ticket_number}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No problems tracked yet</p>
              <Button onClick={() => setCreateProblemOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Problem
              </Button>
            </CardContent>
          </Card>
        )}

        <CreateProblemDialog open={createProblemOpen} onOpenChange={setCreateProblemOpen} />
      </div>
    </div>
  );
}
