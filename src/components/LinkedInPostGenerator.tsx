import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Send, User, Brain, Zap } from "lucide-react";
import { PostOutput } from "./PostOutput";
import { PostLibrary } from "./PostLibrary";
import { ResumeUpload } from "./ResumeUpload";
import { ProfileManager } from "./ProfileManager";
import { ThemeToggle } from "./ThemeToggle";
import { Auth } from "./Auth";
import { useAuth } from "@/hooks/useAuth";
import { usePostManager } from "@/hooks/usePostManager";
import { supabase } from "@/integrations/supabase/client";
import { SystemTest } from "./SystemTest";

interface GeneratedPost {
  hook: string;
  body: string;
  cta: string;
  tone: 'professional' | 'casual' | 'bold';
}

export const LinkedInPostGenerator = () => {
  const { user, loading, signOut } = useAuth();
  const { savePost, savePosts, isSaving } = usePostManager();
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [resumeData, setResumeData] = useState<any>(null);
  const [prompt, setPrompt] = useState("");
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'generator' | 'library' | 'profile'>('generator');
  const [messages, setMessages] = useState<Array<{type: 'user' | 'assistant', content: string}>>([]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const handleGeneratePosts = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setMessages(prev => [...prev, { type: 'user', content: prompt }]);
    
    try {
      // Call NEW Supabase Edge Function to generate posts
      console.log('🚀 Calling generate-posts-v2 function...');
      const { data, error } = await supabase.functions.invoke('generate-posts-v2', {
        body: { 
          prompt: prompt,
          resumeData: resumeData || null // Ensure we pass null if no resume data
        }
      });

      console.log('Post generation response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate posts');
      }

      const posts = data?.posts || [];
      console.log('Generated posts:', posts);
      
      setGeneratedPosts(posts);
      
      if (posts.length > 0) {
        setMessages(prev => [...prev, { 
          type: 'assistant', 
          content: `I've generated ${posts.length} LinkedIn posts in different tones ${resumeData ? 'personalized with your resume data' : 'based on your prompt'}. Each includes a compelling hook, narrative body, and engaging CTA.` 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          type: 'assistant', 
          content: 'I generated content but encountered an issue formatting the posts. Please try again with a different prompt.' 
        }]);
      }
    } catch (error) {
      console.error('Error generating posts:', error);
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        content: `Sorry, I encountered an error generating posts: ${error.message || 'Unknown error'}. Please check your connection and try again.` 
      }]);
    } finally {
      setIsGenerating(false);
      setPrompt("");
    }
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
              <div className="flex gap-4 items-center">
                <span className="text-sm text-muted-foreground">Welcome, {user.email}</span>
                <Button variant="outline" onClick={signOut}>Sign Out</Button>
                <ThemeToggle />
              </div>
            </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-muted rounded-lg p-1 border border-tech-border">
            <Button
              variant={activeTab === 'generator' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('generator')}
              className="rounded-md transition-all duration-200"
            >
              Generate Posts
            </Button>
            <Button
              variant={activeTab === 'library' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('library')}
              className="rounded-md transition-all duration-200"
            >
              Post Library
            </Button>
            <Button
              variant={activeTab === 'profile' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('profile')}
              className="rounded-md transition-all duration-200"
            >
              Profile
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'generator' ? (
          <>
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Sidebar - Profile Status */}
              <div className="lg:col-span-1">
                {resumeData ? (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800 dark:text-green-200">Profile Connected</span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                      Using your profile data to personalize posts
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setActiveTab("profile")}
                      className="text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
                    >
                      View/Edit Profile
                    </Button>
                  </div>
                ) : (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                      💡 Add Your Profile
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Create your professional profile to generate more personalized LinkedIn posts
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setActiveTab("profile")}
                      className="text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                    >
                      Create Profile
                    </Button>
                  </div>
                )}
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
                      disabled={!prompt.trim() || isGenerating}
                      className="btn-tech flex-shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 <strong>Tip:</strong> You can generate posts right away! Upload a resume for more personalized content, or start creating posts with any topic.
                  </p>
                </Card>
              </div>
            </div>

            {/* Generated Posts Output */}
            {generatedPosts.length > 0 && (
              <div className="max-w-6xl mx-auto mt-12">
                <PostOutput 
                  posts={generatedPosts} 
                  onSavePost={savePost}
                  onSavePosts={savePosts}
                  isSaving={isSaving}
                />
              </div>
            )}

            {/* System Test Component - Only visible in development */}
            {import.meta.env.DEV && (
              <div className="max-w-6xl mx-auto mt-12">
                <SystemTest />
              </div>
            )}
          </>
        ) : activeTab === 'library' ? (
          <div className="max-w-6xl mx-auto">
            <PostLibrary />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <ProfileManager onProfileUpdate={setResumeData} />
          </div>
        )}
      </div>
    </div>
  );
};