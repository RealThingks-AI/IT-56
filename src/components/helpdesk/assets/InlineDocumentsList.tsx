import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FileText, Image, ExternalLink, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const InlineDocumentsList = () => {
  const queryClient = useQueryClient();
  const [deleteDocConfirm, setDeleteDocConfirm] = useState<any>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ["asset-documents-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("itam_asset_documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (doc: any) => {
      // Extract full relative path after bucket URL (handles subfolders like asset-id/filename.pdf)
      const bucketSegment = "/asset-documents/";
      const bucketIdx = doc.file_path.indexOf(bucketSegment);
      const storagePath = bucketIdx !== -1
        ? decodeURIComponent(doc.file_path.substring(bucketIdx + bucketSegment.length))
        : doc.file_path.split("/").pop() || "";
      await supabase.storage.from("asset-documents").remove([storagePath]);
      const { error: dbError } = await supabase.from("itam_asset_documents").delete().eq("id", doc.id);
      if (dbError) throw dbError;
    },
    onSuccess: () => { toast.success("Document deleted"); queryClient.invalidateQueries({ queryKey: ["asset-documents-all"] }); },
    onError: () => toast.error("Failed to delete document"),
  });

  const getDocIcon = (mimeType: string | null) => {
    if (!mimeType) return FileText;
    if (mimeType.includes("image")) return Image;
    return FileText;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Documents</span>
          </div>
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Documents</span>
          <span className="text-xs text-muted-foreground">({documents?.length || 0})</span>
          <p className="ml-auto text-[10px] text-muted-foreground">Add documents from the asset detail Docs tab</p>
        </div>
        {(!documents || documents.length === 0) ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No documents available.</p>
          </div>
        ) : (
          <div className="divide-y rounded-md border">
            {documents.map((doc: any) => {
              const DocIcon = getDocIcon(doc.mime_type);
              return (
                <div key={doc.id} className="flex items-center gap-3 p-2.5 hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <DocIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatFileSize(doc.file_size)} • {doc.created_at ? format(new Date(doc.created_at), "MMM dd, yyyy") : "—"}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(doc.file_path, "_blank")}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteDocConfirm(doc)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <ConfirmDialog
          open={!!deleteDocConfirm}
          onOpenChange={(open) => { if (!open) setDeleteDocConfirm(null); }}
          onConfirm={() => { if (deleteDocConfirm) deleteDocMutation.mutate(deleteDocConfirm); setDeleteDocConfirm(null); }}
          title="Delete Document"
          description="Delete this document? This cannot be undone."
          confirmText="Delete"
          variant="destructive"
        />
      </CardContent>
    </Card>
  );
};
