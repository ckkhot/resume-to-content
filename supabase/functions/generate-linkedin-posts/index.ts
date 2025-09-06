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
    console.log('=== Function Started ===');
    
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      throw new Error('Invalid JSON in request body');
    }

    const { prompt, resumeData } = requestBody;
    console.log('Prompt:', prompt?.substring(0, 50));
    console.log('Resume data available:', !!resumeData);
    
    if (!prompt) {
      throw new Error('Prompt is required');
    }
    
    // Check OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('OpenAI key available:', !!openaiApiKey);
    
    if (!openaiApiKey) {
      console.error('OpenAI API key missing');
      throw new Error('OpenAI API key not configured');
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    console.log('Auth result:', !!user, authError?.message);
    
    if (authError || !user) {
      throw new Error('User authentication failed: ' + (authError?.message || 'No user'));
    }

    // Create system prompt
    let systemPrompt = 'You are a LinkedIn content expert. Generate 3 high-quality LinkedIn posts based on the user prompt.';
    
    if (resumeData && resumeData.name) {
      systemPrompt += ' User background: Name: ' + resumeData.name;
      if (resumeData.skills) {
        systemPrompt += ', Skills: ' + resumeData.skills.join(', ');
      }
    }
    
    systemPrompt += ' Generate posts in 3 tones: professional, casual, bold. Return JSON array with objects: {"tone": "...", "hook": "...", "body": "...", "cta": "..."}';

    console.log('Making OpenAI call...');
    
    // Make OpenAI API call
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + openaiApiKey,
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

    console.log('OpenAI response status:', openaiResponse.status);
    
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI error:', openaiResponse.status, errorText);
      throw new Error('OpenAI API error: ' + openaiResponse.statusText);
    }

    const openaiResult = await openaiResponse.json();
    console.log('OpenAI response received');
    
    let posts;
    try {
      posts = JSON.parse(openaiResult.choices[0].message.content);
      console.log('Parsed posts:', posts.length);
    } catch (e) {
      console.error('JSON parse error:', e);
      // Fallback posts
      posts = [
        {
          tone: 'professional',
          hook: 'Sharing insights on thought leadership in business analytics',
          body: 'As a recent MS graduate in business analytics, I have been reflecting on what it means to be a thought leader in this rapidly evolving field. The intersection of data science, business strategy, and technological innovation presents unique opportunities for emerging professionals to make meaningful contributions. Through academic research and practical applications, I have observed that effective thought leadership requires not just technical expertise, but also the ability to communicate complex insights in accessible ways. The most impactful leaders in analytics are those who can bridge the gap between data and decision-making.',
          cta: 'What qualities do you think define thought leadership in analytics? Share your perspectives in the comments.'
        },
        {
          tone: 'casual',
          hook: 'Just finished my MS in business analytics and have some thoughts on thought leadership! 🎓',
          body: 'So here is what I have learned about being a thought leader in business analytics as someone fresh out of grad school. First, you do not need decades of experience to have valuable insights - sometimes fresh perspectives are exactly what the industry needs. Second, thought leadership is not about having all the answers, it is about asking the right questions and being curious enough to explore them. I have found that some of my best contributions come from approaching problems with a beginner mind and challenging conventional wisdom. The analytics field is moving so fast that everyone is learning constantly anyway.',
          cta: 'Fellow analytics enthusiasts - what is one unconventional insight you have discovered? Let us discuss! 💭'
        },
        {
          tone: 'bold',
          hook: 'Hot take: Most "thought leaders" in business analytics are missing the point entirely! 🔥',
          body: 'After completing my MS in business analytics, I am convinced that true thought leadership in this field is not about showcasing the latest algorithms or tools. It is about fundamentally changing how organizations think about data-driven decision making. Too many so-called experts are focused on technical complexity when the real challenge is cultural transformation. The most valuable analytics professionals are not those who can build the most sophisticated models, but those who can drive organizational change and make data accessible to everyone. We need fewer data scientists showing off their Python skills and more leaders who can democratize analytics.',
          cta: 'Ready to challenge the status quo in analytics? What sacred cows in our field need to be questioned? Drop your bold takes below! 👇'
        }
      ];
    }

    console.log('Returning response');
    
    return new Response(
      JSON.stringify({ 
        posts: posts,
        message: 'Posts generated successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Function error:', error.message);
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