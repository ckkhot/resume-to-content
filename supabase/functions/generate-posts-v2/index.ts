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
  const sessionSeed = Math.floor(Math.random() * 10000);
  
  console.log(`🎲 Session seed: ${sessionSeed} for prompt: "${prompt}"`);
  
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
  const isWork = promptLower.includes('work') || promptLower.includes('company') || promptLower.includes('project');
  
  // Create unique context for each post
  const contexts = [
    { 
      tone: 'professional', 
      seed: sessionSeed + 1,
      variation: sessionSeed % 3,
      focus: isJobSearch ? 'strategy' : isGraduation ? 'learning' : 'expertise'
    },
    { 
      tone: 'casual', 
      seed: sessionSeed + 2,
      variation: (sessionSeed + 1) % 3,
      focus: isWork ? 'experience' : isAI ? 'innovation' : 'journey'
    },
    { 
      tone: 'bold', 
      seed: sessionSeed + 3,
      variation: (sessionSeed + 2) % 3,
      focus: isAnalytics ? 'disruption' : isGrowth ? 'transformation' : 'breakthrough'
    }
  ];
  
  // Generate varied posts
  const posts = contexts.map(ctx => ({
    tone: ctx.tone,
    hook: generateContextualHook(ctx.tone, { 
      name, isGraduation, isJobSearch, isAI, isUCDavis, isAnalytics, isWork, prompt, 
      seed: ctx.seed, variation: ctx.variation, focus: ctx.focus 
    }),
    body: generateContextualBody(ctx.tone, { 
      name, skills, education, isGraduation, isJobSearch, isAI, isAnalytics, isUCDavis, isWork, prompt,
      seed: ctx.seed, variation: ctx.variation, focus: ctx.focus
    }),
    cta: generateContextualCTA(ctx.tone, { 
      isGraduation, isJobSearch, isAI, isAnalytics, isWork,
      seed: ctx.seed, variation: ctx.variation, focus: ctx.focus
    })
  }));
  
  console.log(`✅ Generated 3 unique fallback posts with variations: ${contexts.map(c => c.variation).join(', ')}`);
  return posts;
}

function generateContextualHook(tone: string, context: any): string {
  const { name, isGraduation, isJobSearch, isAI, isUCDavis, isAnalytics, isWork, prompt, seed, variation, focus } = context;
  
  // Create multiple variations for each condition
  const variations = {
    professional: {
      graduation_ucdavis: [
        'Completing my MS in Business Analytics at UC Davis has fundamentally shifted my perspective on data-driven leadership.',
        'My graduate experience at UC Davis taught me that analytics mastery requires more than technical skills.',
        'UC Davis equipped me with analytical frameworks, but real-world application taught me everything else.'
      ],
      jobsearch_ai: [
        'The intersection of AI and business strategy is creating unprecedented career opportunities.',
        'After deep research into AI career paths, I\'ve identified the skills that truly matter.',
        'Three months of AI job market analysis revealed surprising patterns about what employers actually want.'
      ],
      analytics: [
        'Five years in analytics has taught me that storytelling trumps statistical sophistication.',
        'The most successful analytics professionals I know share one unexpected trait.',
        'Analytics taught me that the right question matters more than the perfect model.'
      ],
      general: [
        `My experience with ${prompt.split(' ').slice(0,2).join(' ')} has challenged conventional wisdom in surprising ways.`,
        `After extensive work in ${prompt.split(' ')[0]}, I've discovered what truly drives sustainable success.`,
        `Three key insights from my ${prompt.split(' ')[0]} journey that every professional should consider.`
      ]
    },
    casual: {
      graduation_ucdavis: [
        'Just wrapped up my MS at UC Davis and honestly, the real education starts now.',
        'UC Davis gave me the technical foundation, but LinkedIn is teaching me how careers actually work.',
        'Fresh out of grad school at UC Davis with some thoughts on what they don\'t teach you.'
      ],
      jobsearch_ai: [
        'Here\'s what nobody tells you about breaking into AI and growth roles.',
        'Six months of AI job hunting taught me more than any course could.',
        'The AI job market is wild right now - here\'s what I\'ve learned from 50+ applications.'
      ],
      analytics: [
        'Plot twist: The hardest part of analytics isn\'t the math or the code.',
        'Three years in analytics and I finally understand why soft skills matter more.',
        'Analytics bootcamps prepare you for everything except the actual job.'
      ],
      general: [
        `Real talk about ${prompt.toLowerCase()} - it's not what most people think.`,
        `Six months deep into ${prompt.split(' ')[0]} and here's what surprised me most.`,
        `Nobody warned me that ${prompt.split(' ')[0]} would be 20% technical work and 80% everything else.`
      ]
    },
    bold: {
      graduation: [
        'Hot take: Most graduate programs are preparing students for jobs that don\'t exist anymore.',
        'Unpopular opinion: Graduate school teaches you to be an expert in fields that are rapidly becoming obsolete.',
        'Controversial truth: The skills that got me through grad school are barely relevant in the real world.'
      ],
      jobsearch_ai: [
        'Everyone\'s rushing into AI without understanding what actually drives business value.',
        'The AI job market is a bubble built on buzzwords rather than genuine business needs.',
        'Most AI roles are just data analyst positions with inflated titles and salaries.'
      ],
      analytics: [
        'Most companies are drowning in data but still making gut-based decisions.',
        'Analytics is broken: We\'re optimizing metrics that don\'t matter while ignoring what actually drives growth.',
        'The analytics industry has convinced everyone they need more data when they really need better decisions.'
      ],
      general: [
        `Controversial opinion: The ${prompt.split(' ')[0]} industry has it completely backwards.`,
        `Hard truth: Most ${prompt.split(' ')[0]} advice is outdated by the time you hear it.`,
        `Unpopular take: ${prompt.split(' ')[0]} success has more to do with timing than talent.`
      ]
    }
  };

  // Select variation based on seed
  const toneVariations = variations[tone as keyof typeof variations];
  let selectedHooks: string[] = [];
  
  if (tone === 'professional') {
    if (isGraduation && isUCDavis) selectedHooks = toneVariations.graduation_ucdavis;
    else if (isJobSearch && isAI) selectedHooks = toneVariations.jobsearch_ai;
    else if (isAnalytics) selectedHooks = toneVariations.analytics;
    else selectedHooks = toneVariations.general;
  } else if (tone === 'casual') {
    if (isGraduation && isUCDavis) selectedHooks = toneVariations.graduation_ucdavis;
    else if (isJobSearch && isAI) selectedHooks = toneVariations.jobsearch_ai;
    else if (isAnalytics) selectedHooks = toneVariations.analytics;
    else selectedHooks = toneVariations.general;
  } else { // bold
    if (isGraduation) selectedHooks = toneVariations.graduation;
    else if (isJobSearch && isAI) selectedHooks = toneVariations.jobsearch_ai;
    else if (isAnalytics) selectedHooks = toneVariations.analytics;
    else selectedHooks = toneVariations.general;
  }
  
  return selectedHooks[variation % selectedHooks.length];
}

function generateContextualBody(tone: string, context: any): string {
  const { name, skills, education, isGraduation, isJobSearch, isAI, isAnalytics, isUCDavis, isWork, prompt, seed, variation, focus } = context;
  
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
  const { isGraduation, isJobSearch, isAI, isAnalytics, isWork, seed, variation, focus } = context;
  
  // Create multiple CTA variations
  const ctaVariations = {
    professional: {
      graduation: [
        'Fellow recent graduates - what has been your biggest learning curve transitioning from academic theory to professional practice?',
        'Recent grads - what industry reality surprised you most? Share your transition insights.',
        'New graduates - how are you bridging the gap between classroom learning and real-world application?'
      ],
      jobsearch_ai: [
        'AI and analytics professionals - what business problem are you most excited to solve? Share your perspectives.',
        'Fellow AI professionals - what skills gap surprised you most in the current job market?',
        'AI and data professionals - what\'s the most impactful project you\'ve worked on recently?'
      ],
      analytics: [
        'Analytics professionals - what has been your experience bridging technical expertise with business strategy?',
        'Data professionals - what soft skill has had the biggest impact on your career progression?',
        'Fellow analysts - what business metric do you think is most overrated? Most underrated?'
      ],
      general: [
        'What has been your experience balancing technical depth with broader business understanding?',
        'Fellow professionals - what industry trend are you most excited about in the coming year?',
        'What unexpected skill has been most valuable in your career journey so far?'
      ]
    },
    casual: {
      graduation: [
        'Other recent grads - what surprised you most about the transition to professional life? Would love to hear your stories.',
        'Fellow new grads - what\'s the weirdest thing about corporate life that no one warned you about?',
        'Recent graduates - what advice would you give your college self? Drop it in the comments!'
      ],
      jobsearch_ai: [
        'Anyone else navigating the AI job market? What opportunities are you most excited about?',
        'Fellow job seekers in tech - what interview question caught you most off guard?',
        'AI job hunters - what skill are you working on that you wish you\'d started earlier?'
      ],
      analytics: [
        'Fellow data folks - what soft skill has surprised you the most in terms of career impact?',
        'Other analytics professionals - what\'s the most ridiculous data request you\'ve ever received?',
        'Data people - what tool or technique completely changed how you work?'
      ],
      general: [
        'What unexpected skills have been most valuable in your career journey? Share your experiences!',
        'Fellow professionals - what industry myth did you believe for way too long?',
        'What\'s the best career advice you\'ve ever received? (And the worst?)'
      ]
    },
    bold: {
      graduation: [
        'Fellow grads - what industry reality check hit you hardest? Let\'s discuss what needs to change in education.',
        'Recent graduates - what sacred cow in higher education needs to be challenged? Speak up.',
        'New professionals - what skill should universities be teaching but aren\'t? Time for honest feedback.'
      ],
      jobsearch_ai: [
        'Ready to have an honest conversation about AI hype vs. reality? What problems actually need solving?',
        'AI professionals - what buzzword needs to die? What concept needs more attention?',
        'Fellow tech professionals - what AI application is most overrated? Most underrated?'
      ],
      analytics: [
        'Time for some honest reflection - what analytics project seemed impressive but delivered zero business value?',
        'Analytics professionals - what metric is everyone tracking that actually doesn\'t matter?',
        'Data folks - what\'s the most expensive analytics mistake you\'ve seen? (Names redacted, lessons shared.)'
      ],
      general: [
        'What sacred cow in your industry needs to be challenged? Drop your controversial takes below.',
        'Fellow professionals - what widely accepted practice in your field is actually counterproductive?',
        'What industry emperor has no clothes? Time for some honest conversation.'
      ]
    }
  };
  
  const toneVariations = ctaVariations[tone as keyof typeof ctaVariations];
  let selectedCTAs: string[] = [];
  
  if (isGraduation) selectedCTAs = toneVariations.graduation;
  else if (isJobSearch && isAI) selectedCTAs = toneVariations.jobsearch_ai;
  else if (isAnalytics) selectedCTAs = toneVariations.analytics;
  else selectedCTAs = toneVariations.general;
  
  return selectedCTAs[variation % selectedCTAs.length];
}