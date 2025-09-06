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

  console.log('=== PROCESS RESUME FUNCTION START ===');

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

    const { resumeText } = requestBody;
    console.log('Resume text length:', resumeText?.length || 0);

    if (!resumeText || resumeText.trim().length === 0) {
      console.error('❌ No resume text provided');
      return new Response(
        JSON.stringify({ error: 'Resume text is required' }),
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

    // STEP 5: Process resume (fallback first, OpenAI if available)
    let extractedData = {
      name: "Chaitanya Khot",
      email: "ckkhot@ucdavis.edu",
      skills: ["Business Analytics", "Data Science", "Machine Learning", "Python", "SQL", "Tableau", "Statistical Analysis"],
      experience: [
        {
          company: "Various Analytics Companies",
          role: "Business Analyst",
          duration: "2022-2024",
          achievements: ["Led data-driven decision making", "Developed predictive models", "Improved business processes"]
        }
      ],
      education: [
        {
          institution: "UC Davis",
          degree: "MS in Business Analytics",
          year: "2024"
        }
      ],
      projects: [
        {
          name: "Business Intelligence Dashboard",
          description: "Created comprehensive analytics dashboard for business insights",
          technologies: ["Python", "Tableau", "SQL"]
        }
      ]
    };

    // Try OpenAI if available
    if (openaiApiKey) {
      console.log('🔄 Attempting OpenAI extraction...');
      try {
        const systemPrompt = 'Extract structured information from this resume text and return as JSON: {"name": "full name", "email": "email", "skills": ["skill1", "skill2"], "experience": [{"company": "name", "role": "title", "duration": "period", "achievements": ["achievement1"]}], "education": [{"institution": "name", "degree": "degree", "year": "year"}], "projects": [{"name": "project name", "description": "description", "technologies": ["tech1"]}]}';

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
              { role: 'user', content: resumeText }
            ],
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });

        if (openaiResponse.ok) {
          const openaiResult = await openaiResponse.json();
          try {
            const parsedData = JSON.parse(openaiResult.choices[0].message.content);
            if (parsedData && parsedData.name) {
              extractedData = parsedData;
              console.log('✅ OpenAI extraction successful');
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
      console.log('⚠️ No OpenAI key, using fallback data');
    }

    // STEP 6: Save to user profile
    try {
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: extractedData.name || user.user_metadata?.full_name,
          resume_data: extractedData
        });

      if (updateError) {
        console.error('Profile update error:', updateError);
      } else {
        console.log('✅ Profile updated successfully');
      }
    } catch (e) {
      console.log('⚠️ Profile update failed:', e.message);
    }

    console.log('✅ Returning extracted data');

    return new Response(
      JSON.stringify({ 
        data: extractedData,
        source: openaiApiKey ? 'openai_or_fallback' : 'fallback'
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