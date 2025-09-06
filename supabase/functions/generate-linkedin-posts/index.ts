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

    // Create system prompt based on resume data and user prompt
    let systemPrompt = `You are a LinkedIn content expert. Generate 3 high-quality LinkedIn posts based on the user's prompt.`;
    
    if (resumeData && resumeData.name) {
      systemPrompt += `\n\nUser's background from resume:
- Name: ${resumeData.name}
- Skills: ${resumeData.skills?.join(', ') || 'Not specified'}
- Experience: ${resumeData.experience?.map(exp => `${exp.role} at ${exp.company}`).join(', ') || 'Not specified'}
- Education: ${resumeData.education?.map(edu => `${edu.degree} from ${edu.institution}`).join(', ') || 'Not specified'}`;
    }
    
    systemPrompt += `\n\nGenerate posts in exactly these 3 tones:
1. Professional - Corporate-friendly, authoritative tone
2. Casual - Relatable, conversational tone  
3. Bold - Attention-grabbing, provocative tone

Each post should have:
- hook: Compelling opening (1-2 sentences)
- body: Main content with personal insights (2-3 short paragraphs)
- cta: Call-to-action for engagement

Return ONLY a JSON array with objects containing: { "tone": "professional/casual/bold", "hook": "...", "body": "...", "cta": "..." }`;

    console.log('✅ Making OpenAI API call...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
    }

    const openaiResult = await response.json();
    console.log('✅ OpenAI response received');
    
    let posts;
    try {
      posts = JSON.parse(openaiResult.choices[0].message.content);
      console.log('✅ Posts parsed successfully');
    } catch (e) {
      console.error('❌ Failed to parse OpenAI response as JSON:', e);
      // Fallback if JSON parsing fails
      const content = openaiResult.choices[0].message.content;
      posts = [
        {
          tone: 'professional',
          hook: 'Generated content available',
          body: content.substring(0, 1000),
          cta: "What are your thoughts on this topic?"
        }
      ];
    }
    console.log('✅ Posts generated successfully');

    return new Response(
      JSON.stringify({ 
        posts: posts,
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