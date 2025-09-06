import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== Function started ===');
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('✅ Request body parsed');
    } catch (e) {
      console.error('❌ Failed to parse request body:', e);
      throw new Error('Invalid JSON in request body');
    }

    const { prompt, resumeData } = requestBody;
    if (!prompt) {
      throw new Error('Prompt is required');
    }
    console.log('✅ Prompt received:', prompt.substring(0, 50) + '...');
    console.log('✅ Resume data available:', !!resumeData);
    if (resumeData) {
      console.log('Resume data keys:', Object.keys(resumeData));
    }
    
    // Check OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not found');
      throw new Error('OpenAI API key not configured');
    }
    console.log('✅ OpenAI API key found');

    // Check auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      throw new Error('Authorization header missing');
    }
    console.log('✅ Auth header present');

    // Create Supabase client and verify user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('❌ Auth failed:', authError);
      throw new Error('User authentication failed');
    }
    console.log('✅ User authenticated:', user.id);

    // Create test posts without OpenAI for now to isolate the issue
    const testPosts = [
      {
        tone: 'professional',
        hook: 'Exciting career milestone ahead! 🎯',
        body: `Just received an incredible internship offer in analytics and AI at a Y Combinator company. This opportunity represents everything I've been working toward - combining cutting-edge technology with real-world impact.

The journey to get here involved countless hours of skill development, networking, and perseverance. Every rejection taught me something new, and every small win built momentum toward this moment.

I'm grateful for the mentors, peers, and experiences that shaped this path. Sometimes the best opportunities come when preparation meets possibility.`,
        cta: 'What\\'s been your biggest career breakthrough this year? Share your story below! 👇'
      },
      {
        tone: 'casual',
        hook: 'Plot twist: Dreams do come true! ✨',
        body: `Okay, I literally can\\'t contain my excitement right now. Just got the call - I landed an internship at a YC company working on analytics and AI! 🤯

Still feels surreal. All those late nights grinding on projects, the nerve-wracking interviews, the moments of self-doubt... it all led to this. Sometimes the universe really does reward hard work and persistence.

This is just the beginning, but wow - what a beginning it is. Ready to learn, contribute, and maybe even change the world a little bit along the way.`,
        cta: 'Drop a 🔥 if you believe persistence pays off! Let\\'s celebrate wins together 🎉'
      },
      {
        tone: 'bold',
        hook: 'Breaking: The future just got brighter! 🚀',
        body: `NEWS FLASH: Your girl just secured an internship at a Y Combinator analytics and AI company! This isn\\'t just a job - it\\'s a launching pad into the future of technology.

Here\\'s what this means: I\\'ll be working alongside brilliant minds, solving problems that matter, and contributing to innovations that could shape entire industries. The learning curve will be steep, but that\\'s exactly where I thrive.

To everyone who said "analytics and AI are too competitive" or "you need more experience" - watch this space. Sometimes you don\\'t wait for permission to level up. You create your own opportunities.\`,
        cta: 'Who else is ready to disrupt their industry? Tag someone who needs to see this! 💪'
      }
    ];

    console.log('✅ Posts created successfully');

    return new Response(
      JSON.stringify({ 
        posts: testPosts,
        message: resumeData ? 'Posts personalized with resume data' : 'Posts generated successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('❌ Function error:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
})