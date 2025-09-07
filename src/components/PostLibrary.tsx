import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePostManager } from "@/hooks/usePostManager";
import { Search, Copy, Trash2, Calendar, Type } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SavedPost {
  id: string;
  title: string;
  content: string;
  tone: string;
  post_type: string;
  created_at: string;
  updated_at: string;
}

export const PostLibrary = () => {
  const { savedPosts, isLoading, deletePost, searchPosts } = usePostManager();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPosts, setFilteredPosts] = useState<SavedPost[]>([]);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (searchQuery.trim()) {
      const searchResults = async () => {
        const results = await searchPosts(searchQuery);
        setFilteredPosts(results);
      };
      searchResults();
    } else {
      setFilteredPosts(savedPosts);
    }
  }, [searchQuery, savedPosts, searchPosts]);

  const copyToClipboard = async (content: string, postId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedPostId(postId);
      toast({
        title: "Copied to clipboard",
        description: "Post content copied successfully",
      });
      setTimeout(() => setCopiedPostId(null), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      await deletePost(postId);
    }
  };

  const getToneColor = (tone: string) => {
    switch (tone.toLowerCase()) {
      case 'professional': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'casual': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'bold': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'announcement': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'story': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
      case 'tip': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading your post library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-tech-primary to-tech-secondary bg-clip-text text-transparent">
          Your Post Library
        </h2>
        <p className="text-muted-foreground">
          Manage and organize your saved LinkedIn posts
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search posts by title or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 input-tech border-tech-border focus:border-primary transition-all duration-200"
        />
      </div>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <Type className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery ? "No posts found" : "No saved posts yet"}
          </h3>
          <p className="text-muted-foreground">
            {searchQuery 
              ? "Try adjusting your search terms" 
              : "Start generating posts to build your library"}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="group hover:shadow-tech-lg transition-all duration-200 border-tech-border bg-surface">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2 text-foreground">
                    {post.title}
                  </CardTitle>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(post.content, post.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedPostId === post.id ? "Copied!" : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePost(post.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  <Badge className={getToneColor(post.tone)}>
                    {post.tone}
                  </Badge>
                  <Badge className={getTypeColor(post.post_type)}>
                    {post.post_type}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Content Preview */}
                <div className="text-sm text-muted-foreground line-clamp-4">
                  {post.content}
                </div>
                
                {/* Date */}
                <div className="flex items-center text-xs text-muted-foreground pt-2 border-t border-tech-border">
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(new Date(post.created_at), 'MMM d, yyyy')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Stats */}
      {filteredPosts.length > 0 && (
        <div className="text-center text-sm text-muted-foreground pt-6 border-t border-tech-border">
          {searchQuery ? (
            <>Showing {filteredPosts.length} of {savedPosts.length} posts</>
          ) : (
            <>Total posts: {savedPosts.length}</>
          )}
        </div>
      )}
    </div>
  );
};