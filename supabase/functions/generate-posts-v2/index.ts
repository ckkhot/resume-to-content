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
  // Generate completely random seed for each request to ensure uniqueness
  const timestamp = Date.now();
  const randomComponent = Math.floor(Math.random() * 100000);
  const sessionSeed = (timestamp + randomComponent) % 10000;
  
  console.log(`🎲 Session seed: ${sessionSeed} for prompt: "${prompt}" (timestamp: ${timestamp})`);
  
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
  
  // Generate completely random variations for each post to ensure uniqueness
  const randomVariations = [
    Math.floor(Math.random() * 3),
    Math.floor(Math.random() * 3),
    Math.floor(Math.random() * 3)
  ];
  
  // Force different variations for each post to ensure uniqueness
  const uniqueVariations = [
    Math.floor(Math.random() * 3),
    Math.floor(Math.random() * 3),
    Math.floor(Math.random() * 3)
  ];
  
  // Ensure all three are different
  while (uniqueVariations[1] === uniqueVariations[0]) {
    uniqueVariations[1] = Math.floor(Math.random() * 3);
  }
  while (uniqueVariations[2] === uniqueVariations[0] || uniqueVariations[2] === uniqueVariations[1]) {
    uniqueVariations[2] = Math.floor(Math.random() * 3);
  }
  
  console.log(`🎯 Forcing unique variations: ${uniqueVariations.join(', ')}`);
  
  // Create unique context for each post with guaranteed different variations
  const contexts = [
    { 
      tone: 'professional', 
      seed: sessionSeed + Math.floor(Math.random() * 100),
      variation: uniqueVariations[0],
      focus: isJobSearch ? 'strategy' : isGraduation ? 'learning' : 'expertise',
      randomSalt: Math.floor(Math.random() * 1000)
    },
    { 
      tone: 'casual', 
      seed: sessionSeed + Math.floor(Math.random() * 100) + 50,
      variation: uniqueVariations[1],
      focus: isWork ? 'experience' : isAI ? 'innovation' : 'journey',
      randomSalt: Math.floor(Math.random() * 1000)
    },
    { 
      tone: 'bold', 
      seed: sessionSeed + Math.floor(Math.random() * 100) + 100,
      variation: uniqueVariations[2],
      focus: isAnalytics ? 'disruption' : isGrowth ? 'transformation' : 'breakthrough',
      randomSalt: Math.floor(Math.random() * 1000)
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
  
  console.log(`✅ Generated 3 unique fallback posts with guaranteed different variations: ${uniqueVariations.join(', ')}`);
  return posts;
}

function generateContextualHook(tone: string, context: any): string {
  const { name, isGraduation, isJobSearch, isAI, isUCDavis, isAnalytics, isWork, prompt, seed, variation, focus, randomSalt } = context;
  
  // Dynamic content elements that change each time
  const timestamp = Date.now();
  const uniqueId = (timestamp + randomSalt + seed) % 1000;
  
  // Random dynamic elements
  const timeframes = ['Three years', 'Six months', 'Two years', 'Five years', 'A decade', 'Six weeks', 'Eight months'];
  const insights = ['taught me', 'showed me', 'revealed', 'made me realize', 'convinced me', 'proved to me', 'demonstrated'];
  const surprises = ['Plot twist:', 'Here\'s the thing:', 'Real talk:', 'Turns out:', 'Honestly,', 'Fun fact:', 'Reality check:'];
  const controversials = ['Hot take:', 'Unpopular opinion:', 'Controversial truth:', 'Hard reality:', 'Uncomfortable fact:', 'Bold statement:'];
  
  // Get random elements based on the unique ID
  const randomTimeframe = timeframes[uniqueId % timeframes.length];
  const randomInsight = insights[(uniqueId + randomSalt) % insights.length];
  const randomSurprise = surprises[(uniqueId + seed) % surprises.length];
  const randomControversial = controversials[uniqueId % controversials.length];
  
  // Extract random words from prompt for dynamic integration
  const promptWords = prompt.split(' ').filter(word => word.length > 3);
  const randomPromptWord = promptWords.length > 0 ? promptWords[uniqueId % promptWords.length] : 'professional growth';
  
  // Generate completely dynamic content based on tone and context
  if (tone === 'professional') {
    const professional_starters = [
      `${randomTimeframe} in ${randomPromptWord} has fundamentally changed my approach to ${focus}.`,
      `My journey through ${isUCDavis ? 'UC Davis and ' : ''}${randomPromptWord} ${randomInsight} that success requires ${focus}.`,
      `After ${randomTimeframe.toLowerCase()} of ${prompt.toLowerCase()}, I've discovered what truly drives ${focus}.`,
      `The intersection of ${randomPromptWord} and ${focus} is creating opportunities I never expected.`,
      `Working in ${randomPromptWord} has ${randomInsight} that ${focus} isn't what most people think.`
    ];
    return professional_starters[uniqueId % professional_starters.length];
  }
  
  if (tone === 'casual') {
    const casual_starters = [
      `${randomSurprise} ${randomTimeframe} of ${randomPromptWord} and I finally get why ${focus} matters.`,
      `Just spent ${randomTimeframe.toLowerCase()} in ${prompt.toLowerCase()} and here's what nobody tells you.`,
      `${randomSurprise} The hardest part of ${randomPromptWord} isn't the technical stuff.`,
      `Six months ago I thought ${randomPromptWord} was about X. Turns out it's all about ${focus}.`,
      `${randomSurprise} ${randomPromptWord} ${randomInsight} me more about ${focus} than I expected.`
    ];
    return casual_starters[uniqueId % casual_starters.length];
  }
  
  // Bold tone
  const bold_starters = [
    `${randomControversial} The ${randomPromptWord} industry has ${focus} completely backwards.`,
    `${randomControversial} Most ${randomPromptWord} advice ignores the real driver of ${focus}.`,
    `Everyone's obsessing over ${randomPromptWord} while missing what actually creates ${focus}.`,
    `${randomControversial} ${randomPromptWord} success has more to do with ${focus} than talent.`,
    `The ${randomPromptWord} industry is broken because it prioritizes complexity over ${focus}.`
  ];
  return bold_starters[uniqueId % bold_starters.length];
}

function generateContextualBody(tone: string, context: any): string {
  const { name, skills, education, isGraduation, isJobSearch, isAI, isAnalytics, isUCDavis, isWork, prompt, seed, variation, focus, randomSalt } = context;
  
  const skillsList = skills.length > 0 ? skills.slice(0, 4).join(', ') : 'technical and analytical skills';
  const degree = education.degree || 'graduate program';
  const institution = education.institution || 'university';
  
  // Dynamic content generators
  const timestamp = Date.now();
  const uniqueId = (timestamp + randomSalt + seed) % 1000;
  
  // Random dynamic content pools
  const challenges = ['messy real-world data', 'stakeholder expectations', 'budget constraints', 'timeline pressures', 'team dynamics', 'changing requirements'];
  const outcomes = ['business impact', 'scalable solutions', 'measurable results', 'strategic value', 'competitive advantage', 'operational efficiency'];
  const learnings = ['communication skills', 'strategic thinking', 'stakeholder management', 'project leadership', 'business acumen', 'technical depth'];
  const insights = ['industry changes', 'market dynamics', 'customer behavior', 'technology trends', 'business needs', 'competitive landscape'];
  
  const randomChallenge = challenges[uniqueId % challenges.length];
  const randomOutcome = outcomes[(uniqueId + randomSalt) % outcomes.length];
  const randomLearning = learnings[(uniqueId + seed) % learnings.length];
  const randomInsight = insights[uniqueId % insights.length];
  
  // Extract and use prompt context dynamically
  const promptWords = prompt.split(' ').filter(word => word.length > 3);
  const keyWord = promptWords.length > 0 ? promptWords[uniqueId % promptWords.length] : 'professional development';
  
  if (tone === 'professional') {
    const professionalBodies = [
      `My experience with ${skillsList} and focus on ${keyWord} has revealed that sustainable ${focus} requires a systematic approach.

Critical success factors I've identified:

• Technical excellence combined with ${randomLearning}
• Understanding ${randomInsight} and market context  
• Building relationships that drive ${randomOutcome}
• Continuous adaptation to ${randomChallenge}
• Focus on ${randomOutcome} over technical complexity

The professionals who consistently deliver ${randomOutcome} are those who master both the technical and ${randomLearning} aspects of their work.`,

      `Through my work in ${keyWord} and expertise in ${skillsList}, I've learned that achieving ${focus} demands more than technical proficiency.

Key insights from my journey:

• ${randomLearning.charAt(0).toUpperCase() + randomLearning.slice(1)} often matters more than technical skills
• Success requires navigating ${randomChallenge} effectively
• Understanding ${randomInsight} drives strategic decisions
• Building ${randomOutcome} requires cross-functional collaboration
• Real impact comes from solving business problems, not showcasing technology

The most successful professionals I know excel at translating technical capabilities into ${randomOutcome}.`,

      `My journey with ${keyWord} has taught me that ${focus} isn't just about mastering ${skillsList}.

What separates high-impact professionals:

• Deep understanding of ${randomInsight} and customer needs
• Ability to navigate ${randomChallenge} while maintaining quality
• Focus on ${randomOutcome} rather than process perfection
• Strong ${randomLearning} that enable team success
• Strategic thinking that connects daily work to broader ${focus}

The future belongs to those who can combine technical depth with ${randomLearning} to drive ${randomOutcome}.`
    ];
    
    return professionalBodies[uniqueId % professionalBodies.length];
  }
  
  if (tone === 'casual') {
    const casualBodies = [
      `Working on ${keyWord} taught me ${skillsList}, but the real world is teaching me everything about ${randomLearning}.

What my ${degree} didn't prepare me for:

• How much time you spend dealing with ${randomChallenge}
• That ${randomLearning} often trumps technical expertise
• How important understanding ${randomInsight} really is  
• The politics behind every decision about ${randomOutcome}
• That soft skills determine who actually drives ${focus}

Turns out the technical stuff was just the entry fee. The human element is where ${focus} really happens.`,

      `Six months into ${keyWord} and I finally understand why everyone talks about ${randomLearning}.

Reality check on ${focus}:

• It's 20% ${skillsList} and 80% everything else
• Understanding ${randomInsight} matters more than perfect execution
• ${randomChallenge} will test you more than any technical problem
• Building ${randomOutcome} requires more ${randomLearning} than coding
• The best opportunities go to people who can navigate both

The sweet spot is being technical enough to be credible but focused enough on ${randomOutcome} to be valuable.`,

      `Real talk about ${keyWord}: everyone focuses on ${skillsList}, but that's not where careers are made.

What actually drives ${focus}:

• Your ability to handle ${randomChallenge} under pressure
• Understanding ${randomInsight} before your competitors do
• Building relationships that create ${randomOutcome}
• Developing ${randomLearning} that make teams better
• Knowing when technical perfection matters vs when ${focus} matters more

The professionals who get promoted aren't always the most technically skilled. They're the ones who consistently deliver ${randomOutcome}.`
    ];
    
    return casualBodies[uniqueId % casualBodies.length];
  }
  
  // Bold tone
  const boldBodies = [
    `After working in ${keyWord} for years, I've come to a controversial conclusion: the industry has ${focus} completely backwards.

What we get wrong:

• Obsession with ${skillsList} over understanding ${randomInsight}
• Building solutions that impress technologists but ignore ${randomOutcome}
• Treating ${randomChallenge} as edge cases instead of core challenges  
• Prioritizing technical complexity over ${randomLearning}
• Measuring success by sophistication rather than ${randomOutcome}

The most successful professionals I know aren't the ones with the most impressive technical skills. They're the ones who can take complex ${skillsList} and apply them to create simple, valuable ${randomOutcome}.`,

    `The ${keyWord} industry has convinced everyone they need more ${skillsList} when they really need better ${focus}.

Hard truths about ${focus}:

• Most companies are drowning in technical complexity but starving for ${randomOutcome}
• ${randomChallenge} kills more projects than technical limitations
• Understanding ${randomInsight} matters more than perfect algorithms
• ${randomLearning} determine who actually drives change
• The gap between what's technically possible and what's actually valuable is enormous

We're optimizing for the wrong metrics while the real drivers of ${randomOutcome} go ignored.`,

    `Unpopular opinion: The ${keyWord} field is broken because we prioritize ${skillsList} over ${focus}.

What needs to change:

• Stop treating ${randomChallenge} as someone else's problem
• Focus on ${randomOutcome} instead of technical perfection
• Invest in ${randomLearning} as much as technical skills
• Understand ${randomInsight} before building solutions
• Measure impact by ${randomOutcome}, not technical sophistication

The future belongs to professionals who can bridge the gap between technical capability and real-world ${focus}.`
  ];
  
  return boldBodies[uniqueId % boldBodies.length];
}
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
  const { isGraduation, isJobSearch, isAI, isAnalytics, isWork, seed, variation, focus, randomSalt } = context;
  
  // Dynamic CTA generation
  const timestamp = Date.now();
  const uniqueId = (timestamp + randomSalt + seed) % 1000;
  
  // Random dynamic elements for CTAs
  const questions = ['What has been your experience', 'How are you handling', 'What surprised you most about', 'What advice would you give', 'How do you balance', 'What challenges have you faced'];
  const topics = ['career transitions', 'skill development', 'industry changes', 'professional growth', 'work-life balance', 'team collaboration'];
  const engagements = ['Share your thoughts!', 'Drop your experiences below!', 'Would love to hear your perspective!', 'What do you think?', 'Curious about your take!', 'Let me know in the comments!'];
  
  const randomQuestion = questions[uniqueId % questions.length];
  const randomTopic = topics[(uniqueId + randomSalt) % topics.length];
  const randomEngagement = engagements[(uniqueId + seed) % engagements.length];
  
  if (tone === 'professional') {
    const professionalCTAs = [
      `${randomQuestion} with ${focus} in your professional journey? I'd welcome insights from fellow professionals.`,
      `Fellow professionals - ${randomQuestion.toLowerCase()} ${randomTopic} and ${focus}? ${randomEngagement}`,
      `${randomQuestion} balancing technical excellence with ${focus}? Looking forward to your perspectives.`,
      `What strategies have proven most effective for achieving ${focus} in your field? ${randomEngagement}`,
      `How do you approach ${randomTopic} while maintaining focus on ${focus}? Interested in your approaches.`
    ];
    return professionalCTAs[uniqueId % professionalCTAs.length];
  }
  
  if (tone === 'casual') {
    const casualCTAs = [
      `${randomQuestion} with ${randomTopic}? ${randomEngagement}`,
      `Fellow professionals - ${randomQuestion.toLowerCase()} ${focus} in your day-to-day work?`,
      `Anyone else dealing with ${randomTopic}? What's working for you?`,
      `${randomQuestion} navigating ${focus}? Drop your stories below!`,
      `What's your take on ${randomTopic} and ${focus}? ${randomEngagement}`
    ];
    return casualCTAs[uniqueId % casualCTAs.length];
  }
  
  // Bold tone
  const boldCTAs = [
    `${randomQuestion} challenging the status quo in ${randomTopic}? Time for some real talk.`,
    `What industry assumption about ${focus} needs to be called out? ${randomEngagement}`,
    `${randomQuestion} driving real change in ${randomTopic}? Let's discuss.`,
    `What controversial opinion do you have about ${focus}? Ready for the debate!`,
    `Which ${randomTopic} trend is completely overrated? ${randomEngagement}`
  ];
  return boldCTAs[uniqueId % boldCTAs.length];
}
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