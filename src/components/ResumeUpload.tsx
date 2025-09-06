import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle, X } from "lucide-react";
import { useToast } from "./ui/use-toast";

interface ResumeUploadProps {
  onUploadComplete: (resumeData?: any) => void;
  isUploaded: boolean;
}

export const ResumeUpload = ({ onUploadComplete, isUploaded }: ResumeUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setUploadedFile(file);

    // Simulate file processing
    setTimeout(() => {
      setIsProcessing(false);
      onUploadComplete({ fileName: file.name, size: file.size });
      toast({
        title: "Resume uploaded successfully!",
        description: "Your resume has been analyzed and is ready for content generation.",
      });
    }, 1500);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
      processFile(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    onUploadComplete();
  };

  if (isUploaded && uploadedFile) {
    return (
      <Card className="p-6 border-tech-border bg-surface">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
          <h3 className="font-medium text-tech-primary mb-2">Resume Uploaded</h3>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
            <FileText className="h-4 w-4" />
            <span>{uploadedFile.name}</span>
          </div>
          <div className="space-y-2">
            <div className="bg-hover-surface rounded-lg p-3 text-left">
              <h4 className="text-sm font-medium mb-2">Extracted Information:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Experience level identified</li>
                <li>• Skills and expertise mapped</li>
                <li>• Industry focus detected</li>
                <li>• Achievement patterns analyzed</li>
              </ul>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="btn-ghost-tech w-full mt-4"
            >
              <X className="h-4 w-4 mr-2" />
              Upload Different Resume
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-tech-border bg-surface">
      <div className="text-center mb-6">
        <h3 className="font-medium text-tech-primary mb-2">Upload Your Resume</h3>
        <p className="text-sm text-muted-foreground">
          Upload your resume to personalize content generation
        </p>
      </div>

      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${isDragging 
            ? 'border-tech-primary bg-hover-surface' 
            : 'border-tech-border hover:border-tech-accent hover:bg-hover-surface'
          }
          ${isProcessing ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && document.getElementById('resume-upload')?.click()}
      >
        <input
          id="resume-upload"
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="space-y-4">
            <div className="animate-spin h-8 w-8 border-2 border-tech-primary border-t-transparent rounded-full mx-auto"></div>
            <div>
              <p className="text-sm font-medium text-tech-primary">Processing Resume...</p>
              <p className="text-xs text-muted-foreground">Analyzing your experience and skills</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="h-8 w-8 mx-auto text-tech-accent" />
            <div>
              <p className="text-sm font-medium text-tech-primary">
                Drop your resume here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF files only, max 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 text-xs text-muted-foreground">
        <h4 className="font-medium mb-2">What we'll extract:</h4>
        <ul className="space-y-1">
          <li>• Your experience level and background</li>
          <li>• Technical skills and expertise areas</li>
          <li>• Past achievements and projects</li>
          <li>• Industry and role preferences</li>
        </ul>
      </div>
    </Card>
  );
};