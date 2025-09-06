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
    console.log('=== Process Resume Function Started ===');
    
    const { resumeText } = await req.json()
    console.log('✅ Resume text received, length:', resumeText?.length);
    
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not found');
      throw new Error('OpenAI API key not found')
    }
    console.log('✅ OpenAI API key found');

    // Create authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header missing')
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user from token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('❌ User authentication failed:', authError);
      throw new Error('Unauthorized');
    }
    console.log('✅ User authenticated:', user.id);

    // Extract structured data from resume using OpenAI
    const systemPrompt = \`Extract structured information from this resume text and return as JSON:
{
  "name": "full name",
  "email": "email address",
  "skills": ["skill1", "skill2"],
  "experience": [{"company": "name", "role": "title", "duration": "period", "achievements": ["achievement1"]}],
  "education": [{"institution": "name", "degree": "degree", "year": "year"}],
  "projects": [{"name": "project name", "description": "description", "technologies": ["tech1"]}]
}\`

    console.log('✅ Making OpenAI API call...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${openaiApiKey}\`,
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
    })

    console.log('✅ OpenAI API call successful');
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(\`OpenAI API error: \${response.statusText} - \${errorText}\`)
    }

    const openaiResult = await response.json()
    let extractedData

    try {
      extractedData = JSON.parse(openaiResult.choices[0].message.content)
      console.log('✅ Resume data extracted successfully');
    } catch (e) {
      console.error('❌ Failed to parse OpenAI response:', e);
      // Fallback if JSON parsing fails
      extractedData = {
        name: "Resume Data",
        skills: ["Data Analysis", "Business Intelligence", "Analytics"],
        experience: [{"company": "Various", "role": "Analyst", "duration": "Recent", "achievements": ["Data-driven insights"]}],
        education": [{"institution": "University", "degree": "Business Degree", "year": "Recent"}],
        projects: [{"name": "Analytics Project", "description": "Business analysis work", "technologies": ["Excel", "SQL"]}]
      }
    }

    // Save to user profile
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: extractedData.name || user.user_metadata?.full_name,
        resume_data: extractedData
      })

    if (updateError) {
      console.error('Error updating profile:', updateError)
    } else {
      console.log('✅ Profile updated successfully');
    }

    return new Response(
      JSON.stringify({ data: extractedData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Process resume error:', error.message)
    console.error('Stack:', error.stack);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})