import { HouseholdTransactionType } from '@prisma/client';

export interface DefaultCategoryDefinition {
  name: string;
  type: HouseholdTransactionType;
  icon: string;
  color: string;
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategoryDefinition[] = [
  { name: 'Grocery & Ration', type: 'EXPENSE', icon: 'ShoppingCart', color: 'emerald' },
  { name: 'Milk & Daily Essentials', type: 'EXPENSE', icon: 'Coffee', color: 'amber' },
  { name: 'Vegetables & Fruits', type: 'EXPENSE', icon: 'Apple', color: 'green' },
  { name: 'Electricity & Utilities', type: 'EXPENSE', icon: 'Zap', color: 'yellow' },
  { name: 'Water, Gas & Internet', type: 'EXPENSE', icon: 'Wifi', color: 'blue' },
  { name: 'House Rent', type: 'EXPENSE', icon: 'Home', color: 'indigo' },
  { name: 'Education & School Fees', type: 'EXPENSE', icon: 'GraduationCap', color: 'purple' },
  { name: 'Medical & Healthcare', type: 'EXPENSE', icon: 'HeartPulse', color: 'rose' },
  { name: 'Transport & Fuel', type: 'EXPENSE', icon: 'Car', color: 'orange' },
  { name: 'Shopping & Clothing', type: 'EXPENSE', icon: 'Shirt', color: 'pink' },
  { name: 'Entertainment & Dining', type: 'EXPENSE', icon: 'Film', color: 'violet' },
  { name: 'EMI & Loan Payments', type: 'EXPENSE', icon: 'Landmark', color: 'red' },
  { name: 'Insurance', type: 'EXPENSE', icon: 'Shield', color: 'cyan' },
  { name: 'Maintenance & Repairs', type: 'EXPENSE', icon: 'Wrench', color: 'slate' },
  { name: 'Travel & Vacations', type: 'EXPENSE', icon: 'Plane', color: 'teal' },
  { name: 'Personal Expenses', type: 'EXPENSE', icon: 'User', color: 'fuchsia' },
  { name: 'Other Expenses', type: 'EXPENSE', icon: 'MoreHorizontal', color: 'gray' },
];

export const DEFAULT_INCOME_CATEGORIES: DefaultCategoryDefinition[] = [
  { name: 'Salary', type: 'INCOME', icon: 'Wallet', color: 'emerald' },
  { name: 'Business Income', type: 'INCOME', icon: 'Briefcase', color: 'blue' },
  { name: 'Freelance & Consulting', type: 'INCOME', icon: 'Laptop', color: 'indigo' },
  { name: 'Rent Received', type: 'INCOME', icon: 'Building', color: 'amber' },
  { name: 'Interest & Dividends', type: 'INCOME', icon: 'TrendingUp', color: 'cyan' },
  { name: 'Pension', type: 'INCOME', icon: 'Clock', color: 'purple' },
  { name: 'Gifts Received', type: 'INCOME', icon: 'Gift', color: 'rose' },
  { name: 'Other Income', type: 'INCOME', icon: 'PlusCircle', color: 'teal' },
];

export const ALL_DEFAULT_CATEGORIES = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];
