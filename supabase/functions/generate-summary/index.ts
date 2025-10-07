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
            content: `You are an expert conference session analyst. Create professional, scannable summaries optimized for PDF export that provide maximum value to attendees and non-attendees.`
          },
          {
            role: "user",
            content: `# Generate Conference Session Summary

Analyze the provided conference session transcript and create a professional, scannable summary optimized for PDF export.

## CONTEXT PROVIDED:
- Session: ${session_title}
- Speaker: ${speaker_name} (${speaker_bio})
- Duration: ${duration_minutes} minutes
- Track: ${track_name}
- Conference: ${conference_name}
- Transcript: ${transcript_word_count} words

## REQUIRED OUTPUT STRUCTURE:

### 📋 EXECUTIVE SUMMARY (150 words max)
[3-4 sentence paragraph answering: What is this about? What's the main insight? Who should care?]

**🎯 Bottom Line**: [Single most important takeaway - one sentence, bold]

**👥 Best For**: [Target audience description]

---

### 🔥 TOP 5 KEY INSIGHTS (Ranked by importance)

**1. [Compelling insight title - make it a headline]**
- **What**: [2 sentence explanation]
- **Why it matters**: [Impact/significance - 1 sentence]  
- **Evidence**: [Specific data, quote, or example - 1 sentence]
- 📍 [Timestamp] in transcript

**[Label: 🔥 CRITICAL | ⚡ KEY | 💡 INTERESTING]**

[Repeat for insights 2-5]

---

### 💬 MEMORABLE QUOTES (3-5 quotes)

> "[Exact quote - choose most impactful/surprising/actionable]"
> — ${speaker_name} [[MM:SS]]

---

### ✅ ACTION ITEMS

**🚀 Do This Week:**
- [ ] [Specific, actionable item with clear outcome]
- [ ] [Specific, actionable item with clear outcome]
- [ ] [Specific, actionable item with clear outcome]

**🎯 Strategic Considerations:**
- [ ] [Longer-term strategic consideration]
- [ ] [Longer-term strategic consideration]

---

### 🤔 KEY QUESTIONS ADDRESSED

**Q: [Most important question discussed]**  
A: [Concise answer - 2 sentences max] [[Timestamp]]

[3-4 most valuable Q&As]

---

### 📚 RESOURCES & REFERENCES

**🎓 Experts/People Mentioned**: [Name - Context why mentioned]  
**🏢 Companies/Products**: [Name - Relevance to discussion]  
**📊 Studies/Data**: [Citation - Key finding]  
**🛠️ Tools/Frameworks**: [Name - How to use it]

---

### 🔗 MORE INFORMATION

**Full Transcript**: Available with timestamps  
**Speaker Contact**: ${speaker_name}  
**Session Track**: ${track_name}

---

## FORMATTING RULES:

**Structure:**
- Total length: 1000-1500 words (2-3 PDF pages)
- Hierarchical headers with emoji
- Short paragraphs (3-4 lines max)
- Bullet points for lists
- Consistent spacing between sections

**Writing Style:**
- Professional but conversational
- Active voice
- Specific examples over vague statements
- Technical terms defined on first use
- Write for someone in a hurry

**Emphasis:**
- **Bold** for key terms and outcomes
- *Italic* for quotes and emphasis  
- 📍 Timestamps for reference
- 🔥⚡💡 Icons to signal importance
- [ ] Checkboxes for action items

## CRITICAL INSTRUCTIONS:

1. **Prioritize ruthlessly**: Only include insights that are NEW, SURPRISING, or ACTIONABLE
2. **Be specific**: Use numbers, names, examples - avoid generic advice
3. **Show hierarchy**: Most critical info first, progressively more detail
4. **Link everything**: Every claim needs a timestamp reference
5. **Make it scannable**: Someone should grasp main points in 2 minutes
6. **Add value**: Don't just summarize - synthesize and provide context

## TRANSCRIPT:

${transcript}

Now generate the summary following this exact structure.`
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
