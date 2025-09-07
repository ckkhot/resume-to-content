import { useState, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle, X } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ResumeUploadProps {
  onUploadComplete: (resumeData?: any) => void;
  isUploaded: boolean;
}

export const ResumeUpload = ({ onUploadComplete, isUploaded }: ResumeUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();

  // Clear any error state on component mount
  useEffect(() => {
    setHasError(false);
  }, []);

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
    setHasError(false);
    setUploadedFile(file);

    // Simulate processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsProcessing(false);
    
    // Show honest message about feature being in development
    toast({
      title: "PDF Processing Coming Soon!",
      description: "We're building intelligent resume analysis. For now, you can still generate great LinkedIn posts without uploading a resume.",
    });
    
    // Don't call onUploadComplete with fake data
    // The app will work without resume data
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
    setHasError(false); // Reset error state
    // Reset the upload state completely
    onUploadComplete(null);
  };

  if (uploadedFile) {
    return (
      <Card className="p-6 border-tech-border bg-surface">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-tech-accent" />
          <h3 className="font-medium text-tech-primary mb-2">Resume Uploaded</h3>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
            <FileText className="h-4 w-4" />
            <span>{uploadedFile.name}</span>
          </div>
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                🚧 PDF Processing In Development
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                We're building intelligent resume analysis to personalize your LinkedIn posts. 
                For now, you can generate amazing content without this feature!
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="btn-ghost-tech w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Try Different Resume
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
          Help us build personalized content (feature in development)
        </p>
        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">
          💡 You can generate great posts without uploading a resume
        </div>
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
        <h4 className="font-medium mb-2">Coming Soon - We'll extract:</h4>
        <ul className="space-y-1">
          <li>• Your experience level and background</li>
          <li>• Technical skills and expertise areas</li>
          <li>• Past achievements and projects</li>
          <li>• Industry and role preferences</li>
        </ul>
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          This feature is in active development. Your posts will be great even without resume data!
        </p>
      </div>
    </Card>
  );
};