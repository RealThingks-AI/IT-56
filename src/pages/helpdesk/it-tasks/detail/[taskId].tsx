import { useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BackButton } from "@/components/BackButton";
import {
  MessageSquare, Paperclip, Activity, Calendar, User, Tag, Clock, Trash2,
  Download, Upload, Send, Lock, AlertTriangle, FileText, Pencil, Check, X
} from "lucide-react";
import { useITTasks, useChangeITTaskStatus, useDeleteITTask, useUpdateITTask, type TaskStatus } from "@/hooks/it-tasks/useITTasks";
import { useITTaskActivity, type ITTaskActivity } from "@/hooks/it-tasks/useITTasks";
import {
  useITTaskComments, useAddITTaskComment,
  useITTaskAttachments, useUploadITTaskAttachment, useDeleteITTaskAttachment,
  type ITTaskAttachment,
} from "@/hooks/it-tasks/useITTaskDetail";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const priorityColor: Record<string, string> = { critical: "destructive", high: "default", medium: "secondary", low: "outline" };
const statusLabel: Record<string, string> = { todo: "To Do", in_progress: "In Progress", review: "Review", done: "Done" };
const statusOptions: TaskStatus[] = ["todo", "in_progress", "review", "done"];
const isOverdue = (d: string | null, s: string) => d && s !== "done" && new Date(d) < new Date(new Date().toDateString());

export default function ITTaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useITTasks();
  const { data: currentUser } = useCurrentUser();
  const changeStatus = useChangeITTaskStatus();
  const deleteTask = useDeleteITTask();
  const updateTask = useUpdateITTask();

  const taskNum = taskId ? Number(taskId) : NaN;
  const safeTaskNum = Number.isNaN(taskNum) ? undefined : taskNum;
  const task = useMemo(() => tasks.find(t => t.id === taskNum), [tasks, taskNum]);

  // Inline edit state
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (field: string, currentValue: string) => {
    setEditField(field);
    setEditValue(currentValue || "");
  };

  const cancelEdit = () => {
    setEditField(null);
    setEditValue("");
  };

  const saveEdit = (field: string) => {
    if (!task) return;
    const payload: Record<string, any> = { id: task.id, userName: currentUser?.name || "" };
    if (field === "due_date") {
      payload[field] = editValue || null;
    } else {
      payload[field] = editValue;
    }
    updateTask.mutate(payload as any);
    cancelEdit();
  };

  // Comments
  const { data: comments = [] } = useITTaskComments(safeTaskNum);
  const addComment = useAddITTaskComment();
  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  // Attachments
  const { data: attachments = [] } = useITTaskAttachments(safeTaskNum);
  const uploadAttachment = useUploadITTaskAttachment();
  const deleteAttachment = useDeleteITTaskAttachment();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteAttachmentId, setDeleteAttachmentId] = useState<ITTaskAttachment | null>(null);

  // Activity (filtered to this task)
  const { data: allActivity = [] } = useITTaskActivity();
  const activity = useMemo(() => allActivity.filter(a => a.task_id === safeTaskNum), [allActivity, safeTaskNum]);

  // Delete task confirm
  const [showDelete, setShowDelete] = useState(false);

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (!task) return;
    changeStatus.mutate({ id: task.id, status: newStatus, oldStatus: task.status, taskTitle: task.title, userName: currentUser?.name || "" });
  };

  const handleDelete = () => {
    if (!task) return;
    deleteTask.mutate({ id: task.id, taskTitle: task.title, userName: currentUser?.name || "" }, {
      onSuccess: () => navigate("/it-tasks/all"),
    });
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !taskNum) return;
    addComment.mutate({
      task_id: taskNum,
      comment: commentText,
      user_name: currentUser?.name || "",
      user_id: currentUser?.id,
      is_internal: isInternal,
      task_title: task?.title || "",
    });
    setCommentText("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskNum) return;
    uploadAttachment.mutate({
      task_id: taskNum,
      file,
      uploaded_by: currentUser?.name || "",
      task_title: task?.title || "",
    });
    e.target.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="h-full p-6">
        <BackButton />
        <p className="text-muted-foreground mt-4">Task not found.</p>
      </div>
    );
  }

  const renderEditableField = (field: string, label: string, currentValue: string, icon: React.ReactNode, isDate?: boolean) => {
    const isEditing = editField === field;
    return (
      <div className="flex items-center gap-2 group">
        {icon}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground">{label}</p>
          {isEditing ? (
            <div className="flex items-center gap-1 mt-0.5">
              <Input
                type={isDate ? "date" : "text"}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="h-6 text-xs px-1.5"
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter") saveEdit(field);
                  if (e.key === "Escape") cancelEdit();
                }}
              />
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => saveEdit(field)}>
                <Check className="h-3 w-3 text-chart-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={cancelEdit}>
                <X className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <p className={`text-xs ${field === "due_date" && isOverdue(task.due_date, task.status) ? "text-destructive font-medium" : "text-foreground"}`}>
                {currentValue || (field === "due_date" ? "No due date" : "Unassigned")}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => startEdit(field, currentValue)}
              >
                <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-auto p-3 space-y-3">
      <BackButton />

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap group">
            {editField === "title" ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="h-7 text-lg font-semibold"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === "Enter") saveEdit("title");
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => saveEdit("title")}>
                  <Check className="h-3.5 w-3.5 text-chart-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}>
                  <X className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-lg font-semibold text-foreground">{task.title}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => startEdit("title", task.title)}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              </>
            )}
            {editField === "priority" ? (
              <Select value={editValue} onValueChange={v => {
                if (!task) return;
                updateTask.mutate({ id: task.id, priority: v as any, userName: currentUser?.name || "" } as any);
                cancelEdit();
              }}>
                <SelectTrigger className="h-6 w-[100px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["critical", "high", "medium", "low"] as const).map(p => (
                    <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="group/prio inline-flex items-center gap-0.5">
                <Badge variant={priorityColor[task.priority] as any} className="cursor-pointer" onClick={() => startEdit("priority", task.priority)}>{task.priority}</Badge>
                <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover/prio:opacity-100 transition-opacity" onClick={() => startEdit("priority", task.priority)}>
                  <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
                </Button>
              </div>
            )}
            {isOverdue(task.due_date, task.status) && (
              <Badge variant="destructive" className="text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-0.5" />Overdue
              </Badge>
            )}
          </div>
          {editField === "description" ? (
            <div className="mt-1 flex items-start gap-1">
              <Textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                rows={2}
                className="text-sm"
                autoFocus
              />
              <div className="flex flex-col gap-0.5">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => saveEdit("description")}>
                  <Check className="h-3.5 w-3.5 text-chart-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}>
                  <X className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="group/desc flex items-center gap-1 mt-1">
              <p className="text-sm text-muted-foreground">{task.description || "No description"}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 opacity-0 group-hover/desc:opacity-100 transition-opacity"
                onClick={() => startEdit("description", task.description || "")}
              >
                <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Select value={task.status} onValueChange={v => handleStatusChange(v as TaskStatus)}>
            <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {statusOptions.map(s => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setShowDelete(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Task"
        description={`Are you sure you want to delete "${task.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        variant="destructive"
      />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
        {/* Main content - Tabs */}
        <Tabs defaultValue="comments" className="w-full">
          <TabsList className="h-8">
            <TabsTrigger value="comments" className="text-xs gap-1">
              <MessageSquare className="h-3 w-3" />Comments ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="attachments" className="text-xs gap-1">
              <Paperclip className="h-3 w-3" />Attachments ({attachments.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs gap-1">
              <Activity className="h-3 w-3" />Activity ({activity.length})
            </TabsTrigger>
          </TabsList>

          {/* Comments Tab */}
          <TabsContent value="comments">
            <Card>
              <CardContent className="p-3 space-y-3">
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={isInternal} onCheckedChange={setIsInternal} id="internal-toggle" />
                      <Label htmlFor="internal-toggle" className="text-xs text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" />Internal note
                      </Label>
                    </div>
                    <Button size="sm" className="h-7 text-xs" onClick={handleAddComment} disabled={addComment.isPending || !commentText.trim()}>
                      <Send className="h-3 w-3 mr-1" />Send
                    </Button>
                  </div>
                </div>

                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No comments yet</p>
                )}
                <div className="space-y-2.5">
                  {comments.map(c => (
                    <div key={c.id} className={`rounded-lg p-2.5 ${c.is_internal ? "bg-accent/50 border border-accent" : "bg-muted/50"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                            {c.user_name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-foreground">{c.user_name}</span>
                        {c.is_internal && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1">
                            <Lock className="h-2.5 w-2.5 mr-0.5" />Internal
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(c.created_at)}</span>
                      </div>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{c.comment}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments">
            <Card>
              <CardContent className="p-3 space-y-3">
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Click to upload a file</p>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                </div>
                {uploadAttachment.isPending && (
                  <p className="text-xs text-muted-foreground text-center">Uploading...</p>
                )}

                {attachments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No attachments</p>
                )}
                <div className="space-y-1.5">
                  {attachments.map(a => (
                    <div key={a.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 group">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{a.file_name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatSize(a.file_size)} · {a.uploaded_by} · {formatDate(a.created_at)}</p>
                      </div>
                      <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Download className="h-3 w-3" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100"
                        onClick={() => setDeleteAttachmentId(a)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <ConfirmDialog
                  open={!!deleteAttachmentId}
                  onOpenChange={() => setDeleteAttachmentId(null)}
                  title="Delete Attachment"
                  description={`Delete "${deleteAttachmentId?.file_name}"?`}
                  onConfirm={() => {
                    if (deleteAttachmentId) {
                      deleteAttachment.mutate({
                        id: deleteAttachmentId.id,
                        task_id: deleteAttachmentId.task_id,
                        file_url: deleteAttachmentId.file_url,
                        file_name: deleteAttachmentId.file_name,
                        user_name: currentUser?.name || "",
                        task_title: task?.title || "",
                      });
                    }
                    setDeleteAttachmentId(null);
                  }}
                  variant="destructive"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardContent className="p-3">
                {activity.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No activity recorded</p>
                )}
                <div className="space-y-2">
                  {activity.map(a => (
                    <div key={a.id} className="flex gap-2.5 items-start">
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground">
                          <span className="font-medium">{a.user_name || "System"}</span>
                          {" "}
                          <span className="text-muted-foreground">{a.action.replace(/_/g, " ")}</span>
                        </p>
                        {a.detail && <p className="text-[10px] text-muted-foreground">{a.detail}</p>}
                        <p className="text-[10px] text-muted-foreground">{formatDate(a.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sidebar */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Details</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2.5">
              {renderEditableField("assignee", "Assignee", task.assignee, <User className="h-3.5 w-3.5 text-muted-foreground" />)}
              {editField === "category" ? (
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">Category</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Select value={editValue} onValueChange={v => setEditValue(v)}>
                        <SelectTrigger className="h-6 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["Infrastructure", "Security", "Deployment", "Maintenance", "Other"].map(c => (
                            <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => saveEdit("category")}>
                        <Check className="h-3 w-3 text-chart-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={cancelEdit}>
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                renderEditableField("category", "Category", task.category, <Tag className="h-3.5 w-3.5 text-muted-foreground" />)
              )}
              {renderEditableField("due_date", "Due Date", task.due_date || "", <Calendar className="h-3.5 w-3.5 text-muted-foreground" />, true)}
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Created</p>
                  <p className="text-xs text-foreground">{formatDate(task.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
