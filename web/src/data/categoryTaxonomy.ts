import type { CategoryDef } from '../types';

export const DEFAULT_CATEGORIES: CategoryDef[] = [
  {
    id: 'groceries', label: { en: 'Groceries', de: 'Lebensmittel' }, type: 'expense',
    subcategories: [
      { id: 'supermarket', label: { en: 'Supermarket', de: 'Supermarkt' } },
      { id: 'bakery', label: { en: 'Bakery', de: 'Bäckerei' } },
      { id: 'organic', label: { en: 'Organic', de: 'Bio' } },
    ],
  },
  {
    id: 'dining', label: { en: 'Dining', de: 'Gastronomie' }, type: 'expense',
    subcategories: [
      { id: 'restaurant', label: { en: 'Restaurant', de: 'Restaurant' } },
      { id: 'fast_food', label: { en: 'Fast Food', de: 'Fast Food' } },
      { id: 'cafe', label: { en: 'Cafe', de: 'Café' } },
    ],
  },
  {
    id: 'housing', label: { en: 'Housing', de: 'Wohnen' }, type: 'expense',
    subcategories: [
      { id: 'rent', label: { en: 'Rent', de: 'Miete' } },
      { id: 'mortgage', label: { en: 'Mortgage', de: 'Hypothek' } },
      { id: 'maintenance', label: { en: 'Maintenance', de: 'Instandhaltung' } },
    ],
  },
  {
    id: 'utilities', label: { en: 'Utilities', de: 'Nebenkosten' }, type: 'expense',
    subcategories: [
      { id: 'electricity', label: { en: 'Electricity', de: 'Strom' } },
      { id: 'water', label: { en: 'Water', de: 'Wasser' } },
      { id: 'internet', label: { en: 'Internet', de: 'Internet' } },
      { id: 'phone', label: { en: 'Phone', de: 'Telefon' } },
    ],
  },
  {
    id: 'transport', label: { en: 'Transport', de: 'Mobilität' }, type: 'expense',
    subcategories: [
      { id: 'fuel', label: { en: 'Fuel', de: 'Kraftstoff' } },
      { id: 'public_transit', label: { en: 'Public Transit', de: 'ÖPNV' } },
      { id: 'parking', label: { en: 'Parking', de: 'Parken' } },
    ],
  },
  {
    id: 'health', label: { en: 'Health', de: 'Gesundheit' }, type: 'expense',
    subcategories: [
      { id: 'pharmacy', label: { en: 'Pharmacy', de: 'Apotheke' } },
      { id: 'doctor', label: { en: 'Doctor', de: 'Arzt' } },
    ],
  },
  {
    id: 'insurance', label: { en: 'Insurance', de: 'Versicherung' }, type: 'expense',
    subcategories: [
      { id: 'health_insurance', label: { en: 'Health', de: 'Krankenversicherung' } },
      { id: 'car_insurance', label: { en: 'Car', de: 'KFZ' } },
      { id: 'liability', label: { en: 'Liability', de: 'Haftpflicht' } },
    ],
  },
  {
    id: 'clothing', label: { en: 'Clothing', de: 'Kleidung' }, type: 'expense',
    subcategories: [
      { id: 'clothes', label: { en: 'Clothes', de: 'Kleidung' } },
      { id: 'shoes', label: { en: 'Shoes', de: 'Schuhe' } },
    ],
  },
  {
    id: 'entertainment', label: { en: 'Entertainment', de: 'Unterhaltung' }, type: 'expense',
    subcategories: [
      { id: 'streaming', label: { en: 'Streaming', de: 'Streaming' } },
      { id: 'events', label: { en: 'Events', de: 'Veranstaltungen' } },
      { id: 'gaming', label: { en: 'Gaming', de: 'Gaming' } },
    ],
  },
  {
    id: 'education', label: { en: 'Education', de: 'Bildung' }, type: 'expense',
    subcategories: [
      { id: 'courses', label: { en: 'Courses', de: 'Kurse' } },
      { id: 'books', label: { en: 'Books', de: 'Bücher' } },
    ],
  },
  {
    id: 'shopping', label: { en: 'Shopping', de: 'Einkäufe' }, type: 'expense',
    subcategories: [
      { id: 'online', label: { en: 'Online', de: 'Online' } },
      { id: 'electronics', label: { en: 'Electronics', de: 'Elektronik' } },
      { id: 'home', label: { en: 'Home', de: 'Haushalt' } },
    ],
  },
  {
    id: 'personal_care', label: { en: 'Personal Care', de: 'Körperpflege' }, type: 'expense',
    subcategories: [
      { id: 'haircut', label: { en: 'Haircut', de: 'Friseur' } },
      { id: 'cosmetics', label: { en: 'Cosmetics', de: 'Kosmetik' } },
    ],
  },
  {
    id: 'gifts', label: { en: 'Gifts & Donations', de: 'Geschenke' }, type: 'expense',
    subcategories: [
      { id: 'gifts_personal', label: { en: 'Gifts', de: 'Geschenke' } },
      { id: 'charity', label: { en: 'Charity', de: 'Spenden' } },
    ],
  },
  {
    id: 'travel', label: { en: 'Travel', de: 'Reisen' }, type: 'expense',
    subcategories: [
      { id: 'flights', label: { en: 'Flights', de: 'Flüge' } },
      { id: 'hotels', label: { en: 'Hotels', de: 'Hotels' } },
    ],
  },
  {
    id: 'subscriptions', label: { en: 'Subscriptions', de: 'Abos' }, type: 'expense',
    subcategories: [
      { id: 'software', label: { en: 'Software', de: 'Software' } },
      { id: 'memberships', label: { en: 'Memberships', de: 'Mitgliedschaften' } },
    ],
  },
  {
    id: 'fees', label: { en: 'Fees', de: 'Gebühren' }, type: 'expense',
    subcategories: [
      { id: 'bank_fees', label: { en: 'Bank Fees', de: 'Bankgebühren' } },
      { id: 'atm', label: { en: 'ATM', de: 'Geldautomat' } },
    ],
  },
  {
    id: 'salary', label: { en: 'Salary', de: 'Gehalt' }, type: 'income',
    subcategories: [
      { id: 'main_job', label: { en: 'Main Job', de: 'Hauptberuf' } },
      { id: 'side_job', label: { en: 'Side Job', de: 'Nebenjob' } },
    ],
  },
  {
    id: 'investment', label: { en: 'Investment', de: 'Anlage' }, type: 'income',
    subcategories: [
      { id: 'dividends', label: { en: 'Dividends', de: 'Dividenden' } },
      { id: 'interest', label: { en: 'Interest', de: 'Zinsen' } },
    ],
  },
  {
    id: 'other_income', label: { en: 'Other Income', de: 'Sonstige Einnahmen' }, type: 'income',
    subcategories: [
      { id: 'refunds', label: { en: 'Refunds', de: 'Rückerstattungen' } },
      { id: 'cashback', label: { en: 'Cashback', de: 'Cashback' } },
    ],
  },
  {
    id: 'transfers', label: { en: 'Transfers', de: 'Umbuchungen' }, type: 'neutral',
    subcategories: [
      { id: 'internal', label: { en: 'Internal', de: 'Intern' } },
      { id: 'savings', label: { en: 'Savings', de: 'Sparen' } },
    ],
  },
  {
    id: 'other', label: { en: 'Other', de: 'Sonstiges' }, type: 'expense',
    subcategories: [
      { id: 'misc', label: { en: 'Miscellaneous', de: 'Verschiedenes' } },
    ],
  },
];

export function getCategoryLabel(id: string, locale: string, customCategories: CategoryDef[] = []): string {
  const all = [...DEFAULT_CATEGORIES, ...customCategories];
  const cat = all.find((c) => c.id === id);
  if (!cat) return id;
  return cat.label[locale] ?? cat.label.en ?? id;
}

export function getSubcategoryLabel(categoryId: string, subcategoryId: string, locale: string, customCategories: CategoryDef[] = []): string {
  const all = [...DEFAULT_CATEGORIES, ...customCategories];
  const cat = all.find((c) => c.id === categoryId);
  if (!cat) return subcategoryId;
  const sub = cat.subcategories.find((s) => s.id === subcategoryId);
  if (!sub) return subcategoryId;
  return sub.label[locale] ?? sub.label.en ?? subcategoryId;
}

export function getAllCategories(customCategories: CategoryDef[] = []): CategoryDef[] {
  return [...DEFAULT_CATEGORIES, ...customCategories];
}

export function getSubcategoriesFor(categoryId: string, customCategories: CategoryDef[] = []): CategoryDef['subcategories'] {
  const all = getAllCategories(customCategories);
  return all.find((c) => c.id === categoryId)?.subcategories ?? [];
}
