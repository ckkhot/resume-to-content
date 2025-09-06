import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

export const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showReset, setShowReset] = useState(false);
  const { toast } = useToast();

  // Supabase is configured via Lovable integration - always available


  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user && !data.user.email_confirmed_at) {
        toast({
          title: "Check Your Email",
          description: "We've sent you a confirmation link. Please check your email and click the link to activate your account.",
        });
        setEmail('');
        setPassword('');
        setFullName('');
      } else {
        toast({
          title: "Account Created",
          description: "Your account has been created successfully!",
        });
      }
    } catch (err) {
      toast({
        title: "Signup Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let errorMessage = error.message;
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Invalid email or password. Make sure you've signed up and confirmed your email address.";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Please check your email and click the confirmation link before signing in.";
        }
        
        toast({
          title: "Sign In Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } else if (data.user) {
        toast({
          title: "Welcome Back!",
          description: "You've been signed in successfully.",
        });
      }
    } catch (err) {
      toast({
        title: "Sign In Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/`,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Check your email for password reset instructions!",
      });
      setShowReset(false);
      setResetEmail('');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background tech-grid p-4">
      <Card className="w-full max-w-md shadow-tech-lg border-tech-border bg-surface">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-tech-primary to-tech-secondary bg-clip-text text-transparent">
            LinkedIn Post Generator
          </CardTitle>
          <CardDescription className="text-muted-foreground text-base">
            Sign in to start generating amazing LinkedIn posts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              👋 <strong>New here?</strong> Start with the Sign Up tab to create your account first!
            </p>
          </div>
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted border border-tech-border">
              <TabsTrigger 
                value="signin" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-tech h-11 px-4 border-tech-border focus:border-primary transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input-tech h-11 px-4 border-tech-border focus:border-primary transition-all duration-200"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-primary hover:bg-tech-secondary text-primary-foreground transition-all duration-200 shadow-tech hover:shadow-tech-lg" 
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowReset(true)}
                    className="text-sm text-primary hover:text-tech-secondary transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="input-tech h-11 px-4 border-tech-border focus:border-primary transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input-tech h-11 px-4 border-tech-border focus:border-primary transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="input-tech h-11 px-4 border-tech-border focus:border-primary transition-all duration-200"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-primary hover:bg-tech-secondary text-primary-foreground transition-all duration-200 shadow-tech hover:shadow-tech-lg" 
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Password Reset Modal */}
      {showReset && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md shadow-tech-lg border-tech-border bg-surface">
            <CardHeader>
              <CardTitle className="text-lg">Reset Password</CardTitle>
              <CardDescription>
                Enter your email to receive password reset instructions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="input-tech h-11 px-4 border-tech-border focus:border-primary transition-all duration-200"
                />
                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    className="flex-1 h-11 bg-primary hover:bg-tech-secondary text-primary-foreground transition-all duration-200" 
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Reset Email'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setShowReset(false);
                      setResetEmail('');
                    }}
                    className="h-11 border-tech-border"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};