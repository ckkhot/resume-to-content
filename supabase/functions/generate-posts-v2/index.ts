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

    // Try OpenAI first if API key is available
    if (openaiApiKey) {
      try {
        console.log('🚀 Making OpenAI API call...');

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

        if (openaiResponse.ok) {
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
            }
          } catch (parseError) {
            console.log('❌ Failed to parse OpenAI response:', parseError.message);
          }
        } else {
          const errorText = await openaiResponse.text();
          console.log('❌ OpenAI API error:', errorText);
        }
      } catch (openaiError) {
        console.log('❌ OpenAI request failed:', openaiError.message);
      }
    }

    // Generate intelligent fallback posts (always as fallback)
    console.log('🔄 Generating intelligent fallback posts with user context...');
    const fallbackPosts = generateIntelligentFallback(prompt, resumeData, userContext);
    
    return new Response(
      JSON.stringify({
        posts: fallbackPosts,
        source: 'intelligent_fallback',
        message: 'Posts generated with intelligent fallback (OpenAI unavailable/failed)',
        timestamp: new Date().toISOString(),
        prompt: prompt
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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

// Intelligent fallback function that creates truly dynamic posts
function generateIntelligentFallback(prompt: string, resumeData: any, userContext: string): any[] {
  const timestamp = Date.now();
  const randomSeed = Math.floor(Math.random() * 1000);
  
  // Extract key information
  const name = resumeData?.name || 'Professional';
  const skills = resumeData?.skills || [];
  const education = resumeData?.education?.[0] || {};
  const isUCDavis = education.institution?.includes('UC Davis') || education.institution?.includes('Davis');
  const isAnalytics = skills.some(s => s.toLowerCase().includes('analytics')) || education.degree?.includes('Analytics');
  
  // Analyze prompt for key themes
  const promptLower = prompt.toLowerCase();
  const isGraduation = promptLower.includes('grad') || promptLower.includes('graduation') || promptLower.includes('degree');
  const isJobSearch = promptLower.includes('job') || promptLower.includes('opportunity') || promptLower.includes('career');
  const isAI = promptLower.includes('ai') || promptLower.includes('artificial intelligence') || promptLower.includes('machine learning');
  const isGrowth = promptLower.includes('growth') || promptLower.includes('development');
  
  // Generate context-aware posts
  const posts = [
    {
      tone: 'professional',
      hook: generateContextualHook('professional', { name, isGraduation, isJobSearch, isAI, isUCDavis, isAnalytics, prompt, randomSeed }),
      body: generateContextualBody('professional', { name, skills, education, isGraduation, isJobSearch, isAI, isAnalytics, isUCDavis, prompt }),
      cta: generateContextualCTA('professional', { isGraduation, isJobSearch, isAI, isAnalytics })
    },
    {
      tone: 'casual',
      hook: generateContextualHook('casual', { name, isGraduation, isJobSearch, isAI, isUCDavis, isAnalytics, prompt, randomSeed }),
      body: generateContextualBody('casual', { name, skills, education, isGraduation, isJobSearch, isAI, isAnalytics, isUCDavis, prompt }),
      cta: generateContextualCTA('casual', { isGraduation, isJobSearch, isAI, isAnalytics })
    },
    {
      tone: 'bold',
      hook: generateContextualHook('bold', { name, isGraduation, isJobSearch, isAI, isUCDavis, isAnalytics, prompt, randomSeed }),
      body: generateContextualBody('bold', { name, skills, education, isGraduation, isJobSearch, isAI, isAnalytics, isUCDavis, prompt }),
      cta: generateContextualCTA('bold', { isGraduation, isJobSearch, isAI, isAnalytics })
    }
  ];
  
  console.log('✅ Generated 3 intelligent fallback posts with context');
  return posts;
}

function generateContextualHook(tone: string, context: any): string {
  const { name, isGraduation, isJobSearch, isAI, isUCDavis, isAnalytics, prompt, randomSeed } = context;
  
  if (tone === 'professional') {
    if (isGraduation && isUCDavis) return `Completing my MS in Business Analytics at UC Davis has fundamentally changed how I approach data-driven decision making. [${randomSeed}]`;
    if (isJobSearch && isAI) return `The intersection of AI and business strategy is where the most impactful career opportunities exist today. [${randomSeed}]`;
    if (isAnalytics) return `Three years in analytics has taught me that technical skills are just the foundation of real business impact. [${randomSeed}]`;
    return `My journey in ${prompt.split(' ')[0]} has revealed insights that every professional should understand. [${randomSeed}]`;
  }
  
  if (tone === 'casual') {
    if (isGraduation && isUCDavis) return `Just wrapped up my MS at UC Davis and honestly, the real learning starts now. [${randomSeed}]`;
    if (isJobSearch && isAI) return `Here's what nobody tells you about breaking into AI and growth roles. [${randomSeed}]`;
    if (isAnalytics) return `Plot twist: The hardest part of analytics isn't the math or the code. [${randomSeed}]`;
    return `Real talk about ${prompt.toLowerCase()} - it's not what most people think. [${randomSeed}]`;
  }
  
  // Bold tone
  if (isGraduation) return `Hot take: Most graduate programs are preparing students for jobs that don't exist anymore. [${randomSeed}]`;
  if (isJobSearch && isAI) return `Everyone's rushing into AI without understanding what actually drives business value. [${randomSeed}]`;
  if (isAnalytics) return `Most companies are drowning in data but still making gut-based decisions. [${randomSeed}]`;
  return `Controversial opinion: The ${prompt.split(' ')[0]} industry has it completely backwards. [${randomSeed}]`;
}

function generateContextualBody(tone: string, context: any): string {
  const { name, skills, education, isGraduation, isJobSearch, isAI, isAnalytics, isUCDavis, prompt } = context;
  
  const skillsList = skills.length > 0 ? skills.slice(0, 4).join(', ') : 'technical and analytical skills';
  const degree = education.degree || 'graduate program';
  const institution = education.institution || 'university';
  
  if (tone === 'professional') {
    if (isGraduation && isUCDavis) {
      return `My experience at UC Davis pursuing a ${degree} has reinforced that success in today's market requires more than technical proficiency.\n\nKey insights from my academic and professional journey:\n\n• ${skillsList} are essential, but business acumen drives real impact\n• Cross-functional collaboration multiplies individual expertise\n• Understanding stakeholder needs is as critical as technical execution\n• Real-world applications often differ significantly from academic models\n\nThe most valuable professionals bridge the gap between technical capability and strategic business outcomes.`;
    }
    
    if (isJobSearch && isAI) {
      return `As someone with expertise in ${skillsList}, I've observed that the most successful AI implementations focus on solving specific business problems rather than showcasing technology.\n\nWhat separates successful AI professionals:\n\n• Deep understanding of business context and customer needs\n• Ability to translate complex technical concepts for stakeholders\n• Focus on measurable business outcomes over algorithmic sophistication\n• Strong communication and project management capabilities\n\nThe future belongs to those who can combine technical expertise with strategic business thinking.`;
    }
    
    return `Through my work with ${skillsList} and experience in ${prompt.toLowerCase()}, I've learned that sustainable success requires a multifaceted approach.\n\nCritical success factors I've identified:\n\n• Technical excellence as the foundation, not the ceiling\n• Continuous learning and adaptation to industry changes\n• Building strong professional networks and mentor relationships\n• Understanding the broader business context of technical decisions\n\nThe professionals who thrive are those who combine deep expertise with broad business understanding.`;
  }
  
  if (tone === 'casual') {
    if (isGraduation && isUCDavis) {
      return `UC Davis taught me ${skillsList}, but the working world is teaching me everything else.\n\nWhat my ${degree} didn't prepare me for:\n\n• How messy real-world data actually is\n• The amount of time spent explaining technical concepts to non-technical stakeholders\n• How much politics and relationship-building matter\n• That soft skills often matter more than technical skills for career advancement\n\nTurns out ${isAnalytics ? 'the algorithms were the easy part' : 'the technical knowledge was just the entry fee'}. The human element is where the real challenge lies.`;
    }
    
    if (isJobSearch && isAI) {
      return `Everyone's talking about AI taking jobs, but I'm seeing the opposite - it's creating entirely new types of opportunities.\n\nWhat I've learned about ${isAI ? 'AI and growth' : prompt} roles:\n\n• Companies need people who can bridge technical and business teams\n• Understanding customer problems is more valuable than knowing every algorithm\n• Communication skills are just as important as ${skillsList}\n• The best opportunities are in companies that see AI as a business tool, not just tech\n\nThe sweet spot is being technical enough to understand the possibilities but business-minded enough to focus on what actually matters.`;
    }
    
    return `Starting my career, I thought success was all about mastering ${skillsList}. Three years later, I've learned the real game is much more complex.\n\nWhat actually matters in ${prompt.toLowerCase()}:\n\n• Building relationships across different departments\n• Understanding the business impact of your technical work\n• Being able to explain complex concepts simply\n• Knowing when to say no to technically interesting but business-irrelevant projects\n\nTechnical skills got me in the door. Everything else is keeping me valuable.`;
  }
  
  // Bold tone
  if (isGraduation) {
    return `Just finished my ${degree} at ${institution} and I'm convinced that higher education is failing to prepare students for the reality of modern work.\n\nWhat's broken in ${isAnalytics ? 'analytics' : 'graduate'} education:\n\n• Too much focus on perfect, clean datasets that don't exist in the real world\n• Zero emphasis on stakeholder management and organizational politics\n• Obsession with complex models when simple solutions drive more business value\n• Complete lack of training in communication and change management\n\n${isUCDavis ? 'UC Davis gave me solid technical foundations' : 'My program taught valuable concepts'}, but the real education starts when you realize that ${skillsList} are just table stakes. We need to completely reimagine how we prepare people for careers in ${isAnalytics ? 'data-driven' : 'technical'} roles.`;
  }
  
  if (isJobSearch && isAI) {
    return `Everyone's rushing to add AI to their resume without understanding what actually creates business value.\n\nThe harsh reality about AI and growth roles:\n\n• 90% of AI projects fail because they solve the wrong problems\n• Companies are hiring for AI expertise but what they really need is business problem-solving\n• Most AI implementations are expensive solutions looking for problems\n• The real opportunities are in companies that understand AI is a means, not an end\n\nWe need fewer people building impressive models and more people who can identify where AI actually drives business outcomes. My ${skillsList} background taught me that the most sophisticated solution is usually the wrong one.`;
  }
  
  return `After working in ${prompt.toLowerCase()} for the past few years, I've come to a controversial conclusion: we're solving the wrong problems.\n\nWhat the industry gets wrong:\n\n• Obsession with technical complexity over business simplicity\n• Building solutions that impress other technologists but confuse customers\n• Focusing on what's technically possible instead of what's actually needed\n• Treating ${skillsList} as the end goal rather than the means to solve real problems\n\nThe most successful professionals I know aren't the ones with the most impressive technical portfolios. They're the ones who can take complex capabilities and apply them to solve simple, valuable business problems.`;
}

function generateContextualCTA(tone: string, context: any): string {
  const { isGraduation, isJobSearch, isAI, isAnalytics } = context;
  
  if (tone === 'professional') {
    if (isGraduation) return 'Fellow recent graduates - what has been your biggest learning curve transitioning from academic theory to professional practice?';
    if (isJobSearch && isAI) return 'AI and analytics professionals - what business problem are you most excited to solve? Share your perspectives.';
    if (isAnalytics) return 'Analytics professionals - what has been your experience bridging technical expertise with business strategy?';
    return 'What has been your experience balancing technical depth with broader business understanding?';
  }
  
  if (tone === 'casual') {
    if (isGraduation) return 'Other recent grads - what surprised you most about the transition to professional life? Would love to hear your stories.';
    if (isJobSearch && isAI) return 'Anyone else navigating the AI job market? What opportunities are you most excited about?';
    if (isAnalytics) return 'Fellow data folks - what soft skill has surprised you the most in terms of career impact?';
    return 'What unexpected skills have been most valuable in your career journey? Share your experiences!';
  }
  
  // Bold tone
  if (isGraduation) return 'Fellow grads - what industry reality check hit you hardest? Let\'s discuss what needs to change in education.';
  if (isJobSearch && isAI) return 'Ready to have an honest conversation about AI hype vs. reality? What problems actually need solving?';
  if (isAnalytics) return 'Time for some honest reflection - what analytics project seemed impressive but delivered zero business value?';
  return 'What sacred cow in your industry needs to be challenged? Drop your controversial takes below.';
}