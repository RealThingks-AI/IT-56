import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Edit, Trash2, Power, PowerOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/BackButton";
import { AssignmentRuleDialog } from "./components/AssignmentRuleDialog";

export default function AssignmentRules() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["assignment-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_automation_rules")
        .select("*")
        .eq("trigger_type", "ticket_created")
        .order("execution_order");

      if (error) throw error;
      return data;
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const { error } = await supabase
        .from("helpdesk_automation_rules")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule updated");
      queryClient.invalidateQueries({ queryKey: ["assignment-rules"] });
    },
  });

  const deleteRule = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("helpdesk_automation_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule deleted");
      queryClient.invalidateQueries({ queryKey: ["assignment-rules"] });
    },
  });

  const handleEdit = (rule: any) => {
    setSelectedRule(rule);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedRule(null);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <BackButton />
      <div className="container mx-auto py-8 px-4 max-w-5xl">
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
            <h1 className="text-3xl font-bold">Assignment Rules</h1>
            <p className="text-muted-foreground mt-2">
              Configure automatic ticket assignment and routing
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>How Assignment Rules Work</CardTitle>
            <CardDescription>
              Rules are evaluated in order when a ticket is created. The first matching rule assigns the ticket.
            </CardDescription>
          </CardHeader>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ) : rules && rules.length > 0 ? (
          <div className="space-y-3">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{rule.name}</h3>
                        <Badge variant={rule.is_active ? "default" : "secondary"}>
                          {rule.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">Order: {rule.execution_order}</Badge>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {rule.description}
                        </p>
                      )}
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Conditions:</span> {JSON.stringify(rule.conditions)}</p>
                        <p><span className="font-medium">Actions:</span> {JSON.stringify(rule.actions)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => toggleRule.mutate({ id: rule.id, isActive: rule.is_active })}
                      >
                        {rule.is_active ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (confirm("Delete this rule?")) {
                            deleteRule.mutate(rule.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No assignment rules configured</p>
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Rule
              </Button>
            </CardContent>
          </Card>
        )}

        <AssignmentRuleDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          rule={selectedRule}
        />
      </div>
    </div>
  );
}
