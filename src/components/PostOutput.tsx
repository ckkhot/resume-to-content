import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Heart, MessageCircle, Share, Repeat2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface GeneratedPost {
  hook: string;
  body: string;
  cta: string;
  tone: 'professional' | 'casual' | 'bold';
}

interface PostOutputProps {
  posts: GeneratedPost[];
}

const toneConfig = {
  professional: {
    label: "Professional",
    description: "Corporate-friendly, authoritative tone",
    className: "post-card professional"
  },
  casual: {
    label: "Casual",
    description: "Relatable, conversational tone",
    className: "post-card casual"
  },
  bold: {
    label: "Bold",
    description: "Attention-grabbing, provocative tone",
    className: "post-card bold"
  }
};

export const PostOutput = ({ posts }: PostOutputProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (post: GeneratedPost, index: number) => {
    const fullPost = `${post.hook}\n\n${post.body}\n\n${post.cta}`;
    
    try {
      await navigator.clipboard.writeText(fullPost);
      setCopiedIndex(index);
      toast({
        title: "Copied to clipboard!",
        description: "Post copied successfully",
      });
      
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-tech-primary mb-2">Your Content Calendar</h2>
        <p className="text-muted-foreground">3 posts in different tones - ready to publish</p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {posts.map((post, index) => (
          <Card key={index} className={toneConfig[post.tone].className}>
            <div className="p-6">
              {/* Tone Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-tech-primary">
                    {toneConfig[post.tone].label}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {toneConfig[post.tone].description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(post, index)}
                  className="btn-ghost-tech"
                >
                  {copiedIndex === index ? "Copied!" : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {/* Post Content */}
              <div className="space-y-4">
                {/* Hook */}
                <div className="bg-hover-surface rounded-lg p-3 border-l-2 border-l-tech-primary">
                  <div className="text-xs text-muted-foreground mb-1">HOOK</div>
                  <p className="text-sm font-medium">{post.hook}</p>
                </div>

                {/* Body */}
                <div className="bg-hover-surface rounded-lg p-3 border-l-2 border-l-tech-accent">
                  <div className="text-xs text-muted-foreground mb-1">BODY</div>
                  <p className="text-sm whitespace-pre-line">{post.body}</p>
                </div>

                {/* CTA */}
                <div className="bg-hover-surface rounded-lg p-3 border-l-2 border-l-tech-secondary">
                  <div className="text-xs text-muted-foreground mb-1">CALL TO ACTION</div>
                  <p className="text-sm font-medium">{post.cta}</p>
                </div>
              </div>

              {/* LinkedIn Preview */}
              <div className="mt-6 pt-4 border-t border-tech-border">
                <div className="text-xs text-muted-foreground mb-3">LinkedIn Preview</div>
                <div className="bg-surface border border-tech-border rounded-lg p-4 space-y-3">
                  {/* User Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-tech-accent rounded-full"></div>
                    <div>
                      <div className="text-sm font-medium">Your Name</div>
                      <div className="text-xs text-muted-foreground">Student | Your Field</div>
                    </div>
                  </div>
                  
                  {/* Post Content Preview */}
                  <div className="text-sm space-y-2">
                    <p className="font-medium">{post.hook}</p>
                    <p className="text-muted-foreground line-clamp-3">{post.body}</p>
                    <p className="font-medium">{post.cta}</p>
                  </div>
                  
                  {/* LinkedIn Actions */}
                  <div className="flex items-center gap-4 pt-2 text-muted-foreground">
                    <div className="flex items-center gap-1 text-xs">
                      <Heart className="h-3 w-3" />
                      <span>Like</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <MessageCircle className="h-3 w-3" />
                      <span>Comment</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Repeat2 className="h-3 w-3" />
                      <span>Repost</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Share className="h-3 w-3" />
                      <span>Share</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};