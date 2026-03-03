import { onCallGenkit } from 'firebase-functions/https';
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { defineSecret } from 'firebase-functions/params';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

const ai = genkit({
  plugins: [googleAI()],
});

const HistoricalContextItem = z.object({
  header: z.string(),
  historicalMappings: z.array(
    z.object({
      field: z.enum(['date', 'category', 'label', 'amount', 'purpose']),
      count: z.number(),
    }),
  ),
});

const InputSchema = z.object({
  headers: z.array(z.string()),
  sampleRows: z.array(z.record(z.string())),
  locale: z.string().optional(),
  historicalContext: z.array(HistoricalContextItem),
});

const FieldSuggestion = z.object({
  header: z.string(),
  score: z.number().min(0).max(1),
  reasoning: z.string(),
});

const OutputSchema = z.object({
  suggestions: z.object({
    date: FieldSuggestion.optional(),
    category: FieldSuggestion.optional(),
    label: FieldSuggestion.optional(),
    amount: FieldSuggestion.optional(),
    purpose: FieldSuggestion.optional(),
  }),
});

const suggestMappingFlow = ai.defineFlow(
  { name: 'suggestMapping', inputSchema: InputSchema, outputSchema: OutputSchema },
  async (input) => {
    const samplePreview = input.sampleRows
      .slice(0, 3)
      .map((row) => JSON.stringify(row))
      .join('\n');

    const historyLines = input.historicalContext
      .filter((h) => h.historicalMappings.length > 0)
      .map(
        (h) =>
          `  "${h.header}" → previously mapped to: ${h.historicalMappings
            .map((m) => `${m.field}(${m.count}x)`)
            .join(', ')}`,
      )
      .join('\n');

    const prompt = `You are a CSV column mapping assistant for a personal finance app.

Given these CSV column headers: ${JSON.stringify(input.headers)}

And these sample data rows:
${samplePreview}

${historyLines ? `Historical mapping context:\n${historyLines}\n` : ''}
Map each header to one of these fields:
- date: transaction date
- category: spending/income category
- label: payee or transaction name/description
- amount: monetary value
- purpose: transaction memo or reference text

${input.locale ? `The data is likely in locale: ${input.locale}` : ''}

Rules:
- Each field maps to at most ONE header
- Each header maps to at most ONE field
- Not all fields need a mapping if no suitable header exists
- Score from 0.0 to 1.0 based on your confidence
- Only suggest mappings with score >= 0.3

Respond in JSON format matching this schema:
{
  "suggestions": {
    "date": { "header": "...", "score": 0.9, "reasoning": "..." },
    "category": { "header": "...", "score": 0.8, "reasoning": "..." },
    ...
  }
}`;

    const { text } = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      prompt,
      config: { temperature: 0.1 },
    });

    // Parse the JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { suggestions: {} };

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return OutputSchema.parse(parsed);
    } catch {
      return { suggestions: {} };
    }
  },
);

export const suggestMapping = onCallGenkit(
  {
    secrets: [geminiApiKey],
    timeoutSeconds: 30,
    enforceAppCheck: false,
    authPolicy: (auth) => {
      if (!auth) return false;
      return true;
    },
  },
  suggestMappingFlow,
);
