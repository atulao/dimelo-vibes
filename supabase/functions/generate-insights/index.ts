import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, transcript_text } = await req.json();

    if (!session_id || !transcript_text) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: session_id and transcript_text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating insights for session ${session_id}`);
    console.log(`Transcript length: ${transcript_text.length} characters`);

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing conference session transcripts. Always respond with valid JSON only, no additional text or markdown.'
          },
          {
            role: 'user',
            content: `Analyze this conference session transcript and provide insights in the following JSON format:
{
  "summary": "A 2-3 sentence summary",
  "key_points": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "action_items": ["action 1", "action 2", "action 3"],
  "notable_quotes": ["quote 1", "quote 2", "quote 3"]
}

Transcript:
${transcript_text}`
          }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', openAIResponse.status, errorText);
      
      if (openAIResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate insights from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response:', JSON.stringify(openAIData));

    const generatedContent = openAIData.choices[0].message.content;
    
    // Parse JSON response
    let insights;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = generatedContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      insights = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', generatedContent);
      return new Response(
        JSON.stringify({ error: 'Failed to parse insights from AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert insights into database
    const insightsToInsert = [
      {
        session_id,
        insight_type: 'summary',
        content: insights.summary,
      },
      ...insights.key_points.map((point: string) => ({
        session_id,
        insight_type: 'key_point',
        content: point,
      })),
      ...insights.action_items.map((item: string) => ({
        session_id,
        insight_type: 'action_item',
        content: item,
      })),
      ...insights.notable_quotes.map((quote: string) => ({
        session_id,
        insight_type: 'quote',
        content: quote,
      })),
    ];

    // Delete old insights for this session
    const { error: deleteError } = await supabase
      .from('ai_insights')
      .delete()
      .eq('session_id', session_id);

    if (deleteError) {
      console.error('Error deleting old insights:', deleteError);
    }

    // Insert new insights
    const { error: insertError } = await supabase
      .from('ai_insights')
      .insert(insightsToInsert);

    if (insertError) {
      console.error('Error inserting insights:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save insights to database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully generated and saved insights for session ${session_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        insights: {
          summary: insights.summary,
          key_points: insights.key_points,
          action_items: insights.action_items,
          notable_quotes: insights.notable_quotes,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-insights function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
