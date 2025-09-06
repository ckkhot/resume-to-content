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
      
      // Test the test function first
      const { data, error } = await supabase.functions.invoke('test-function', {
        body: { test: 'system check' }
      });

      if (error) {
        setTestResults({ error: error.message, type: 'test-function-error' });
      } else {
        setTestResults({ ...data, type: 'test-function-success' });
      }

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
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button 
            onClick={runSystemTest}
            disabled={isRunning}
            variant="outline"
          >
            {isRunning ? 'Running...' : 'Test System'}
          </Button>
          <Button 
            onClick={testPostGeneration}
            disabled={isRunning}
            variant="outline"
          >
            Test Post Generation
          </Button>
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