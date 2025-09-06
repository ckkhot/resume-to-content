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
    console.log('=== Resume processing started ===');
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
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user from token
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      console.error('❌ User authentication failed');
      throw new Error('Unauthorized');
    }
    console.log('✅ User authenticated:', user.id);

    // Extract structured data from resume using OpenAI
    const systemPrompt = `Extract structured information from this resume text and return as JSON:
{
  "name": "full name",
  "email": "email address",
  "skills": ["skill1", "skill2"],
  "experience": [{"company": "name", "role": "title", "duration": "period", "achievements": ["achievement1"]}],
  "education": [{"institution": "name", "degree": "degree", "year": "year"}],
  "projects": [{"name": "project name", "description": "description", "technologies": ["tech1"]}]
}`

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
      throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`)
    }

    const openaiResult = await response.json()
    let extractedData

    try {
      extractedData = JSON.parse(openaiResult.choices[0].message.content)
    } catch (e) {
      // Fallback if JSON parsing fails
      extractedData = {
        name: "Resume Data",
        skills: [],
        experience: [],
        education: [],
        projects: []
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
    }

    return new Response(
      JSON.stringify({ data: extractedData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})