"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, X, File, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  file: File;
  name: string;
  size: string;
}

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
  uploadedFile: UploadedFile | null;
  onRemove: () => void;
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DropZone({ onFileAccepted, uploadedFile, onRemove }: DropZoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejected: import('react-dropzone').FileRejection[]) => {
      setError(null);
      if (rejected.length > 0) {
        const msg = rejected[0].errors[0].message;
        setError(msg.includes("type") ? "Only PDF, DOCX, and TXT files are allowed." : "File is too large. Max size is 10MB.");
        return;
      }
      if (acceptedFiles[0]) {
        onFileAccepted(acceptedFiles[0]);
      }
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
  });

  if (uploadedFile) {
    return (
      <div className="rounded-xl border border-[#6c63ff]/30 bg-[#6c63ff]/5 p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#6c63ff]/15">
          <File className="h-5 w-5 text-[#6c63ff]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
          <p className="text-xs text-[#8888aa]">{uploadedFile.size}</p>
        </div>
        <button
          onClick={onRemove}
          className="shrink-0 rounded-lg p-1.5 text-[#8888aa] hover:text-white hover:bg-[#1e1e2e] transition-colors"
          aria-label="Remove file"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={cn(
          "relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all",
          isDragActive
            ? "border-[#6c63ff] bg-[#6c63ff]/10"
            : "border-[#2a2a3a] bg-[#12121a] hover:border-[#6c63ff]/50 hover:bg-[#6c63ff]/5"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
              isDragActive ? "bg-[#6c63ff]/20" : "bg-[#1e1e2e]"
            )}
          >
            <Upload
              className={cn(
                "h-6 w-6 transition-colors",
                isDragActive ? "text-[#6c63ff]" : "text-[#8888aa]"
              )}
            />
          </div>
          <div>
            <p className="text-sm font-medium">
              {isDragActive ? "Drop your resume here" : "Drag & drop your resume"}
            </p>
            <p className="mt-1 text-xs text-[#8888aa]">
              or{" "}
              <span className="text-[#6c63ff] underline underline-offset-2">browse files</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8888aa]">
            <FileText className="h-3.5 w-3.5" />
            PDF, DOCX, TXT · Max 10MB
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-xs text-[#ef4444]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
