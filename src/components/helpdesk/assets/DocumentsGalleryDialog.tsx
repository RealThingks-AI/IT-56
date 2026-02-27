import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { FileText, Download, Trash2, Plus, File, FileSpreadsheet, FileImage as FileImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface AssetDocument {
  id: string;
  asset_id: string;
  name: string;
  document_type: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string | null;
  uploaded_by: string | null;
}

const getDocumentIcon = (mimeType: string | null) => {
  if (!mimeType) return File;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) return FileSpreadsheet;
  if (mimeType.includes("image")) return FileImageIcon;
  return File;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function DocumentsGalleryDialog() {
  const queryClient = useQueryClient();
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deleteDocConfirm, setDeleteDocConfirm] = useState<AssetDocument | null>(null);

  const { data: documents, refetch: refetchDocs } = useQuery({
    queryKey: ["asset-documents-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("itam_asset_documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as AssetDocument[];
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (_file: File) => {
      throw new Error("Documents should be added from each asset's detail page");
    },
    onError: () => { toast.info("To add documents, open an asset and use the Docs tab"); },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (doc: AssetDocument) => {
      const urlParts = doc.file_path.split("/");
      const fileName = urlParts[urlParts.length - 1];
      const { error: storageError } = await supabase.storage.from("asset-documents").remove([fileName]);
      if (storageError) console.warn("Storage delete error:", storageError);
      const { error: dbError } = await supabase.from("itam_asset_documents").delete().eq("id", doc.id);
      if (dbError) throw dbError;
    },
    onSuccess: () => { toast.success("Document deleted successfully"); queryClient.invalidateQueries({ queryKey: ["asset-documents-all"] }); refetchDocs(); },
    onError: (error) => { toast.error("Failed to delete document"); console.error(error); },
  });

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try { await uploadDocMutation.mutateAsync(file); } finally { setUploadingDoc(false); e.target.value = ""; }
  };

  const handleDownload = (doc: AssetDocument) => { window.open(doc.file_path, "_blank"); };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Card className="border hover:border-primary/50 transition-all hover:shadow-md cursor-pointer">
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold">Documents Gallery</CardTitle>
              <CardDescription className="text-xs">Browse asset documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground mb-2">{documents?.length || 0} {(documents?.length || 0) === 1 ? 'document' : 'documents'}</div>
              <Button variant="outline" className="w-full h-8 text-xs">Open Gallery</Button>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asset Documents Gallery</DialogTitle>
            <DialogDescription>Browse, upload, and manage asset documents</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                This is a read-only global view. To add documents, open an asset and use the <strong>Docs</strong> tab.
              </p>
            </div>
            <div className="divide-y rounded-md border">
              {documents?.map((doc) => {
                const DocIcon = getDocumentIcon(doc.mime_type);
                return (
                  <div key={doc.id} className="flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <DocIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" title={doc.name}>{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)} • {doc.created_at ? format(new Date(doc.created_at), "MMM dd, yyyy") : "—"}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc)}><Download className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteDocConfirm(doc)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
              {(!documents || documents.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No documents available. Upload your first document!</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDocConfirm !== null}
        onOpenChange={(open) => !open && setDeleteDocConfirm(null)}
        onConfirm={() => { if (deleteDocConfirm) deleteDocMutation.mutate(deleteDocConfirm); setDeleteDocConfirm(null); }}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
}
