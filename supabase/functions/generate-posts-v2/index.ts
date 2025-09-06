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

  console.log('=== NEW LINKEDIN POSTS GENERATOR START ===');

  try {
    // Parse request
    const { prompt, resumeData } = await req.json();
    console.log('📝 Prompt:', prompt);
    console.log('👤 Resume data present:', !!resumeData);

    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('🔑 OpenAI API Key present:', !!openaiApiKey);
    console.log('🔑 OpenAI API Key length:', openaiApiKey?.length || 0);

    if (!openaiApiKey) {
      console.log('❌ No OpenAI API key found');
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          posts: [],
          source: 'error'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Build user context from resume data
    let userContext = 'Professional seeking LinkedIn content';
    if (resumeData) {
      if (resumeData.name) userContext = `${resumeData.name}`;
      if (resumeData.skills) userContext += ` - Skills: ${resumeData.skills.join(', ')}`;
      if (resumeData.education) {
        const education = resumeData.education.map(e => `${e.degree} from ${e.institution}`).join(', ');
        userContext += ` - Education: ${education}`;
      }
    }

    console.log('👤 User context:', userContext);

    // Create OpenAI prompt
    const timestamp = Date.now();
    const systemPrompt = `You are an expert LinkedIn content creator. Generate exactly 3 unique LinkedIn posts based on the user's prompt and background.

User Background: ${userContext}

Requirements:
- Each post must be completely different in perspective and content
- Start with a compelling, scroll-stopping hook (one sentence)
- Body should be engaging and personal, using bullet points where helpful
- NO emojis anywhere
- End with a strong call-to-action for engagement
- Make it relevant to the user's actual background and experience

Tones:
1. Professional: Industry expertise, thought leadership
2. Casual: Personal story, relatable experience  
3. Bold: Contrarian view, challenges status quo

Return ONLY valid JSON array: [{"tone": "professional", "hook": "...", "body": "...", "cta": "..."}, {"tone": "casual", "hook": "...", "body": "...", "cta": "..."}, {"tone": "bold", "hook": "...", "body": "...", "cta": "..."}]`;

    const userPrompt = `Topic: "${prompt}"

Generate 3 completely unique LinkedIn posts about this topic. Each post should offer a different perspective and incorporate the user's background naturally. Timestamp: ${timestamp}`;

    console.log('🚀 Making OpenAI API call...');

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2500,
      }),
    });

    console.log('📡 OpenAI response status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.log('❌ OpenAI API error:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `OpenAI API error: ${openaiResponse.status}`,
          details: errorText,
          posts: [],
          source: 'error'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const openaiResult = await openaiResponse.json();
    console.log('✅ OpenAI response received');

    try {
      const responseContent = openaiResult.choices[0].message.content;
      console.log('📄 Response content length:', responseContent.length);
      
      const generatedPosts = JSON.parse(responseContent);
      
      if (Array.isArray(generatedPosts) && generatedPosts.length === 3) {
        console.log('✅ Successfully generated 3 posts with OpenAI');
        
        return new Response(
          JSON.stringify({
            posts: generatedPosts,
            source: 'openai',
            message: 'Posts generated successfully with OpenAI',
            timestamp: new Date().toISOString(),
            prompt: prompt
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('⚠️ Invalid posts format from OpenAI');
        throw new Error('Invalid response format');
      }
    } catch (parseError) {
      console.log('❌ Failed to parse OpenAI response:', parseError.message);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse OpenAI response',
          posts: [],
          source: 'error',
          details: parseError.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Function error:', error.message);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error: ' + error.message,
        posts: [],
        source: 'error',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})