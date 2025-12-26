import { Product, UserRole, User } from './types';

export const APP_NAME = "CartifyPro";
export const COUNTRY_CURRENCIES: Record<string, string> = {
  'pakistan': 'PKR ',
  'india': 'INR ',
  'dubai': 'AED ',
};

export const getCurrency = (country?: string) => {
  if (!country) return 'PKR ';
  return COUNTRY_CURRENCIES[country.toLowerCase().trim()] || 'PKR ';
};

export const CURRENCY = "PKR "; // Legacy - will be phased out for dynamic currency

export const MOCK_IMAGES = {
  BANNER: "https://picsum.photos/id/20/1200/400",
  PRODUCT_1: "https://picsum.photos/id/1/400/400",
  PRODUCT_2: "https://picsum.photos/id/2/400/400",
  PRODUCT_3: "https://picsum.photos/id/3/400/400",
  AVATAR: "https://picsum.photos/id/64/100/100",
};

export const PAYMENT_PROVIDERS = [
  // Mobile Wallets
  "Easypaisa",
  "JazzCash",
  "Upaisa",
  "NayaPay",
  "SadaPay",
  "Zindigi",
  "Finja / Digit+",
  "Aik by Bank Islami",

  // Instant Payment
  "Raast (Instant)",

  // Banks
  "Meezan Bank",
  "HBL (Habib Bank Ltd)",
  "UBL (United Bank Ltd)",
  "MCB Bank",
  "Allied Bank",
  "Bank Alfalah",
  "Standard Chartered",
  "Askari Bank",
  "Faysal Bank",
  "Bank Al-Habib",

  // Gateways / Cards
  "PayFast",
  "SafePay",
  "Keenu",
  "PayPak",
  "Visa / Mastercard Transfer",

  // Other
  "Cash on Delivery",
  "Payoneer"
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Classic Laptop Workspace",
    price: 120000,
    description: "High-performance laptop for professionals.",
    imageURL: "https://picsum.photos/id/0/500/500",
    branchID: "branch-main",
    category: "Electronics",
    stock: 10
  },
  {
    id: "p2",
    name: "Minimalist Coffee Mug",
    price: 2500,
    description: "Ceramic mug for your daily brew.",
    imageURL: "https://picsum.photos/id/30/500/500",
    branchID: "branch-main",
    category: "Home",
    stock: 50
  },
  {
    id: "p3",
    name: "Wireless Headphones",
    price: 19900,
    description: "Noise cancelling wireless headphones.",
    imageURL: "https://picsum.photos/id/6/500/500",
    branchID: "branch-main",
    category: "Electronics",
    stock: 15
  },
  {
    id: "p4",
    name: "Leather Notebook",
    price: 4500,
    description: "Premium leather bound notebook.",
    imageURL: "https://picsum.photos/id/24/500/500",
    branchID: "branch-main",
    category: "Stationery",
    stock: 100
  }
];

// In a real app, this would be empty, but for the demo we pre-fill the super admin
export const MOCK_SUPER_ADMIN: User = {
  uid: "super-admin-1",
  name: "Super Administrator",
  email: "admin@nexus.com",
  role: UserRole.SUPER_ADMIN,
  emailVerified: true,
  branchID: null
};
