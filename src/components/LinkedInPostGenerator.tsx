import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Send, User, Brain, Zap } from "lucide-react";
import { PostOutput } from "./PostOutput";
import { ResumeUpload } from "./ResumeUpload";
import { ThemeToggle } from "./ThemeToggle";

interface GeneratedPost {
  hook: string;
  body: string;
  cta: string;
  tone: 'professional' | 'casual' | 'bold';
}

export const LinkedInPostGenerator = () => {
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Array<{type: 'user' | 'assistant', content: string}>>([]);

  const handleGeneratePosts = async () => {
    if (!prompt.trim() || !resumeUploaded) return;
    
    setIsGenerating(true);
    setMessages(prev => [...prev, { type: 'user', content: prompt }]);
    
    // Simulate API call - replace with actual implementation
    setTimeout(() => {
      const mockPosts: GeneratedPost[] = [
        {
          tone: 'professional',
          hook: "🎯 After analyzing 100+ student LinkedIn profiles, I discovered the #1 mistake 90% make...",
          body: "Most students focus on listing their achievements instead of demonstrating their problem-solving mindset.\n\nHere's what I learned during my internship at [Company]:\n→ Always frame experiences as solutions\n→ Quantify your impact with real numbers\n→ Show progression, not just participation\n\nThe difference? Employers see potential, not just performance.",
          cta: "What's been your biggest learning curve in building your professional brand? Share below! 👇"
        },
        {
          tone: 'casual',
          hook: "Plot twist: The best career advice I got wasn't from a mentor... it was from a failed project 🤯",
          body: "Last semester, our team's app completely crashed during the final demo. Embarrassing? Absolutely.\n\nBut here's what that failure taught me:\n• Resilience beats perfection every time\n• Documentation saves lives (and grades)\n• Team communication is everything\n• Backup plans need backup plans\n\nThat 'failed' project became my favorite interview story.",
          cta: "Anyone else have a failure that turned into their biggest win? Let's normalize learning from setbacks! 💪"
        },
        {
          tone: 'bold',
          hook: "🚨 UNPOPULAR OPINION: Your GPA matters less than your GitHub activity (and here's the data to prove it)",
          body: "I surveyed 50 tech recruiters last month. The results were shocking:\n\n📊 78% check GitHub before looking at grades\n📊 65% value project complexity over academic scores\n📊 91% prefer seeing consistent contribution patterns\n\nTranslation: Stop obsessing over that B+ and start building. Your future employer cares more about what you create than what you memorize.",
          cta: "Agree or disagree? Drop your hot takes below! The comment section is about to get spicy 🔥"
        }
      ];
      
      setGeneratedPosts(mockPosts);
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        content: "I've generated 3 LinkedIn posts in different tones based on your resume and prompt. Each includes a compelling hook, narrative body, and engaging CTA." 
      }]);
      setIsGenerating(false);
      setPrompt("");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-tech-border bg-surface">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-tech-primary" />
                <h1 className="text-xl font-bold text-tech-primary">0.1% GPT</h1>
              </div>
              <div className="text-xs text-muted-foreground bg-tech-accent px-2 py-1 rounded">
                LinkedIn Post Generator
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Resume Upload */}
          <div className="lg:col-span-1">
            <ResumeUpload 
              onUploadComplete={() => setResumeUploaded(true)}
              isUploaded={resumeUploaded}
            />
          </div>

          {/* Main Chat Interface */}
          <div className="lg:col-span-2 flex flex-col h-[80vh]">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-6 p-4 bg-surface-muted rounded-lg border border-tech-border">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-tech-accent" />
                  <h3 className="text-lg font-medium mb-2">Ready to Generate Content</h3>
                  <p className="text-sm">Upload your resume and describe the topic you want to create posts about.</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`chat-message ${message.type}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {message.type === 'user' ? (
                          <User className="h-5 w-5 text-foreground" />
                        ) : (
                          <Brain className="h-5 w-5 text-tech-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {isGenerating && (
                <div className="chat-message assistant">
                  <div className="flex items-start gap-3">
                    <Brain className="h-5 w-5 text-tech-primary animate-pulse" />
                    <div className="flex-1">
                      <p className="text-sm">Generating your LinkedIn posts...</p>
                      <div className="flex gap-1 mt-2">
                        <div className="w-2 h-2 bg-tech-primary rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-tech-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-tech-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <Card className="p-4 border-tech-border">
              <div className="flex gap-3">
                <Textarea
                  placeholder="Describe the topic you want to create LinkedIn posts about (e.g., 'My experience with machine learning internship' or 'Tips for landing your first tech job')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="input-tech resize-none"
                  rows={3}
                />
                <Button
                  onClick={handleGeneratePosts}
                  disabled={!resumeUploaded || !prompt.trim() || isGenerating}
                  className="btn-tech flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {!resumeUploaded && (
                <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  Please upload your resume first
                </p>
              )}
            </Card>
          </div>
        </div>

        {/* Generated Posts Output */}
        {generatedPosts.length > 0 && (
          <div className="max-w-6xl mx-auto mt-12">
            <PostOutput posts={generatedPosts} />
          </div>
        )}
      </div>
    </div>
  );
};