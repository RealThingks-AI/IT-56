import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useITTasks, useChangeITTaskStatus, type TaskStatus } from "@/hooks/it-tasks/useITTasks";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const priorityColor: Record<string, string> = { critical: "destructive", high: "default", medium: "secondary", low: "outline" };
const statusOptions: TaskStatus[] = ["todo", "in_progress", "review", "done"];
const statusLabel: Record<string, string> = { todo: "To Do", in_progress: "In Progress", review: "Review", done: "Done" };

const isOverdue = (d: string | null, s: string) => d && s !== "done" && new Date(d) < new Date(new Date().toDateString());

export default function MyTasks() {
  const { data: tasks = [], isLoading } = useITTasks();
  const changeStatus = useChangeITTaskStatus();
  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const myTasks = useMemo(() => {
    const name = currentUser?.name?.toLowerCase() || "";
    const userId = currentUser?.id || "";
    return tasks.filter(t => {
      // Match by assignee name (case-insensitive) OR by created_by user ID
      const assigneeMatch = name && t.assignee && t.assignee.toLowerCase() === name;
      const creatorMatch = userId && t.created_by === userId;
      if (!assigneeMatch && !creatorMatch) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, currentUser, search, statusFilter, priorityFilter]);

  return (
    <div className="h-full overflow-auto p-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-[220px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-7 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statusOptions.map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">({myTasks.length} tasks)</span>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
              )}
              {!isLoading && myTasks.map(t => (
                <TableRow key={t.id} className={isOverdue(t.due_date, t.status) ? "bg-destructive/5" : ""}>
                  <TableCell className="font-medium py-1.5">
                    <div className="flex items-center gap-1">
                      <button className="hover:underline text-left text-primary" onClick={() => navigate(`/it-tasks/${t.id}`)}>{t.title}</button>
                      {isOverdue(t.due_date, t.status) && <AlertTriangle className="h-3 w-3 text-destructive" />}
                    </div>
                  </TableCell>
                  <TableCell className="py-1.5"><Badge variant={priorityColor[t.priority] as any}>{t.priority}</Badge></TableCell>
                  <TableCell className="py-1.5">
                    <Select value={t.status} onValueChange={v => changeStatus.mutate({ id: t.id, status: v as TaskStatus, oldStatus: t.status, taskTitle: t.title, userName: currentUser?.name || "" })}>
                      <SelectTrigger className="w-[110px] h-6 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground py-1.5">{t.category}</TableCell>
                  <TableCell className={`py-1.5 ${isOverdue(t.due_date, t.status) ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                    {t.due_date || "—"}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && myTasks.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No tasks assigned to you</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
