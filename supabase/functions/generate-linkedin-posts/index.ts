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
    console.log('Function invoked');
    const { prompt, resumeData } = await req.json()
    console.log('Request body parsed:', { prompt: prompt?.substring(0, 50) + '...', hasResumeData: !!resumeData });
    
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    console.log('OpenAI API key present:', !!openaiApiKey);
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found')
    }

    // Create authorization header
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user from token
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Prepare system prompt with resume context
    const systemPrompt = `You are a LinkedIn content expert. Generate 3 high-quality LinkedIn posts based on the user's resume and prompt.

Resume context: ${resumeData ? JSON.stringify(resumeData) : 'No resume data provided'}

Generate posts in different tones:
1. Professional and insightful
2. Casual and relatable  
3. Bold and attention-grabbing

Each post should have:
- A compelling hook (1-2 lines)
- A narrative body with specific examples
- A clear call-to-action

Return as JSON array with objects containing: { tone, hook, body, cta }`

    console.log('Making OpenAI API call...');
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
    })

    console.log('OpenAI response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error details:', errorText);
      throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`)
    }

    const openaiResult = await response.json()
    console.log('OpenAI result received');
    let posts

    try {
      posts = JSON.parse(openaiResult.choices[0].message.content)
    } catch (e) {
      // Fallback if JSON parsing fails
      const content = openaiResult.choices[0].message.content
      posts = [
        {
          tone: 'professional',
          hook: 'Professional insight generated',
          body: content,
          cta: 'What are your thoughts?'
        }
      ]
    }

    // Save posts to database
    const { data: savedPosts, error: saveError } = await supabaseClient
      .from('linkedin_posts')
      .insert(
        posts.map((post: any) => ({
          user_id: user.id,
          title: post.hook,
          content: `${post.hook}\n\n${post.body}\n\n${post.cta}`,
          post_type: 'generated',
          tone: post.tone || 'professional'
        }))
      )
      .select()

    if (saveError) {
      console.error('Error saving posts:', saveError)
    }

    return new Response(
      JSON.stringify({ posts, savedPosts }),
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