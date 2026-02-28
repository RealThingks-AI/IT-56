import { useCallback, useState, useRef } from "react";
import { Upload, X, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FileDropzoneProps {
  accept?: string;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  file: File | null;
  disabled?: boolean;
  label?: string;
  description?: string;
}

const getAcceptedExtensions = (accept: string): string[] =>
  accept.split(",").map((ext) => ext.trim().toLowerCase().replace(/^\./, ""));

export function FileDropzone({
  accept = ".xlsx,.xls,.csv",
  onFileSelect,
  onClear,
  file,
  disabled = false,
  label = "Drop your file here or click to browse",
  description = "Supports .xlsx, .xls, .csv",
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const acceptedExts = getAcceptedExtensions(accept);

  const isValidFile = useCallback(
    (f: File) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext ? acceptedExts.includes(ext) : false;
    },
    [acceptedExts]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!isValidFile(f)) {
      toast.error(`Unsupported file type. Please use ${acceptedExts.map((e) => `.${e}`).join(", ")}`);
      return;
    }
    onFileSelect(f);
  }, [disabled, onFileSelect, isValidFile, acceptedExts]);

  const handleClick = () => { if (!disabled && !file) inputRef.current?.click(); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileSelect(f);
    if (inputRef.current) inputRef.current.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-all duration-200",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Upload className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-center">{label}</p>
        <p className="text-xs text-muted-foreground text-center">{description}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </>
  );
}
