
export enum UserRole {
  USER = 'user',
  BRANCH_ADMIN = 'branch-admin',
  SUPER_ADMIN = 'super-admin'
}

export enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface Branch {
  id: string; // Document ID (usually matches owner's branchID, e.g. branch-UID)
  ownerId: string;
  slug?: string; // Custom URL slug
  name: string;
  country: string;
  status: 'approved' | 'pending';
  // Display fields synced from User profile for faster access
  logoURL?: string;
  bannerURL?: string;
  rating?: number;
  reviewCount?: number;
  shopCategory?: string;
  description?: string;
}

// Global Provider defined by Super Admin (e.g. "Easypaisa", "COD")
export interface GlobalPaymentProvider {
  id: string;
  name: string; // "Easypaisa", "JazzCash", "Bank Transfer"
  type: 'manual' | 'cod'; // Manual requires proof, COD does not
  enabled: boolean;
}

// Specific Configuration for a Branch (Branch fills this)
export interface BranchPaymentConfig {
  providerId: string; // Links to GlobalPaymentProvider.id
  providerName: string;
  accountTitle: string;
  accountNumber: string;
  instructions: string;
  enabled: boolean;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  country?: string; // Selected by user
  branchCountry?: string; // Assigned when branch is approved
  emailVerified: boolean;
  branchID: string | null;
  // Branch Profile Fields
  logoURL?: string;
  bannerURL?: string;
  description?: string;
  shopCategory?: string;
  // Branch Payment Settings
  paymentConfig?: BranchPaymentConfig[];
  // New Features
  deliveryFee?: number; // Custom delivery charge
  rating?: number; // Average rating (0-5)
  reviewCount?: number; // Total number of reviews

  // Sub-Category & Plan Features
  subCategories?: string[];
  plan?: 'free' | 'pro';

  // Suspension
  suspensionUntil?: number; // timestamp
  suspensionReason?: string;

  // Finance
  taxRate?: number; // Override category tax per branch if needed
  monthlySubscriptionFee?: number;
}

export interface FinancePayment {
  id: string;
  branchID: string;
  branchName: string;
  amount: number;
  trxID: string;
  type: 'tax' | 'subscription';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  message?: string;
  period?: string; // e.g., "December 2025"
}

export interface ProductVariant {
  id: string;
  color: string;
  size: string; // S, M, L, XL, etc.
  price: number;
  stock: number;
  imageURL: string;
  description?: string; // Specific description for this variant
}

export interface Product {
  id: string;
  name: string;
  price: number; // Base price (used for display or if no variants)
  salePrice?: number; // Discounted price
  description: string;
  imageURL: string; // Base image
  branchID: string;
  category: string;
  stock: number; // Total stock or base stock
  isNewArrival?: boolean; // New Collection flag
  rating?: number; // Product specific rating
  reviewCount?: number;
  variants?: ProductVariant[]; // New: Color/Size variants
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariant?: ProductVariant; // Specific variant chosen
}

export interface OrderStatusHistory {
  status: OrderStatus;
  timestamp: number;
  updatedBy: string;
}

export interface Order {
  id: string;
  userID: string;
  branchID: string;
  products: {
    productID: string;
    quantity: number;
    name: string;
    price: number;
    variantId?: string;
    variantName?: string; // e.g., "Red - Large"
  }[];
  totalAmount: number; // Products + Shipping - Discount
  shippingCost?: number; // New field
  taxAmount?: number;
  taxRate?: number;
  discountAmount?: number;
  finalAmount?: number;
  couponCode?: string;
  status: OrderStatus;
  createdAt: number;
  statusHistory?: OrderStatusHistory[];
  shippingInfo?: {
    fullName: string;
    address: string;
    city: string;
    zip: string;
    phone: string;
  };
  paymentMethod?: string;
  paymentDetails?: {
    accountTitle?: string;
    accountNumber?: string;
    instruction?: string;
    trxID?: string;
    screenshotURL?: string;
  };
}

export interface BranchRequest {
  id: string;
  userID: string;
  userName: string;
  userEmail: string;
  phone: string;
  address: string;

  // Payment Details
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionId: string; // Renamed from trxID to match requirements
  screenshotUrl: string; // Renamed from screenshotURL

  shopCategory?: string;
  shopName?: string; // Requested Shop Name
  country: string;
  status: RequestStatus;
  createdAt: number;
}

export interface CountryConfig {
  id: string; // 'pakistan', 'india', 'uae'
  currency: string;
  branch_fee: number;
  payment_methods: string[];
  payment_instructions: string; // Legacy
  localMap?: Record<string, CountryLocalPaymentMethod>; // Cache
}

export interface CountryLocalPaymentMethod {
  id: string;
  country: string; // 'india', 'pakistan', 'uae'
  name: string; // 'UPI', 'Bank Transfer', 'COD'
  type: 'manual' | 'cod' | 'digital';
  instructions: string;
  enabled: boolean;
}

export interface PlatformPaymentAccount {
  id: string;
  country: string;
  type: string; // 'Bank', 'UPI', 'Payoneer'
  title: string;
  accountNumber: string; // IBAN, UPI ID, etc.
  instructions: string;
  enabled: boolean;
}

export interface SystemSettings {
  branchSetupFee: number;
  platformName: string;
  maintenanceMode: boolean;
  stripePublicKey?: string;
  stripeSecretKey?: string;
  jazzCashMerchantID?: string;
  jazzCashPassword?: string;
  jazzCashIntegritySalt?: string;
}

export interface PaymentMethod {
  id: string;
  provider: string;
  accountName: string;
  accountNumber: string;
  instruction: string;
  enabled: boolean;
}

export interface ContentPage {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon?: string;
  enabled: boolean;
}

export interface Review {
  id: string;
  productID: string;
  userID: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface ShopReview {
  id: string;
  branchID: string;
  userID: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Notification {
  id: string;
  userID: string;
  title: string;
  message: string;
  read: boolean;
  date: string;
  type: 'order' | 'system' | 'promo';
}

export interface Category {
  id: string;
  name: string;
  imageURL: string;
  productCount: number;
  taxRate?: number; // Percentage tax for products in this category
}

export interface BranchStaff {
  id: string;
  branchID: string;
  name: string;
  email: string;
  role: 'Manager' | 'Editor' | 'Viewer';
  addedAt: string;
}

export interface Ad {
  id: string;
  title: string;
  imageURL: string;
  linkURL: string;
  active: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  branchID: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  expiryDate: string;
  isActive: boolean;
  usageCount: number;
  usageLimit?: number;
}

export interface InventoryLog {
  id: string;
  productID: string;
  productName: string;
  branchID: string;
  changeAmount: number;
  newStock: number;
  reason: string;
  timestamp: string;
  performedBy: string;
}

export interface ChatMessage {
  id: string;
  senderID: string;
  senderName: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  userID: string;
  userName: string;
  branchID: string;
  branchName: string;
  lastMessage: string;
  lastMessageTime: number;
  updatedAt: number;
  unreadCount?: number;
}

export enum DisputeStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export interface Dispute {
  id: string;
  orderID: string;
  userID: string;
  branchID: string;
  branchName?: string;
  reason: string;
  description: string;
  status: DisputeStatus;
  createdAt: number;
  resolution?: string;
  resolvedAt?: number;
}
