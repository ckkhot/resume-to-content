import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const SystemTest = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runSystemTest = async () => {
    setIsRunning(true);
    setTestResults(null);

    try {
      console.log('Running system test...');
      
      // Test the OpenAI connection first
      const { data: openaiData, error: openaiError } = await supabase.functions.invoke('test-openai', {
        body: { test: 'openai check' }
      });

      let results = { openai: {} };
      
      if (openaiError) {
        results.openai = { error: openaiError.message, type: 'openai-error' };
      } else {
        results.openai = { ...openaiData, type: 'openai-success' };
      }

      setTestResults(results);

    } catch (error) {
      console.error('System test error:', error);
      setTestResults({ 
        error: error.message, 
        type: 'client-error',
        stack: error.stack 
      });
    } finally {
      setIsRunning(false);
    }
  };

  const testPostGeneration = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-linkedin-posts', {
        body: { 
          prompt: 'test prompt for business analytics',
          resumeData: null
        }
      });

      if (error) {
        setTestResults({ ...testResults, postGenError: error.message });
      } else {
        setTestResults({ ...testResults, postGenSuccess: data });
      }
    } catch (error) {
      setTestResults({ ...testResults, postGenClientError: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
     <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>System Diagnostics</CardTitle>
        <p className="text-sm text-muted-foreground">Use this to debug post generation issues</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button 
            onClick={runSystemTest}
            disabled={isRunning}
            variant="outline"
          >
            {isRunning ? 'Testing...' : 'Test OpenAI Connection'}
          </Button>
          <Button 
            onClick={testPostGeneration}
            disabled={isRunning}
            variant="outline"
          >
            {isRunning ? 'Testing...' : 'Test Post Generation'}
          </Button>
        </div>

        <div className="text-sm space-y-2">
          <p><strong>Expected behavior:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>OpenAI test should return <code className="bg-muted px-1 rounded">success: true</code></li>
            <li>Post generation should show <code className="bg-muted px-1 rounded">"source": "openai"</code></li>
            <li>If OpenAI fails, it will use randomized fallback content</li>
          </ul>
        </div>

        {testResults && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">Test Results:</h3>
            <pre className="text-xs overflow-auto max-h-96">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};