import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GeneratedPost {
  hook: string;
  body: string;
  cta: string;
  tone: 'professional' | 'casual' | 'bold';
}

interface SavedPost {
  id: string;
  title: string;
  content: string;
  tone: string;
  post_type: string;
  created_at: string;
  updated_at: string;
}

export const usePostManager = () => {
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load user's post history
  const loadUserPosts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('linkedin_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading posts:', error);
        toast({
          title: "Failed to load posts",
          description: "Please try refreshing the page",
          variant: "destructive"
        });
        return;
      }

      setSavedPosts(data || []);
    } catch (error) {
      console.error('Error in loadUserPosts:', error);
      toast({
        title: "Error loading posts",
        description: "Please check your connection and try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save a generated post to database
  const savePost = async (post: GeneratedPost, customTitle?: string): Promise<boolean> => {
    setIsSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to save posts",
          variant: "destructive"
        });
        return false;
      }

      const postContent = `${post.hook}\n\n${post.body}\n\n${post.cta}`;
      const title = customTitle || post.hook.substring(0, 50) + (post.hook.length > 50 ? '...' : '');

      const { data, error } = await supabase
        .from('linkedin_posts')
        .insert({
          user_id: user.id,
          title: title,
          content: postContent,
          tone: post.tone,
          post_type: 'generated'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving post:', error);
        toast({
          title: "Failed to save post",
          description: error.message || "Please try again",
          variant: "destructive"
        });
        return false;
      }

      // Add to local state
      if (data) {
        setSavedPosts(prev => [data, ...prev]);
        toast({
          title: "Post saved!",
          description: "Your LinkedIn post has been saved to your library",
        });
      }

      return true;
    } catch (error) {
      console.error('Error in savePost:', error);
      toast({
        title: "Error saving post",
        description: "Please check your connection and try again",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Save multiple posts (batch save)
  const savePosts = async (posts: GeneratedPost[]): Promise<boolean> => {
    setIsSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to save posts",
          variant: "destructive"
        });
        return false;
      }

      const postsToInsert = posts.map(post => ({
        user_id: user.id,
        title: post.hook.substring(0, 50) + (post.hook.length > 50 ? '...' : ''),
        content: `${post.hook}\n\n${post.body}\n\n${post.cta}`,
        tone: post.tone,
        post_type: 'generated'
      }));

      const { data, error } = await supabase
        .from('linkedin_posts')
        .insert(postsToInsert)
        .select();

      if (error) {
        console.error('Error saving posts:', error);
        toast({
          title: "Failed to save posts",
          description: error.message || "Please try again",
          variant: "destructive"
        });
        return false;
      }

      // Add to local state
      if (data) {
        setSavedPosts(prev => [...data, ...prev]);
        toast({
          title: "Posts saved!",
          description: `${data.length} LinkedIn posts saved to your library`,
        });
      }

      return true;
    } catch (error) {
      console.error('Error in savePosts:', error);
      toast({
        title: "Error saving posts",
        description: "Please check your connection and try again",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a post
  const deletePost = async (postId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('linkedin_posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error);
        toast({
          title: "Failed to delete post",
          description: error.message || "Please try again",
          variant: "destructive"
        });
        return false;
      }

      // Remove from local state
      setSavedPosts(prev => prev.filter(post => post.id !== postId));
      toast({
        title: "Post deleted",
        description: "Post has been removed from your library",
      });

      return true;
    } catch (error) {
      console.error('Error in deletePost:', error);
      toast({
        title: "Error deleting post",
        description: "Please check your connection and try again",
        variant: "destructive"
      });
      return false;
    }
  };

  // Search posts
  const searchPosts = async (query: string): Promise<SavedPost[]> => {
    try {
      const { data, error } = await supabase
        .from('linkedin_posts')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching posts:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchPosts:', error);
      return [];
    }
  };

  // Auto-load posts when hook is used
  useEffect(() => {
    loadUserPosts();
  }, []);

  // Set up real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('linkedin-posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'linkedin_posts'
        },
        (payload) => {
          console.log('Real-time update:', payload);
          // Reload posts when changes occur
          loadUserPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    savedPosts,
    isLoading,
    isSaving,
    savePost,
    savePosts,
    deletePost,
    searchPosts,
    loadUserPosts,
  };
};