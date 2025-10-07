import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      transcript, 
      session_title = "Conference Session",
      speaker_name = "Speaker",
      speaker_bio = "Conference Speaker",
      duration_minutes = "N/A",
      track_name = "General",
      conference_name = "Conference"
    } = await req.json();
    
    if (!transcript || transcript.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Transcript is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transcript_word_count = transcript.trim().split(/\s+/).length;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating comprehensive summary for transcript...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert conference session analyst. Create professional, educational summaries that work as comprehensive study guides.`
          },
          {
            role: "user",
            content: `Generate a professional, educational summary

## CONTEXT:
- **Session**: ${session_title}
- **Speaker**: ${speaker_name}
- **Conference**: ${conference_name}
- **Duration**: ${duration_minutes} minutes
- **Transcript**: ${transcript_word_count} words

## OUTPUT STRUCTURE:

# [Session Title]: [Compelling Subtitle]

## Introduction
[2-3 paragraph overview that sets the stage. Answer: What is this about? Why does it matter? What will readers learn?]

## Speaker Introduction
**${speaker_name}**: [Title, Company, relevant background in 2-3 sentences. Make it personal and credible.]

[If panel/multiple speakers, list each with same format]

---

## [Main Topic 1 - Make it a Compelling Title]
[Opening paragraph that introduces the topic]

**Key Concept**: [If there's an important term, define it inline with bold label]

- **Subtopic A**: [2-3 sentence explanation with specific details]
  - Supporting point with example
  - Data point or quote if available
  
- **Subtopic B**: [2-3 sentence explanation]
  - Real-world application
  - Impact or consequence

> "[Use a compelling quote here if it captures the essence]"
> — ${speaker_name}

[Continue with 2-3 more paragraphs exploring this topic in depth]

---

## [Main Topic 2 - Another Compelling Title]
[Same structure as Topic 1]

**Real-World Example**: [Title for example]
[Describe a specific scenario or case study mentioned. Make it concrete and relatable. Use storytelling elements:]
- What was the problem?
- What solution was implemented?
- What was the outcome?

[Continue pattern...]

---

## [Main Topic 3-7]
[Repeat structure for remaining major topics]

---

## Key Takeaways
[If the session had clear action items or lessons, summarize them here in a concise list]

---

## FORMATTING RULES:

**Typography Hierarchy:**
- H1: Session title + subtitle
- H2: Major topic sections (5-10 total)
- H3: Subtopics (use sparingly)
- Bold: Key terms, names, important concepts
- Italic: Emphasis, book/product names
- > Quote blocks: Impactful statements

**Content Guidelines:**
- **Paragraph length**: 3-5 sentences maximum
- **Bullet depth**: Maximum 2 levels
- **Section length**: 1-3 pages per major topic
- **Quote usage**: 1-2 quotes per major section
- **Examples**: At least 1 concrete example per major topic
- **Definitions**: Inline bold labels for jargon

**Writing Style:**
- Educational and explanatory (not just summarizing)
- Third person, professional but accessible
- Active voice ("Speaker explained" not "It was explained")
- Connect concepts logically between sections
- Use transition sentences between topics
- Tell a cohesive story, not disjointed facts

**Content Priorities:**
1. **Context first**: Who's speaking and why it matters
2. **Concepts over quotes**: Explain ideas thoroughly
3. **Real examples**: Concrete scenarios over abstract theory
4. **Logical flow**: Each section builds on previous
5. **Actionable**: Include what to DO with information
6. **Complete thoughts**: Don't leave ideas hanging

**Quality Checks:**
✅ Does introduction give clear overview?
✅ Are speakers properly introduced with credibility?
✅ Does each major section have a clear focus?
✅ Are technical terms defined when introduced?
✅ Are there concrete examples throughout?
✅ Does content flow logically from section to section?
✅ Is the tone educational and professional?
✅ Would this work as a study guide or reference?

## TRANSCRIPT:

${transcript}

Now generate the summary following this exact structure and style.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Lovable AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error("No summary generated from AI");
    }

    console.log("Summary generated successfully");

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-summary function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
