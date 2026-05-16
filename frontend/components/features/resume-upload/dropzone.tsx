"use client";

import { motion } from "framer-motion";
import { FileUp, UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { cn } from "@/lib/utils";

export function Dropzone({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
    disabled,
    onDrop: (files) => {
      if (files.length === 0) return;
      onFile(files[0]);
    },
  });

  const { onAnimationStart, ...dropzoneProps } = getRootProps() as any;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      animate={{
        scale: isDragActive ? 1.02 : 1,
        borderColor: isDragReject
          ? "hsl(var(--destructive))"
          : isDragActive
            ? "hsl(var(--primary))"
            : "hsl(var(--border))",
      }}
      transition={{ duration: 0.18 }}
      {...dropzoneProps}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 text-center transition-colors",
        isDragActive && "bg-primary/5",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <input {...getInputProps()} />
      <motion.div
        animate={{ y: isDragActive ? -6 : 0 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"
      >
        {isDragActive ? (
          <FileUp className="h-7 w-7 text-primary" />
        ) : (
          <UploadCloud className="h-7 w-7 text-primary" />
        )}
      </motion.div>
      <div>
        <p className="text-lg font-medium">
          {isDragActive ? "Drop to upload" : "Drop your resume here, or click to browse"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">PDF, max 5 MB</p>
      </div>
    </motion.div>
  );
}
