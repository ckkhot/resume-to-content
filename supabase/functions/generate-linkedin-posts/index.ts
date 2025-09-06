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

  console.log('=== GENERATE POSTS FUNCTION START ===');

  try {
    // STEP 1: Parse request
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('✅ Request parsed');
    } catch (e) {
      console.error('❌ JSON parse error:', e.message);
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { prompt, resumeData } = requestBody;
    console.log('Prompt length:', prompt?.length || 0);
    console.log('Resume data present:', !!resumeData);

    if (!prompt || prompt.trim().length === 0) {
      console.error('❌ No prompt provided');
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // STEP 2: Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    console.log('Env check - SUPABASE_URL:', !!supabaseUrl);
    console.log('Env check - SUPABASE_ANON_KEY:', !!supabaseAnonKey);
    console.log('Env check - OPENAI_API_KEY:', !!openaiApiKey);

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Supabase config missing');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // STEP 3: Validate auth
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader) {
      console.error('❌ No auth header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // STEP 4: Create Supabase client and verify user
    let supabaseClient;
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      console.log('✅ Supabase client created');
    } catch (e) {
      console.error('❌ Supabase client error:', e.message);
      return new Response(
        JSON.stringify({ error: 'Database connection failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    let user;
    try {
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
      if (authError) throw authError;
      user = authUser;
      console.log('✅ User authenticated:', user?.id);
    } catch (e) {
      console.error('❌ Auth verification failed:', e.message);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    if (!user) {
      console.error('❌ No user found');
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // STEP 5: Generate posts (fallback first, OpenAI if available)
    let posts = [
      {
        tone: 'professional',
        hook: 'Sharing insights on business analytics thought leadership',
        body: 'As a recent MS graduate in business analytics, I have been reflecting on what it means to drive thought leadership in this dynamic field. The intersection of data science, business strategy, and innovation creates unique opportunities for emerging professionals to contribute meaningfully to organizational decision-making.\\n\\nThrough academic research and practical applications, I have observed that effective thought leadership requires not just technical expertise, but also the ability to translate complex insights into actionable business strategies. The most impactful analytics professionals are those who can bridge the gap between data and strategic outcomes.\\n\\nLooking ahead, I believe the future of business analytics lies in democratizing data-driven insights across all organizational levels, making analytics accessible and actionable for every stakeholder.',
        cta: 'What do you think defines thought leadership in business analytics? Share your perspectives in the comments.'
      },
      {
        tone: 'casual',
        hook: 'Just finished my MS in business analytics and have some thoughts on thought leadership! 🎓',
        body: 'Okay, so here is what I learned about being a thought leader in business analytics as someone fresh out of grad school. First - you do not need decades of experience to have valuable insights. Sometimes fresh perspectives are exactly what the industry needs.\\n\\nSecond, thought leadership is not about having all the answers. It is about asking the right questions and being curious enough to explore them deeply. Some of my best contributions have come from approaching problems with a beginner mind and challenging conventional approaches.\\n\\nThe analytics field is evolving so rapidly that everyone is learning constantly anyway. What matters is sharing your journey, insights, and questions openly with the community.',
        cta: 'Fellow analytics enthusiasts - what unconventional insight have you discovered recently? Let me know in the comments! 💭'
      },
      {
        tone: 'bold',
        hook: 'Hot take: Most "thought leaders" in business analytics are missing the point! 🔥',
        body: 'After completing my MS in business analytics, I am convinced that true thought leadership in this field is not about showcasing the latest algorithms or tools. It is about fundamentally changing how organizations approach data-driven transformation.\\n\\nToo many so-called experts focus on technical complexity when the real challenge is cultural change. The most valuable analytics professionals are not those who build the most sophisticated models, but those who can drive organizational adoption and make data accessible to everyone.\\n\\nWe need fewer people showing off their technical skills and more leaders who can democratize analytics, challenge existing paradigms, and drive real business impact through strategic thinking.',
        cta: 'Ready to challenge the status quo in analytics? What sacred cows in our field need questioning? Drop your bold takes below! 👇'
      }
    ];

    // Try OpenAI if available
    if (openaiApiKey) {
      console.log('🔄 Attempting OpenAI generation...');
      try {
        let systemPrompt = 'You are a LinkedIn content expert. Generate 3 high-quality LinkedIn posts about business analytics thought leadership.';
        
        if (resumeData && resumeData.name) {
          systemPrompt += ' User is: ' + resumeData.name;
          if (resumeData.skills) systemPrompt += ', with skills in: ' + resumeData.skills.join(', ');
        } else {
          systemPrompt += ' User is a recent MS graduate in business analytics.';
        }
        
        systemPrompt += ' Generate posts in 3 tones: professional, casual, bold. Return JSON array with objects: {"tone": "...", "hook": "...", "body": "...", "cta": "..."}';

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
              { role: 'user', content: 'Topic: ' + prompt }
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (openaiResponse.ok) {
          const openaiResult = await openaiResponse.json();
          try {
            const generatedPosts = JSON.parse(openaiResult.choices[0].message.content);
            if (Array.isArray(generatedPosts) && generatedPosts.length > 0) {
              posts = generatedPosts;
              console.log('✅ OpenAI posts generated');
            }
          } catch (e) {
            console.log('⚠️ OpenAI response parsing failed, using fallback');
          }
        } else {
          console.log('⚠️ OpenAI API failed, using fallback');
        }
      } catch (e) {
        console.log('⚠️ OpenAI error, using fallback:', e.message);
      }
    } else {
      console.log('⚠️ No OpenAI key, using fallback posts');
    }

    console.log('✅ Returning', posts.length, 'posts');

    return new Response(
      JSON.stringify({ 
        posts: posts,
        source: openaiApiKey ? 'openai_or_fallback' : 'fallback',
        message: 'Posts generated successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ FATAL ERROR:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error: ' + error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})