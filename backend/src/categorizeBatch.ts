import { onCallGenkit } from 'firebase-functions/https';
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { defineSecret } from 'firebase-functions/params';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

const ai = genkit({
  plugins: [googleAI()],
});

const TransactionItem = z.object({
  id: z.string(),
  description: z.string(),
  amount: z.number(),
  date: z.string(),
});

const ExistingRule = z.object({
  pattern: z.string(),
  category: z.string(),
  label: z.string(),
  purpose: z.string().optional(),
});

const InputSchema = z.object({
  transactions: z.array(TransactionItem).max(50),
  existingRules: z.array(ExistingRule),
  locale: z.string().optional(),
});

const ResultItem = z.object({
  id: z.string(),
  category: z.string(),
  label: z.string(),
  purpose: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  suggestedPattern: z.string(),
});

const OutputSchema = z.object({
  results: z.array(ResultItem),
});

const CATEGORY_TAXONOMY = `Categories (id → EN name, type):
EXPENSE: groceries (Groceries), dining (Dining), housing (Housing), utilities (Utilities), transport (Transport), health (Health), insurance (Insurance), clothing (Clothing), entertainment (Entertainment), education (Education), shopping (Shopping), personal_care (Personal Care), gifts (Gifts & Donations), travel (Travel), subscriptions (Subscriptions), fees (Fees), other (Other)
INCOME: salary (Salary), investment (Investment), other_income (Other Income)
NEUTRAL: transfers (Transfers)

Each category has subcategories (label field):
groceries: supermarket, bakery, organic
dining: restaurant, fast_food, cafe
housing: rent, mortgage, maintenance
utilities: electricity, water, internet, phone
transport: fuel, public_transit, parking
health: pharmacy, doctor
insurance: health_insurance, car_insurance, liability
clothing: clothes, shoes
entertainment: streaming, events, gaming
education: courses, books
shopping: online, electronics, home
personal_care: haircut, cosmetics
gifts: gifts_personal, charity
travel: flights, hotels
subscriptions: software, memberships
fees: bank_fees, atm
salary: main_job, side_job
investment: dividends, interest
other_income: refunds, cashback
transfers: internal, savings
other: misc`;

const categorizeBatchFlow = ai.defineFlow(
  { name: 'categorizeBatch', inputSchema: InputSchema, outputSchema: OutputSchema },
  async (input) => {
    const txLines = input.transactions
      .map((tx) => `  - id: "${tx.id}", desc: "${tx.description}", amount: ${tx.amount}, date: ${tx.date}`)
      .join('\n');

    const ruleExamples = input.existingRules.length > 0
      ? `\nExisting learned rules (for context, use similar categorization style):\n${input.existingRules
          .slice(0, 20)
          .map((r) => `  "${r.pattern}" → ${r.category}/${r.label}${r.purpose ? ` (${r.purpose})` : ''}`)
          .join('\n')}\n`
      : '';

    const prompt = `You are a transaction categorization engine for a personal finance app.

${CATEGORY_TAXONOMY}

${ruleExamples}
${input.locale ? `Data locale: ${input.locale}\n` : ''}
Categorize each transaction below. For each:
1. Assign category (from the taxonomy above)
2. Assign label (subcategory from the taxonomy above)
3. Extract purpose (merchant/payee name, cleaned up)
4. Rate confidence 0.0-1.0
5. Brief reasoning
6. Suggest a normalized pattern (lowercase, 2-4 key words identifying the merchant/payee)

Transactions:
${txLines}

Respond in JSON:
{
  "results": [
    { "id": "...", "category": "groceries", "label": "supermarket", "purpose": "REWE", "confidence": 0.9, "reasoning": "...", "suggestedPattern": "rewe sagt danke" },
    ...
  ]
}

Rules:
- Use ONLY category/label IDs from the taxonomy
- For ambiguous transactions, use "other"/"misc" with lower confidence
- For positive amounts, prefer income categories; for negative, prefer expense
- suggestedPattern should be lowercase, no numbers, 2-4 meaningful words that identify the merchant`;

    const { text } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      config: { temperature: 0.1 },
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { results: [] };

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return OutputSchema.parse(parsed);
    } catch {
      return { results: [] };
    }
  },
);

export const categorizeBatch = onCallGenkit(
  {
    secrets: [geminiApiKey],
    timeoutSeconds: 60,
    enforceAppCheck: false,
    authPolicy: (auth) => {
      if (!auth) return false;
      return true;
    },
  },
  categorizeBatchFlow,
);
