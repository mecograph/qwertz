# #8 — Custom Category Management

## The Problem

The app ships with 18 predefined categories and 50+ subcategories. The type system supports custom categories (`CatRuleProfile.customCategories: CategoryDef[]`), but there is no UI to create, edit, or delete them. The AI prompt sends the full taxonomy — custom categories wouldn't be recognized by AI unless the prompt is dynamically updated.

Users' financial lives are diverse:
- **Freelancer:** needs "Client Income", "Business Equipment", "Office Supplies", "Software Subscriptions"
- **Parent:** needs "Childcare", "School Fees", "Children's Activities", "Kids' Clothing"
- **Investor:** needs "Dividends", "Capital Gains", "Brokerage Fees"
- **Student:** needs "Tuition", "Student Loans", "Textbooks"
- **Homeowner:** needs "Mortgage", "Home Maintenance", "Property Tax" (some exist but may need custom sub-categories)

Without customization, users force-fit their transactions into generic categories, reducing the app's value.

### Current Taxonomy Structure

```ts
interface CategoryDef {
  id: string;
  type: 'expense' | 'income' | 'neutral';
  label: { en: string; de: string };
  subcategories: SubcategoryDef[];
}

interface SubcategoryDef {
  id: string;
  label: { en: string; de: string };
}
```

The taxonomy in `categoryTaxonomy.ts` exports `DEFAULT_CATEGORIES` and helper functions that accept `customCategories` as an optional parameter — the plumbing exists.

## Proposed Solution

### Category Manager in Settings

Add a dedicated category management section in Settings:

```
Categories & Labels
├── Expenses (14)
│   ├── 🛒 Groceries          [default]
│   │   ├── Supermarket
│   │   ├── Farmers market
│   │   └── [+ Add subcategory]
│   ├── 🍽 Dining              [default]
│   ├── 💼 Business Expenses   [custom]  [Edit] [Delete]
│   │   ├── Office supplies
│   │   ├── Software
│   │   └── Equipment
│   └── [+ Add category]
│
├── Income (3)
│   ├── 💰 Salary              [default]
│   ├── 📊 Client Payments     [custom]  [Edit] [Delete]
│   └── [+ Add category]
│
└── Neutral (2)
    └── 🔄 Transfers           [default]
```

### Interaction Design

#### Adding a Category

```
┌─────────────────────────────────────────────┐
│  New Category                                │
│                                              │
│  Name (EN): [Business Expenses          ]    │
│  Name (DE): [Geschäftsausgaben          ]    │
│  Type:      ○ Expense  ○ Income  ○ Neutral   │
│                                              │
│  Subcategories:                              │
│  1. [Office Supplies    ] [Bürobedarf    ]   │
│  2. [Software           ] [Software      ]   │
│  3. [Equipment          ] [Ausstattung   ]   │
│  [+ Add subcategory]                         │
│                                              │
│  [Cancel]                    [Save Category]  │
└─────────────────────────────────────────────┘
```

#### Editing a Default Category

Default categories can't be deleted (they're needed for AI context), but:
- Subcategories can be added
- Subcategory labels can be renamed
- A "Hide" toggle can exclude a category from dropdowns (if user never uses it)

#### Deleting a Custom Category

```
┌─────────────────────────────────────────────┐
│  Delete "Business Expenses"?                 │
│                                              │
│  12 transactions use this category.          │
│  They will be moved to:                      │
│                                              │
│  [Shopping ▾]  / [General ▾]                 │
│                                              │
│  3 rules reference this category.            │
│  They will be updated to the new category.   │
│                                              │
│  [Cancel]                    [Delete]         │
└─────────────────────────────────────────────┘
```

### Inline Category Creation During Review

The most powerful moment to create a category is during the review step — the user sees a transaction that doesn't fit any existing category and wants a new one.

In the ReviewWizard category dropdown, add a "Create new..." option at the bottom:

```
Category: [▾ Select category          ]
  🛒 Groceries
  🍽 Dining
  🏠 Housing
  ...
  ─────────────
  ➕ Create new category...
```

Clicking it opens a lightweight inline dialog (not a full page navigation). After creation, the new category is immediately available in all dropdowns for the current import.

### AI Integration

Custom categories must be included in the AI prompt so Gemini knows they exist:

```ts
// In categorizeBatch cloud function
function buildTaxonomyPrompt(defaultCategories, customCategories) {
  const all = [...defaultCategories, ...customCategories];
  return all.map(cat =>
    `- ${cat.id} (${cat.type}): ${cat.label.en} / ${cat.label.de}\n` +
    cat.subcategories.map(sub => `  - ${sub.id}: ${sub.label.en} / ${sub.label.de}`).join('\n')
  ).join('\n');
}
```

The cloud function already receives rules as context. Add custom categories to the request:

```ts
// useCatStore.ts — when calling AI
const response = await client.aiCategorizeBatch(user, {
  transactions: batch,
  existingRules: topRules,
  customCategories: this.profile.customCategories,  // NEW
  locale,
});
```

### Migration Path for Existing Users

If a user has been using the app with default categories and then creates custom ones:
- Existing rules and transactions keep their current categories
- User can optionally bulk-reassign transactions from one category to another
- "Merge categories" action: combine two categories into one (moves all rules + transactions)

### Implementation Steps

1. Build `CategoryManager.vue` component for Settings
2. Build `AddCategoryDialog.vue` for creation/edit
3. Build `DeleteCategoryDialog.vue` with reassignment logic
4. Add inline "Create new category" option to ReviewWizard dropdowns
5. Persist custom categories in `CatRuleProfile.customCategories`
6. Update `categorizeBatch` cloud function to include custom categories in prompt
7. Add "Hide category" toggle for default categories
8. Add bulk reassignment action ("Move all X transactions to Y")
9. Update all taxonomy helper functions to merge custom categories (already supported)
