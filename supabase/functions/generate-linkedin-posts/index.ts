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

    // STEP 5: Generate posts (always try OpenAI first for variation)
    let posts = [];
    let usedOpenAI = false;

    // Try OpenAI first for variation
    if (openaiApiKey) {
      console.log('🔄 Attempting OpenAI generation...');
      try {
        // Build personalized context
        let userContext = '';
        if (resumeData && resumeData.name) {
          userContext = `User is: ${resumeData.name}`;
          if (resumeData.skills) userContext += `, with expertise in: ${resumeData.skills.join(', ')}`;
          if (resumeData.experience) userContext += `, with experience in: ${resumeData.experience}`;
        } else {
          userContext = 'User is a business analytics professional';
        }

        // Enhanced system prompt with new format requirements
        const systemPrompt = `You are a LinkedIn content strategist. Create 3 unique, varied LinkedIn posts about the topic provided.

${userContext}

FORMAT REQUIREMENTS:
- Start with a sticky, scroll-stopping, one sentence hook
- Body in narrative style using storytelling
- Use bullet points where necessary for clarity
- NO EMOJIS anywhere in the content
- End with a clear CTA encouraging comments, likes, or engagement

TONE VARIATIONS:
1. Professional: Corporate-friendly, authoritative
2. Casual: Relatable, conversational 
3. Bold: Attention-grabbing, provocative

VARIATION: Each post must be completely different in approach, perspective, and content. Use different angles, examples, and insights.

Return JSON array: [{"tone": "professional", "hook": "...", "body": "...", "cta": "..."}, {"tone": "casual", "hook": "...", "body": "...", "cta": "..."}, {"tone": "bold", "hook": "...", "body": "...", "cta": "..."}]`;

        // Add timestamp for variation
        const timestamp = Date.now();
        const userPrompt = `Topic: ${prompt}

Generate 3 completely different posts about this topic. Each should offer a unique perspective or angle. Variation ID: ${timestamp}`;

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
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.9, // Higher temperature for more variation
            max_tokens: 3000,
          }),
        });

        if (openaiResponse.ok) {
          const openaiResult = await openaiResponse.json();
          console.log('🔍 OpenAI response received');
          
          try {
            const generatedPosts = JSON.parse(openaiResult.choices[0].message.content);
            if (Array.isArray(generatedPosts) && generatedPosts.length === 3) {
              posts = generatedPosts.map(post => ({
                ...post,
                hook: post.hook || 'Default hook',
                body: post.body || 'Default body',
                cta: post.cta || 'What are your thoughts?'
              }));
              console.log('✅ OpenAI posts generated successfully');
              usedOpenAI = true; // Mark that we used OpenAI
            } else {
              console.log('⚠️ Invalid OpenAI response structure, using fallback');
            }
          } catch (e) {
            console.log('⚠️ OpenAI response parsing failed:', e.message);
          }
        } else {
          const errorText = await openaiResponse.text();
          console.log('⚠️ OpenAI API failed:', openaiResponse.status, errorText);
        }
      } catch (e) {
        console.log('⚠️ OpenAI request error:', e.message);
      }
    }

    // Fallback posts with better randomization (only if OpenAI failed or unavailable)
    if (posts.length === 0) {
      console.log('📝 Using fallback posts with randomized content');
      
      // Create multiple variations and pick randomly
      const randomSeed = Math.floor(Math.random() * 1000);
      const variations = [
        {
          professional: {
            hook: `The biggest mistake in business analytics is thinking data speaks for itself. [${randomSeed}]`,
            body: `Throughout my career in analytics, I have observed that raw data without context is just noise. The real value comes from translating complex datasets into actionable business insights.\n\nSuccessful analytics professionals understand three critical principles:\n\n• Data storytelling drives decision-making\n• Context transforms numbers into strategy\n• Communication bridges the gap between analysis and action\n\nThe most impactful analytics work happens when technical expertise meets business acumen.`,
            cta: 'What has been your experience turning data into actionable insights? Share your approach in the comments.'
          },
          casual: {
            hook: `Here is what nobody tells you about breaking into business analytics. [${randomSeed}]`,
            body: `Starting my analytics journey, I thought it was all about mastering Python and SQL. Boy, was I wrong.\n\nThe real skills that matter:\n\n• Asking the right business questions\n• Translating technical findings for non-technical stakeholders\n• Understanding the story behind the numbers\n• Building relationships across departments\n\nTechnical skills get you in the door, but business sense keeps you valuable.`,
            cta: 'Current and aspiring analysts - what surprised you most about this field? Would love to hear your experiences.'
          },
          bold: {
            hook: `Most companies are drowning in data but starving for insights. [${randomSeed}]`,
            body: `After working with dozens of organizations, I have seen the same pattern repeatedly. Companies invest millions in data infrastructure but fail at the most crucial step: turning information into action.\n\nThe uncomfortable truth:\n\n• 80% of analytics projects never influence a single business decision\n• Executives get overwhelmed by dashboards that answer the wrong questions\n• Teams mistake correlation for causation and call it strategy\n\nWe need fewer data scientists building models and more analytics professionals solving real business problems.`,
            cta: 'Ready to challenge how your organization uses data? What is one analytics myth your company needs to stop believing?'
          }
        },
        {
          professional: {
            hook: `Why most analytics projects fail before they even start. [${randomSeed}]`,
            body: `In my experience working across various industries, I have discovered that successful analytics initiatives share one common trait: they begin with the right questions, not the right data.\n\nKey factors that separate successful projects from failures:\n\n• Clear business objectives defined upfront\n• Stakeholder alignment on success metrics\n• Realistic timelines that account for data quality issues\n• Cross-functional collaboration from day one\n\nThe most valuable analytics professionals are those who can navigate organizational dynamics while delivering technical excellence.`,
            cta: 'Analytics professionals - what is the most important lesson you have learned about project success? Share your insights below.'
          },
          casual: {
            hook: `Plot twist: The hardest part of analytics is not the math. [${randomSeed}]`,
            body: `When I started in analytics, I thought success meant building the most sophisticated models. Three years later, I have learned the real challenge is much more human.\n\nWhat actually matters most:\n\n• Getting people to trust your recommendations\n• Explaining complex concepts in simple terms\n• Building consensus across different teams\n• Managing expectations when data is messy\n\nThe technical skills are table stakes. The soft skills are what make you indispensable.`,
            cta: 'Fellow data folks - what soft skill surprised you the most in this field? Let me know your thoughts.'
          },
          bold: {
            hook: `Hot take: Your fancy dashboard is probably useless. [${randomSeed}]`,
            body: `After auditing analytics implementations across dozens of companies, I have reached a controversial conclusion: most organizations are building the wrong things.\n\nThe harsh reality:\n\n• Beautiful visualizations that nobody uses for decisions\n• Real-time dashboards for metrics that change monthly\n• Complex models that solve problems nobody has\n• Analytics teams isolated from business strategy\n\nWe need to stop building what looks impressive and start building what drives action.`,
            cta: 'Time for some honest reflection - what analytics project seemed great but delivered zero business value? Share your stories.'
          }
        }
      ];

      const chosenVariation = variations[randomSeed % variations.length];
      posts = [
        { tone: 'professional', ...chosenVariation.professional },
        { tone: 'casual', ...chosenVariation.casual },
        { tone: 'bold', ...chosenVariation.bold }
      ];
    }

    console.log('✅ Returning', posts.length, 'posts');

    return new Response(
      JSON.stringify({ 
        posts: posts,
        source: usedOpenAI ? 'openai' : 'fallback',
        message: 'Posts generated successfully',
        timestamp: new Date().toISOString(),
        prompt: prompt
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