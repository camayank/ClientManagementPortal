import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import type { Document } from "@db/schema";

export function DocumentUpload({ 
  projectId,
  onUploadComplete 
}: { 
  projectId?: number;
  onUploadComplete?: (doc: Document) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a file to upload",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) {
      formData.append('projectId', projectId.toString());
    }

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const doc = await response.json();
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      
      if (onUploadComplete) {
        onUploadComplete(doc);
      }
      
      setFile(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="document">Document</Label>
        <Input
          id="document"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>
      <Button 
        onClick={handleUpload} 
        disabled={!file || isUploading}
        className="w-full sm:w-auto"
      >
        <Upload className="mr-2 h-4 w-4" />
        {isUploading ? "Uploading..." : "Upload Document"}
      </Button>
    </div>
  );
}
