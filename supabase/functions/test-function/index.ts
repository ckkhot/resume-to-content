import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== TEST FUNCTION STARTED ===');
    
    // Test 1: Environment Variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    console.log('SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
    console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
    console.log('OPENAI_API_KEY:', openaiApiKey ? 'Present' : 'Missing');
    
    // Test 2: Request parsing
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed successfully');
    } catch (e) {
      console.error('JSON parsing failed:', e.message);
      throw new Error('Failed to parse request body');
    }
    
    // Test 3: Auth header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    // Test 4: OpenAI API Test (minimal call)
    if (openaiApiKey) {
      console.log('Testing OpenAI API...');
      try {
        const testResponse = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + openaiApiKey,
          }
        });
        console.log('OpenAI API Status:', testResponse.status);
        if (testResponse.ok) {
          console.log('OpenAI API: Working');
        } else {
          const errorText = await testResponse.text();
          console.error('OpenAI API Error:', errorText);
        }
      } catch (e) {
        console.error('OpenAI API Failed:', e.message);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        status: 'Test completed',
        environment: {
          supabaseUrl: !!supabaseUrl,
          supabaseAnonKey: !!supabaseAnonKey,
          openaiApiKey: !!openaiApiKey
        },
        request: {
          hasAuthHeader: !!authHeader,
          bodyParsed: !!requestBody
        },
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Test function error:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})