import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio, storagePath, sessionId, language = 'auto' } = await req.json();
    
    if (!audio && !storagePath) {
      throw new Error('No audio data or storage path provided');
    }

    if (!sessionId) {
      throw new Error('No session ID provided');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log(`Processing audio for session ${sessionId}`);

    let binaryAudio: Uint8Array;

    if (storagePath) {
      // Download from Supabase Storage for large files
      console.log(`Downloading from storage: ${storagePath}`);
      
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Supabase configuration missing');
      }

      const storageUrl = `${SUPABASE_URL}/storage/v1/object/session-recordings/${storagePath}`;
      const storageResponse = await fetch(storageUrl, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        }
      });

      if (!storageResponse.ok) {
        throw new Error(`Failed to download from storage: ${storageResponse.statusText}`);
      }

      const arrayBuffer = await storageResponse.arrayBuffer();
      binaryAudio = new Uint8Array(arrayBuffer);
      console.log(`Downloaded ${binaryAudio.length} bytes from storage`);
    } else {
      // Process base64 audio in chunks for smaller files
      console.log('Processing base64 audio...');
      binaryAudio = processBase64Chunks(audio);
    }
    
    // Prepare form data for OpenAI Whisper
    const formData = new FormData();
    const blob = new Blob([binaryAudio as unknown as BlobPart], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json'); // Get detailed output with timestamps
    formData.append('timestamp_granularities[]', 'segment');
    
    // Add language if specified
    if (language && language !== 'auto') {
      formData.append('language', language);
    }

    console.log(`Sending audio to OpenAI Whisper API...`);

    // Send to OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    console.log(`Transcription completed. Text length: ${result.text?.length || 0}`);

    // Calculate average confidence if segments are available
    let averageConfidence = null;
    if (result.segments && result.segments.length > 0) {
      const totalConfidence = result.segments.reduce((sum: number, seg: any) => {
        // Whisper returns avg_logprob, convert to probability
        const confidence = seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0;
        return sum + confidence;
      }, 0);
      averageConfidence = totalConfidence / result.segments.length;
    }

    return new Response(
      JSON.stringify({ 
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments?.map((seg: any) => ({
          text: seg.text,
          start: seg.start,
          end: seg.end,
          confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : null
        })),
        averageConfidence
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
