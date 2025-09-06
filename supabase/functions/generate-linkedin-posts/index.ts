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
        // Build comprehensive personalized context from resume
        let userContext = 'User is a business professional';
        let skillsContext = '';
        let experienceContext = '';
        
        if (resumeData) {
          if (resumeData.name) userContext = `User: ${resumeData.name}`;
          if (resumeData.email) userContext += ` (${resumeData.email})`;
          
          if (resumeData.skills && resumeData.skills.length > 0) {
            skillsContext = `\nTechnical Skills: ${resumeData.skills.join(', ')}`;
          }
          
          if (resumeData.experience && resumeData.experience.length > 0) {
            experienceContext = `\nProfessional Experience: ${resumeData.experience.map(exp => 
              `${exp.role} at ${exp.company} (${exp.duration})`
            ).join('; ')}`;
          }
          
          if (resumeData.education && resumeData.education.length > 0) {
            experienceContext += `\nEducation: ${resumeData.education.map(edu =>
              `${edu.degree} from ${edu.institution} (${edu.year})`
            ).join('; ')}`;
          }
        }

        // Enhanced system prompt with better resume integration
        const systemPrompt = `You are an expert LinkedIn content strategist. Create 3 completely unique and dynamic LinkedIn posts based on the user's specific prompt and background.

${userContext}${skillsContext}${experienceContext}

CRITICAL REQUIREMENTS:
- Each post must be completely different in perspective, tone, and content
- Incorporate the user's actual background and prompt topic seamlessly
- Start with a sticky, scroll-stopping, one sentence hook that grabs attention
- Body should tell a story using the user's real experience and skills
- Use bullet points strategically for key insights
- NO EMOJIS anywhere in the content
- End with a compelling CTA that encourages engagement (comments, likes, shares)

TONE VARIATIONS (each completely different):
1. Professional: Authoritative, industry-focused, thought leadership
2. Casual: Personal, relatable, behind-the-scenes insights  
3. Bold: Contrarian, provocative, challenges conventional thinking

UNIQUENESS: Make each post offer a completely different angle on the topic. Use different examples, perspectives, and insights. Never repeat similar ideas across posts.

Return ONLY valid JSON: [{"tone": "professional", "hook": "...", "body": "...", "cta": "..."}, {"tone": "casual", "hook": "...", "body": "...", "cta": "..."}, {"tone": "bold", "hook": "...", "body": "...", "cta": "..."}]`;

        // Create dynamic prompt with timestamp and user specifics
        const timestamp = Date.now();
        const randomVariation = Math.floor(Math.random() * 100);
        
        const userPrompt = `Topic: "${prompt}"

Context: Generate posts that specifically relate to this topic while incorporating the user's background and experience. Each post should offer a completely unique perspective.

Requirements:
- Make it personal and specific to the user's background
- Each of the 3 posts should approach the topic from entirely different angles
- Use real insights that would come from someone with their experience
- Variation Seed: ${timestamp}-${randomVariation} (ensure each generation is unique)`;

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
          console.log('🔍 OpenAI response received, status:', openaiResponse.status);
          
          try {
            const responseContent = openaiResult.choices[0].message.content;
            console.log('🔍 OpenAI raw response length:', responseContent.length);
            console.log('🔍 OpenAI response preview:', responseContent.substring(0, 300) + '...');
            
            const generatedPosts = JSON.parse(responseContent);
            console.log('🔍 Parsed posts count:', generatedPosts?.length, 'Type:', Array.isArray(generatedPosts));
            
            if (Array.isArray(generatedPosts) && generatedPosts.length === 3) {
              // Validate each post has required fields
              const validPosts = generatedPosts.filter(post => 
                post.tone && post.hook && post.body && post.cta
              );
              
              if (validPosts.length === 3) {
                posts = validPosts.map(post => ({
                  tone: post.tone,
                  hook: post.hook || 'Generated hook',
                  body: post.body || 'Generated body',
                  cta: post.cta || 'Share your thoughts!'
                }));
                console.log('✅ OpenAI generated 3 valid posts successfully');
                usedOpenAI = true;
              } else {
                console.log('⚠️ Some posts missing required fields. Valid:', validPosts.length, '/3');
              }
            } else {
              console.log('⚠️ Invalid OpenAI response structure. Expected 3 posts, got:', generatedPosts?.length);
            }
          } catch (e) {
            console.log('⚠️ OpenAI response parsing failed:', e.message);
            console.log('⚠️ Raw response:', openaiResult.choices?.[0]?.message?.content);
          }
        } else {
          const errorText = await openaiResponse.text();
          console.log('⚠️ OpenAI API failed:', openaiResponse.status, openaiResponse.statusText);
          console.log('⚠️ Error details:', errorText);
        }
      } catch (e) {
        console.log('⚠️ OpenAI request error:', e.message);
      }
    }

    // Enhanced fallback posts with user prompt integration (only if OpenAI failed)
    if (posts.length === 0) {
      console.log('📝 Using enhanced fallback posts with prompt integration');
      
      // Extract key topics from user prompt for more relevant content
      const promptLower = prompt.toLowerCase();
      const isGraduation = promptLower.includes('graduation') || promptLower.includes('graduate') || promptLower.includes('degree');
      const isAnalytics = promptLower.includes('analytics') || promptLower.includes('data');
      const isUCDavis = promptLower.includes('uc davis') || promptLower.includes('davis');
      
      const randomSeed = Math.floor(Math.random() * 1000);
      const variations = [
        {
          professional: {
            hook: isGraduation 
              ? `Completing my ${isAnalytics ? 'MS in Business Analytics' : 'graduate program'} has taught me that success isn't about the degree itself. [${randomSeed}]`
              : `The biggest mistake in business analytics is thinking data speaks for itself. [${randomSeed}]`,
            body: isGraduation
              ? `${isUCDavis ? 'My time at UC Davis' : 'Graduate school'} has reinforced that ${isAnalytics ? 'analytics excellence' : 'professional success'} comes from understanding both technical skills and business context.\n\nKey insights from my ${isAnalytics ? 'analytics' : 'academic'} journey:\n\n• Technical expertise must be paired with business acumen\n• Communication skills are as important as analytical capabilities\n• Real-world applications differ significantly from classroom theory\n• Cross-functional collaboration drives meaningful impact\n\nThe most valuable professionals bridge the gap between complex analysis and actionable business strategy.`
              : `Throughout my career in analytics, I have observed that raw data without context is just noise. The real value comes from translating complex datasets into actionable business insights.\n\nSuccessful analytics professionals understand three critical principles:\n\n• Data storytelling drives decision-making\n• Context transforms numbers into strategy\n• Communication bridges the gap between analysis and action\n\nThe most impactful analytics work happens when technical expertise meets business acumen.`,
            cta: isGraduation
              ? `Fellow ${isAnalytics ? 'analytics' : ''} graduates - what has been your biggest learning curve transitioning from academic theory to professional practice?`
              : 'What has been your experience turning data into actionable insights? Share your approach in the comments.'
          },
          casual: {
            hook: isGraduation
              ? `Just wrapped up my ${isAnalytics ? 'MS in Business Analytics' : 'graduate program'} and honestly, the real learning is just beginning. [${randomSeed}]`
              : `Here is what nobody tells you about breaking into business analytics. [${randomSeed}]`,
            body: isGraduation
              ? `${isUCDavis ? 'UC Davis' : 'Grad school'} taught me the fundamentals, but the working world is teaching me everything else.\n\nWhat ${isAnalytics ? 'analytics' : 'graduate'} school didn't prepare me for:\n\n• How messy real-world data actually is\n• The politics of getting stakeholders to trust your analysis\n• That 80% of the job is explaining things to non-technical people\n• How much business context matters for good analysis\n\n${isAnalytics ? 'The algorithms and models were the easy part' : 'The technical skills were just the foundation'}. The human element is where the real challenge lies.`
              : `Starting my analytics journey, I thought it was all about mastering Python and SQL. Boy, was I wrong.\n\nThe real skills that matter:\n\n• Asking the right business questions\n• Translating technical findings for non-technical stakeholders\n• Understanding the story behind the numbers\n• Building relationships across departments\n\nTechnical skills get you in the door, but business sense keeps you valuable.`,
            cta: isGraduation
              ? `Other recent ${isAnalytics ? 'analytics' : ''} grads - what has surprised you most about the transition to professional life?`
              : 'Current and aspiring analysts - what surprised you most about this field? Would love to hear your experiences.'
          },
          bold: {
            hook: isGraduation
              ? `Hot take: Most ${isAnalytics ? 'analytics' : ''} graduate programs are preparing students for jobs that don't exist. [${randomSeed}]`
              : `Most companies are drowning in data but starving for insights. [${randomSeed}]`,
            body: isGraduation
              ? `Just finished my ${isAnalytics ? 'MS in Business Analytics' : 'graduate degree'} and I am convinced that academia is still catching up to industry reality.\n\nWhat ${isAnalytics ? 'analytics' : ''} programs get wrong:\n\n• Too much focus on perfect, clean datasets\n• Not enough emphasis on stakeholder management\n• Overemphasis on complex models vs. simple, actionable insights\n• Missing the soft skills that actually drive career success\n\n${isUCDavis ? 'UC Davis gave me a solid foundation' : 'My program taught me the basics'}, but the real education starts now. We need ${isAnalytics ? 'analytics' : ''} programs that teach students how to navigate organizational politics, not just algorithms.`
              : `After working with dozens of organizations, I have seen the same pattern repeatedly. Companies invest millions in data infrastructure but fail at the most crucial step: turning information into action.\n\nThe uncomfortable truth:\n\n• 80% of analytics projects never influence a single business decision\n• Executives get overwhelmed by dashboards that answer the wrong questions\n• Teams mistake correlation for causation and call it strategy\n\nWe need fewer data scientists building models and more analytics professionals solving real business problems.`,
            cta: isGraduation
              ? `Fellow ${isAnalytics ? 'analytics' : ''} grads - what industry reality check hit you hardest? Let's discuss what needs to change in education.`
              : 'Ready to challenge how your organization uses data? What is one analytics myth your company needs to stop believing?'
          }
        }
      ];

      const chosenVariation = variations[0]; // Use the context-aware variation
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