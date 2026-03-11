import { useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GripVertical, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useITTasks, useChangeITTaskStatus, type ITTask, type TaskStatus } from "@/hooks/it-tasks/useITTasks";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useState } from "react";

const columnConfig: { key: TaskStatus; label: string; color: string }[] = [
  { key: "todo", label: "To Do", color: "border-t-muted-foreground" },
  { key: "in_progress", label: "In Progress", color: "border-t-chart-1" },
  { key: "review", label: "Review", color: "border-t-chart-2" },
  { key: "done", label: "Done", color: "border-t-chart-3" },
];

const priorityDot: Record<string, string> = {
  critical: "bg-destructive",
  high: "bg-chart-1",
  medium: "bg-chart-2",
  low: "bg-chart-3",
};

const isOverdue = (d: string | null, s: string) => d && s !== "done" && new Date(d) < new Date(new Date().toDateString());

export default function KanbanBoard() {
  const { data: tasks = [], isLoading } = useITTasks();
  const changeStatus = useChangeITTaskStatus();
  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();
  const [dragTaskId, setDragTaskId] = useState<number | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const wasDragged = useRef(false);

  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, ITTask[]> = { todo: [], in_progress: [], review: [], done: [] };
    tasks.forEach(t => grouped[t.status]?.push(t));
    return grouped;
  }, [tasks]);

  const handleDrop = (targetCol: TaskStatus) => {
    if (dragTaskId === null) return;
    const task = tasks.find(t => t.id === dragTaskId);
    if (!task || task.status === targetCol) return;
    changeStatus.mutate({ id: task.id, status: targetCol, oldStatus: task.status, taskTitle: task.title, userName: currentUser?.name || "" });
    setDragTaskId(null);
  };

  return (
    <div className="h-full overflow-auto p-3">
      <div className="grid grid-cols-4 gap-2.5 min-h-[500px]">
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
                <p className="text-[10px] text-muted-foreground text-center py-4">No tasks</p>
              )}
              {columns[col.key].map(task => (
                <Card
                  key={task.id}
                  draggable
                  onMouseDown={e => {
                    dragStartPos.current = { x: e.clientX, y: e.clientY };
                    wasDragged.current = false;
                  }}
                  onDragStart={() => { setDragTaskId(task.id); wasDragged.current = false; }}
                  onDragEnd={() => { wasDragged.current = true; }}
                  onClick={() => {
                    if (!wasDragged.current) {
                      navigate(`/it-tasks/${task.id}`);
                    }
                    wasDragged.current = false;
                  }}
                  className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${isOverdue(task.due_date, task.status) ? "border-destructive/50" : ""}`}
                >
                  <CardContent className="p-2.5 space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-foreground flex-1 leading-tight">{task.title}</p>
                      {isOverdue(task.due_date, task.status) && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[task.priority]}`} />
                        <span className="text-[10px] text-muted-foreground capitalize">{task.priority}</span>
                      </div>
                      <span className={`text-[10px] ${isOverdue(task.due_date, task.status) ? "text-destructive" : "text-muted-foreground"}`}>
                        {task.due_date || ""}
                      </span>
                    </div>
                    {task.assignee && (
                      <div className="flex items-center gap-1">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[7px] bg-primary/10 text-primary">
                            {task.assignee.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] text-muted-foreground">{task.assignee}</span>
                      </div>
                    )}
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
