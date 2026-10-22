import { HouseholdTransactionType } from '@prisma/client';

export interface DefaultCategoryDefinition {
  name: string;
  type: HouseholdTransactionType;
  icon: string;
  color: string;
  subcategories?: string[];
  isBill?: boolean;
}

export const BILLS_AND_RECHARGE_TYPES = [
  { id: 'MOBILE_RECHARGE', label: 'Mobile Recharge', icon: 'Smartphone', categoryName: 'Mobile Recharge', providerHint: 'e.g. Jio, Airtel, Vi, BSNL' },
  { id: 'MOBILE_POSTPAID', label: 'Mobile/Postpaid Bill', icon: 'PhoneCall', categoryName: 'Mobile/Postpaid Bill', providerHint: 'e.g. Airtel Postpaid, Jio Postpaid, Vi' },
  { id: 'ELECTRICITY', label: 'Electricity Bill', icon: 'Zap', categoryName: 'Electricity', providerHint: 'e.g. BESCOM, Tata Power, Adani Electricity, BSES, UPPCL' },
  { id: 'WATER', label: 'Water Bill', icon: 'Droplets', categoryName: 'Water Bill', providerHint: 'e.g. Delhi Jal Board, BWSSB, MCGM' },
  { id: 'GAS', label: 'LPG/Gas Bill', icon: 'Flame', categoryName: 'Gas', providerHint: 'e.g. Indane, Bharat Gas, HP Gas, IGL, MGL, Adani Gas' },
  { id: 'INTERNET', label: 'Internet/Broadband', icon: 'Wifi', categoryName: 'Internet & Broadband', providerHint: 'e.g. ACT Fibernet, JioFiber, Airtel Xstream' },
  { id: 'DTH', label: 'DTH/Cable TV', icon: 'Tv', categoryName: 'DTH & Cable', providerHint: 'e.g. Tata Play, Airtel Digital TV, Dish TV, Sun Direct' },
] as const;

export type BillType = (typeof BILLS_AND_RECHARGE_TYPES)[number]['id'];

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategoryDefinition[] = [
  {
    name: 'Grocery & Ration',
    type: 'EXPENSE',
    icon: 'ShoppingCart',
    color: 'emerald',
    subcategories: ['Atta & Flours', 'Rice & Grains', 'Pulses & Dals', 'Edible Oils & Ghee', 'Spices & Masala', 'Dry Fruits', 'Beverages & Tea'],
  },
  {
    name: 'Vegetables & Fruits',
    type: 'EXPENSE',
    icon: 'Apple',
    color: 'green',
    subcategories: ['Fresh Vegetables', 'Potatoes & Onions', 'Seasonal Fruits', 'Fresh Herbs & Coriander', 'Exotic Veggies'],
  },
  {
    name: 'Milk & Daily Essentials',
    type: 'EXPENSE',
    icon: 'Coffee',
    color: 'amber',
    subcategories: ['Milk', 'Curd & Paneer', 'Eggs', 'Bread & Bakery', 'Morning Essentials'],
  },
  {
    name: 'Household Supplies',
    type: 'EXPENSE',
    icon: 'Package',
    color: 'teal',
    subcategories: ['Detergent & Fabric Care', 'Dishwashing & Cleaners', 'Toiletries & Soaps', 'Pest Control', 'Disposables'],
  },
  {
    name: 'Electricity',
    type: 'EXPENSE',
    icon: 'Zap',
    color: 'yellow',
    isBill: true,
    subcategories: ['Monthly Bill', 'Prepaid Meter Recharge', 'Security Deposit'],
  },
  {
    name: 'Water Bill',
    type: 'EXPENSE',
    icon: 'Droplets',
    color: 'sky',
    isBill: true,
    subcategories: ['Municipal Water Bill', 'Water Tanker', 'Drinking Water Cans'],
  },
  {
    name: 'Gas',
    type: 'EXPENSE',
    icon: 'Flame',
    color: 'orange',
    isBill: true,
    subcategories: ['LPG Cylinder Refill', 'Piped Natural Gas (PNG)', 'Gas Stove Accessories'],
  },
  {
    name: 'Mobile Recharge',
    type: 'EXPENSE',
    icon: 'Smartphone',
    color: 'indigo',
    isBill: true,
    subcategories: ['Prepaid Plan', 'Data Booster', 'Annual Validity', 'International Roaming'],
  },
  {
    name: 'Mobile/Postpaid Bill',
    type: 'EXPENSE',
    icon: 'PhoneCall',
    color: 'blue',
    isBill: true,
    subcategories: ['Individual Postpaid', 'Family Postpaid Plan', 'Corporate Add-on'],
  },
  {
    name: 'Internet & Broadband',
    type: 'EXPENSE',
    icon: 'Wifi',
    color: 'cyan',
    isBill: true,
    subcategories: ['Fiber Broadband', 'Wi-Fi Hotspot', 'Router / Installation'],
  },
  {
    name: 'DTH & Cable',
    type: 'EXPENSE',
    icon: 'Tv',
    color: 'violet',
    isBill: true,
    subcategories: ['Monthly DTH Pack', 'Cable Operator Bill', 'Regional Add-on Pack'],
  },
  {
    name: 'Rent',
    type: 'EXPENSE',
    icon: 'Home',
    color: 'indigo',
    subcategories: ['House Rent', 'Office / Shop Rent', 'Parking Space Rent', 'Rental Security Deposit'],
  },
  {
    name: 'Maintenance & Repairs',
    type: 'EXPENSE',
    icon: 'Wrench',
    color: 'slate',
    subcategories: ['Society Maintenance', 'Plumbing & Hardware', 'Electrician', 'Appliance Servicing', 'Painting & Waterproofing'],
  },
  {
    name: 'Education & School Fees',
    type: 'EXPENSE',
    icon: 'GraduationCap',
    color: 'purple',
    subcategories: ['School/College Tuition', 'Books & Stationery', 'Uniforms & Shoes', 'Coaching & Tuitions', 'Online Courses'],
  },
  {
    name: 'Medical & Healthcare',
    type: 'EXPENSE',
    icon: 'HeartPulse',
    color: 'rose',
    subcategories: ['Medicines & Pharmacy', 'Doctor Consultation', 'Lab Tests & Scans', 'Dental Care', 'Hospitalization'],
  },
  {
    name: 'Travel & Transport',
    type: 'EXPENSE',
    icon: 'Train',
    color: 'amber',
    subcategories: ['Train & Railway Tickets', 'Bus / Metro Card', 'Cab & Auto (Ola/Uber)', 'Flight Booking', 'Hotel & Lodging'],
  },
  {
    name: 'Fuel',
    type: 'EXPENSE',
    icon: 'Fuel',
    color: 'orange',
    subcategories: ['Petrol', 'Diesel', 'CNG', 'EV Charging'],
  },
  {
    name: 'Shopping & Clothing',
    type: 'EXPENSE',
    icon: 'Shirt',
    color: 'pink',
    subcategories: ['Apparel & Clothes', 'Footwear', 'Home Décor & Furnishings', 'Kitchenware', 'Electronics & Gadgets'],
  },
  {
    name: 'Personal Care',
    type: 'EXPENSE',
    icon: 'Sparkles',
    color: 'fuchsia',
    subcategories: ['Salon & Haircut', 'Grooming & Skincare', 'Gym & Fitness', 'Cosmetics & Perfumes'],
  },
  {
    name: 'Entertainment & Dining',
    type: 'EXPENSE',
    icon: 'Film',
    color: 'violet',
    subcategories: ['Restaurant & Dining Out', 'Online Food Delivery (Swiggy/Zomato)', 'Movie Tickets', 'OTT Subscriptions (Netflix/Prime)', 'Outings & Picnics'],
  },
  {
    name: 'Family & Events',
    type: 'EXPENSE',
    icon: 'Users',
    color: 'emerald',
    subcategories: ['Festivals & Puja', 'Birthdays & Anniversaries', 'Family Functions & Weddings', 'Gifts & Shagun'],
  },
  {
    name: 'Insurance',
    type: 'EXPENSE',
    icon: 'Shield',
    color: 'cyan',
    subcategories: ['Health Insurance', 'Life & Term Insurance', 'Two-Wheeler / Car Insurance', 'Home Insurance'],
  },
  {
    name: 'EMI & Loan Payments',
    type: 'EXPENSE',
    icon: 'Landmark',
    color: 'red',
    subcategories: ['Home Loan EMI', 'Vehicle Loan EMI', 'Personal Loan EMI', 'Credit Card Bill Payment', 'Gold Loan'],
  },
  {
    name: 'Other Expenses',
    type: 'EXPENSE',
    icon: 'MoreHorizontal',
    color: 'gray',
    subcategories: ['Charity & Donations', 'Pocket Money', 'Bank Charges & Fines', 'Miscellaneous'],
  },
];

export const DEFAULT_INCOME_CATEGORIES: DefaultCategoryDefinition[] = [
  { name: 'Salary', type: 'INCOME', icon: 'Wallet', color: 'emerald', subcategories: ['Monthly Salary', 'Bonus & Incentive', 'Arrears'] },
  { name: 'Business Income', type: 'INCOME', icon: 'Briefcase', color: 'blue', subcategories: ['Profits & Drawings', 'Client Payments', 'Consulting'] },
  { name: 'Freelance & Consulting', type: 'INCOME', icon: 'Laptop', color: 'indigo', subcategories: ['Project Fees', 'Hourly Work'] },
  { name: 'Rent Received', type: 'INCOME', icon: 'Building', color: 'amber', subcategories: ['Residential Rent', 'Commercial Rent'] },
  { name: 'Interest & Dividends', type: 'INCOME', icon: 'TrendingUp', color: 'cyan', subcategories: ['FD / RD Interest', 'Stock Dividends', 'Mutual Fund Gains'] },
  { name: 'Pension', type: 'INCOME', icon: 'Clock', color: 'purple', subcategories: ['Government Pension', 'EPFO Pension'] },
  { name: 'Gifts Received', type: 'INCOME', icon: 'Gift', color: 'rose', subcategories: ['Festival Shagun', 'Family Support'] },
  { name: 'Other Income', type: 'INCOME', icon: 'PlusCircle', color: 'teal', subcategories: ['Tax Refund', 'Cashback & Rewards', 'Miscellaneous'] },
];

export const ALL_DEFAULT_CATEGORIES = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];
