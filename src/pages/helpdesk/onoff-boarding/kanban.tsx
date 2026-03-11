import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, UserCheck, UserMinus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkflows, useUpdateWorkflow, type OBWorkflow } from "@/hooks/onboarding/useOnboardingData";
import { format } from "date-fns";
import { toast } from "sonner";

type WFStatus = "active" | "completed" | "cancelled";

const columnConfig: { key: WFStatus; label: string; color: string }[] = [
  { key: "active", label: "Active", color: "border-t-chart-1" },
  { key: "completed", label: "Completed", color: "border-t-chart-3" },
  { key: "cancelled", label: "Cancelled", color: "border-t-muted-foreground" },
];

export default function OnOffBoardingKanban() {
  const { data: workflows = [], isLoading } = useWorkflows();
  const updateMut = useUpdateWorkflow();
  const navigate = useNavigate();
  const [dragId, setDragId] = useState<string | null>(null);
  const didDrag = useRef(false);

  const columns = useMemo(() => {
    const grouped: Record<WFStatus, OBWorkflow[]> = { active: [], completed: [], cancelled: [] };
    workflows.forEach(w => grouped[w.status]?.push(w));
    return grouped;
  }, [workflows]);

  const handleDrop = (targetCol: WFStatus) => {
    if (!dragId) return;
    const wf = workflows.find(w => w.id === dragId);
    if (!wf || wf.status === targetCol) { setDragId(null); return; }
    updateMut.mutate({ id: wf.id, status: targetCol }, {
      onSuccess: () => toast.success(`Workflow moved to ${targetCol}`),
    });
    setDragId(null);
  };

  return (
    <div className="h-full overflow-auto p-3">
      <div className="grid grid-cols-3 gap-2.5 min-h-[500px]">
        {columnConfig.map(col => (
          <div
            key={col.key}
            className={`bg-muted/30 rounded-lg border-t-4 ${col.color} flex flex-col`}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
          >
            <div className="p-2.5 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground">{col.label}</h3>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{columns[col.key].length}</Badge>
            </div>
            <div className="flex-1 px-2 pb-2 space-y-1.5 overflow-auto">
              {isLoading && <p className="text-[10px] text-muted-foreground text-center py-4">Loading...</p>}
              {!isLoading && columns[col.key].length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-4">No workflows</p>
              )}
              {columns[col.key].map(wf => (
                <Card
                  key={wf.id}
                  draggable
                  onDragStart={() => { setDragId(wf.id); didDrag.current = false; }}
                  onDrag={() => { didDrag.current = true; }}
                  onDragEnd={() => { /* didDrag stays true if dragged */ }}
                  onClick={() => {
                    if (!didDrag.current) navigate(`/onoff-boarding/workflow-detail/${wf.id}`);
                    didDrag.current = false;
                  }}
                  className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-2.5 space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-foreground flex-1 leading-tight">{wf.employee_name}</p>
                      {wf.type === "onboarding"
                        ? <UserCheck className="h-3 w-3 text-chart-3 shrink-0" />
                        : <UserMinus className="h-3 w-3 text-chart-1 shrink-0" />
                      }
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={wf.type === "onboarding" ? "default" : "secondary"} className="text-[10px]">{wf.type}</Badge>
                      <span className="text-[10px] text-muted-foreground">{wf.department || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{wf.template?.name || "No template"}</span>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(wf.created_at), "MMM d")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
