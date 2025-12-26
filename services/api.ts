
import { User, Product, Order, BranchRequest, CountryConfig, CountryLocalPaymentMethod, PlatformPaymentAccount, UserRole, OrderStatus, RequestStatus, SystemSettings, Category, Notification, PaymentMethod, Review, ContentPage, GlobalPaymentProvider, BranchPaymentConfig, Ad, BranchStaff, Coupon, InventoryLog, Chat, ChatMessage, Dispute, DisputeStatus, ShopReview, SocialLink, FinancePayment, Branch } from '../types';
import { INITIAL_PRODUCTS, MOCK_SUPER_ADMIN, CURRENCY } from '../constants';
import { db, auth } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  setDoc,
  getDoc,
  DocumentData,
  arrayUnion,
  arrayRemove,
  orderBy,
  limit,
  onSnapshot,
  increment,
  runTransaction
} from 'firebase/firestore';

export const STORAGE_KEYS = {
  SESSION: 'nexus_session'
};

// ... (Keep all Auth, Helper, and User Profile services exactly as they were until apiAddReview) ...

export const sanitizeUser = (data: any): User => {
  return {
    uid: data.uid,
    name: typeof data.name === 'string' ? data.name : '',
    email: typeof data.email === 'string' ? data.email : '',
    role: data.role || UserRole.USER,
    emailVerified: !!data.emailVerified,
    branchID: typeof data.branchID === 'string' ? data.branchID : null,
    logoURL: typeof data.logoURL === 'string' ? data.logoURL : undefined,
    bannerURL: typeof data.bannerURL === 'string' ? data.bannerURL : undefined,
    description: typeof data.description === 'string' ? data.description : undefined,
    shopCategory: typeof data.shopCategory === 'string' ? data.shopCategory : undefined,
    paymentConfig: Array.isArray(data.paymentConfig) ? data.paymentConfig : undefined,
    deliveryFee: typeof data.deliveryFee === 'number' ? data.deliveryFee : 0,
    rating: typeof data.rating === 'number' ? data.rating : 0,
    reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 0,
    subCategories: Array.isArray(data.subCategories) ? data.subCategories : [],
    plan: data.plan === 'pro' ? 'pro' : 'free',
    suspensionUntil: typeof data.suspensionUntil === 'number' ? data.suspensionUntil : undefined,
    suspensionReason: typeof data.suspensionReason === 'string' ? data.suspensionReason : undefined,
    taxRate: typeof data.taxRate === 'number' ? data.taxRate : undefined,
    monthlySubscriptionFee: typeof data.monthlySubscriptionFee === 'number' ? data.monthlySubscriptionFee : undefined,
    country: typeof data.country === 'string' ? data.country : undefined,
    branchCountry: typeof data.branchCountry === 'string' ? data.branchCountry : undefined,
  };
};

export const apiSaveSession = (user: User) => {
  try {
    const cleanUser = sanitizeUser(user);
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(cleanUser));
  } catch (e) {
    console.error("Failed to save session to local storage", e);
  }
};

export const apiLogin = async (email: string, password: string): Promise<User> => {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail === MOCK_SUPER_ADMIN.email.toLowerCase()) {
    if (password === 'admin123') {
      apiSaveSession(MOCK_SUPER_ADMIN);
      return MOCK_SUPER_ADMIN;
    } else {
      throw new Error("Invalid password for Demo Super Admin.");
    }
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const fbUser = userCredential.user;

    if (!fbUser.emailVerified) {
      await signOut(auth);
      throw new Error("Email not verified. Please check your inbox and verify your account.");
    }

    const userDocRef = doc(db, "users", fbUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      throw new Error("User profile not found. Please contact support.");
    }

    const rawData = { ...userDocSnap.data(), uid: fbUser.uid };
    const userData = sanitizeUser(rawData);
    apiSaveSession(userData);
    return userData;

  } catch (error: any) {
    console.error("Login Error:", error);
    const errorCode = error.code;
    const errorMessage = error.message;

    if (
      errorCode === 'auth/invalid-credential' ||
      errorCode === 'auth/user-not-found' ||
      errorCode === 'auth/wrong-password' ||
      (errorMessage && errorMessage.includes('auth/invalid-credential'))
    ) {
      throw new Error("Invalid email or password.");
    } else if (errorCode === 'auth/too-many-requests') {
      throw new Error("Too many failed attempts. Please try again later.");
    } else if (errorCode === 'auth/network-request-failed') {
      throw new Error("Network error. Please check your internet connection.");
    }

    if (errorMessage && !errorMessage.includes('Firebase:')) {
      throw error;
    }

    throw new Error("Failed to sign in. Please try again.");
  }
};

export const apiRegister = async (name: string, email: string, password: string, country: string): Promise<void> => {
  try {
    const normalizedEmail = email.trim();
    const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    const fbUser = userCredential.user;
    await sendEmailVerification(fbUser);

    const newUser: User = {
      uid: fbUser.uid,
      name: name.trim(),
      email: normalizedEmail,
      role: UserRole.USER,
      emailVerified: false,
      branchID: null,
      rating: 0,
      reviewCount: 0,
      plan: 'free',
      subCategories: [],
      country: country, // Mandatory country assignment
    };

    await setDoc(doc(db, "users", fbUser.uid), newUser);
    await signOut(auth);

  } catch (error: any) {
    console.error("Registration Error:", error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error("Email is already in use.");
    } else if (error.code === 'auth/weak-password') {
      throw new Error("Password should be at least 6 characters.");
    }
    throw error;
  }
};

export const apiResetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error("No account found with this email.");
    }
  }
};

export const apiLogout = async () => {
  await signOut(auth);
  localStorage.removeItem(STORAGE_KEYS.SESSION);
};

export const apiGetSession = (): User | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SESSION);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error("Failed to parse session", e);
    return null;
  }
};

// --- User Profile ---

export const apiUpdateProfile = async (uid: string, data: Partial<User>): Promise<User> => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, data);

  // Propagate changes to 'branches' collection if user is a branch admin
  const freshUser = await apiGetUser(uid);
  if (freshUser && freshUser.role === UserRole.BRANCH_ADMIN && freshUser.branchID) {
    try {
      const branchRef = doc(db, "branches", freshUser.branchID);
      const branchUpdate: any = {};
      if (data.name) branchUpdate.name = data.name;
      if (data.logoURL !== undefined) branchUpdate.logoURL = data.logoURL;
      if (data.bannerURL !== undefined) branchUpdate.bannerURL = data.bannerURL;
      if (data.description !== undefined) branchUpdate.description = data.description;
      if (data.shopCategory !== undefined) branchUpdate.shopCategory = data.shopCategory;
      if (data.rating !== undefined) branchUpdate.rating = data.rating;
      if (data.reviewCount !== undefined) branchUpdate.reviewCount = data.reviewCount;
      if (freshUser.country) branchUpdate.country = freshUser.country;

      if (Object.keys(branchUpdate).length > 0) {
        await updateDoc(branchRef, branchUpdate);
      }
    } catch (e) {
      console.warn("Could not sync profile update to branches collection:", e);
    }
  }

  const session = apiGetSession();
  if (session && session.uid === uid) {
    const rawUpdatedUser = { ...session, ...data };
    const updatedUser = sanitizeUser(rawUpdatedUser);
    apiSaveSession(updatedUser);
    return updatedUser;
  }

  return freshUser || sanitizeUser({ ...session, ...data });
};

export const apiDeleteUser = async (uid: string): Promise<void> => {
  await deleteDoc(doc(db, "users", uid));
};

export const apiGetUsers = async (): Promise<User[]> => {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(d => ({ ...d.data(), uid: d.id } as User));
};

export const apiUpdateUserRole = async (uid: string, role: UserRole, branchID: string | null): Promise<void> => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { role, branchID });
};

export const apiGetUser = async (uid: string): Promise<User | null> => {
  const docSnap = await getDoc(doc(db, "users", uid));
  if (docSnap.exists()) {
    const raw = { ...docSnap.data(), uid: docSnap.id };
    return sanitizeUser(raw);
  }
  return null;
}

// --- Branch Sub-Categories & Plan ---

export const apiAddBranchSubCategory = async (uid: string, categoryName: string): Promise<User> => {
  const userRef = doc(db, "users", uid);

  let updatedUser: User | null = null;

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("User not found");

    const userData = userDoc.data() as User;
    const currentCats = userData.subCategories || [];
    const plan = userData.plan || 'free';

    if (currentCats.includes(categoryName)) {
      throw new Error("Category already exists.");
    }

    if (plan === 'free' && currentCats.length >= 3) {
      throw new Error("Free Limit Reached. Upgrade to Pro to add more categories.");
    }

    const newCats = [...currentCats, categoryName];
    transaction.update(userRef, { subCategories: newCats });

    updatedUser = { ...userData, subCategories: newCats, uid: userData.uid };
  });

  if (!updatedUser) throw new Error("Failed to add category");
  return sanitizeUser(updatedUser);
};

export const apiRemoveBranchSubCategory = async (uid: string, categoryName: string): Promise<User> => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    subCategories: arrayRemove(categoryName)
  });
  const updated = await apiGetUser(uid);
  if (!updated) throw new Error("User not found");
  return updated;
};

export const apiUpgradePlan = async (uid: string): Promise<User> => {
  // SECURE IMPLEMENTATION: Prevent auto-upgrade
  // In a real app, this would create a request or verify a Stripe payment intent.
  throw new Error("Automatic upgrade is disabled. Please contact Super Admin for Pro Plan activation.");

  /* 
  // Old insecure code removed
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, { plan: 'pro' });
  const updated = await apiGetUser(uid);
  if (!updated) throw new Error("User not found");
  return updated;
  */
};

// --- Product Services ---

// 1. Performance Fix: Pagination & Country Filtering
export const apiGetProducts = async (limitCount: number = 50, country?: string): Promise<Product[]> => {
  try {
    const productsRef = collection(db, "products");
    let constraints: any[] = [
      orderBy("createdAt", "desc"), // Ensure you have an index for country + createdAt if filtering by country
      limit(limitCount)
    ];

    if (country) {
      constraints = [
        where("country", "==", country),
        ...constraints // Note: Firestore requires composite index for 'country' + 'createdAt'
      ];
    }

    // If index is missing, this might fail initially. We'll fallback to simple limit if needed or handle error.
    // Ideally, catch the index error and log the link.
    const q = query(productsRef, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => ({ ...d.data() as any, id: d.id } as Product));
  } catch (e: any) {
    console.warn("Product fetch error (likely missing index or field):", e);
    // Fallback: Fetch latest 50 without country filter (client-side filtering fallback)
    // This maintains stability if 'country' field or index is missing
    const q = query(collection(db, "products"), limit(limitCount));
    const snap = await getDocs(q);
    const products = snap.docs.map(d => ({ ...d.data() as any, id: d.id } as Product));

    if (country) {
      return products.filter(p => (p as any).country === country);
    }
    return products;
  }
};

export const apiSaveProduct = async (product: Product): Promise<void> => {
  const { id, ...data } = product;

  // 1. Get Branch Owner to check Plan & Country
  // Format: branch-UID -> UID
  const ownerUid = product.branchID.replace('branch-', '');
  const userRef = doc(db, "users", ownerUid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error("Branch owner not found. Cannot save product.");
  }

  const userData = userSnap.data() as User;
  const isPro = userData.plan === 'pro';
  const limitCount = isPro ? 100 : 10;

  // 2. Enforce Limits (Only for NEW products)
  if (!id || id.trim() === '') {
    const { getCountFromServer } = await import('firebase/firestore'); // Dynamic import
    const q = query(collection(db, "products"), where("branchID", "==", product.branchID));
    const snapshot = await getCountFromServer(q);
    const currentCount = snapshot.data().count;

    if (currentCount >= limitCount) {
      throw new Error(`Plan Limit Reached. ${isPro ? 'Pro' : 'Free'} plan allows ${limitCount} products. Upgrade or delete items.`);
    }
  }

  // 3. Prepare Data with Country
  const cleanData: any = {
    ...data,
    country: userData.branchCountry || userData.country || 'Pakistan', // Ensure country is saved
    createdAt: (data as any).createdAt || Date.now() // Ensure createdAt for sorting
  };

  // Clean undefined
  Object.keys(cleanData).forEach(key => {
    if (cleanData[key] === undefined) delete cleanData[key];
  });

  if (id && id.trim() !== '') {
    // Update existing
    await updateDoc(doc(db, "products", id), cleanData);
  } else {
    // Create new
    await addDoc(collection(db, "products"), cleanData);
  }
};

export const apiDeleteProduct = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "products", id));
};

export const apiGetProductsByCategory = async (category: string, country?: string, limitCount: number = 50): Promise<Product[]> => {
  const productsRef = collection(db, "products");
  let constraints: any[] = [
    where("category", "==", category),
    limit(limitCount)
  ];

  if (country) {
    constraints.push(where("country", "==", country));
  }

  // Note: orderBy might require composite index with category/country
  // For safety/stability regarding indexes, we won't add orderBy("createdAt") here unless verified

  const q = query(productsRef, ...constraints);

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Product));
  } catch (e) {
    console.warn("Category fetch error:", e);
    // Fallback: fetch purely by category (requires simple index)
    const fbQ = query(productsRef, where("category", "==", category), limit(limitCount));
    const snap = await getDocs(fbQ);
    let res = snap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
    if (country) res = res.filter(p => (p as any).country === country);
    return res;
  }
}

export const apiGetProductsByBranch = async (branchID: string, limitCount: number = 50): Promise<Product[]> => {
  const q = query(
    collection(db, "products"),
    where("branchID", "==", branchID),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Product));
  } catch (e) {
    // Fallback if index missing
    const fbQ = query(collection(db, "products"), where("branchID", "==", branchID), limit(limitCount));
    const snap = await getDocs(fbQ);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
  }
};

// --- Order Services ---

export const apiCreateOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<string> => {
  if (order.couponCode) {
    const q = query(
      collection(db, "coupons"),
      where("code", "==", order.couponCode),
      where("branchID", "==", order.branchID),
      where("isActive", "==", true)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error(`Invalid coupon code: ${order.couponCode}`);
    }

    const couponDoc = snap.docs[0];
    const coupon = couponDoc.data() as Coupon;

    if (new Date(coupon.expiryDate) < new Date()) {
      throw new Error(`Coupon ${order.couponCode} has expired.`);
    }

    const estimatedOriginalTotal = (order.finalAmount || order.totalAmount) + (order.discountAmount || 0);
    if (estimatedOriginalTotal < coupon.minOrderAmount) {
      throw new Error(`Order amount (${estimatedOriginalTotal}) is less than minimum required for coupon ${order.couponCode}.`);
    }

    // Check if user has already used this coupon
    const usageQuery = query(
      collection(db, "orders"),
      where("userID", "==", order.userID),
      where("couponCode", "==", order.couponCode),
      where("branchID", "==", order.branchID)
    );
    const usageSnap = await getDocs(usageQuery);
    if (!usageSnap.empty) {
      throw new Error(`You have already used the coupon code ${order.couponCode}.`);
    }

    await updateDoc(couponDoc.ref, { usageCount: increment(1) });
  }

  const newOrder = {
    ...order,
    status: OrderStatus.PENDING,
    createdAt: Date.now()
  };
  const docRef = await addDoc(collection(db, "orders"), newOrder);

  // Notify Branch Admin
  const branchAdminUid = order.branchID.replace('branch-', '');
  await apiCreateNotification({
    userID: branchAdminUid,
    title: "New Order Received",
    message: `You have received a new order #${docRef.id.slice(0, 8).toUpperCase()} for ${CURRENCY}${order.totalAmount.toFixed(2)}.`,
    type: 'order'
  });

  for (const item of order.products) {
    const prodRef = doc(db, "products", item.productID);
    const prodSnap = await getDoc(prodRef);
    if (prodSnap.exists()) {
      const prodData = prodSnap.data() as Product;

      let newStock = 0;
      let stockUpdated = false;

      if (item.variantId && prodData.variants) {
        const updatedVariants = prodData.variants.map(v => {
          if (v.id === item.variantId) {
            newStock = Math.max(0, v.stock - item.quantity);
            stockUpdated = true;
            return { ...v, stock: newStock };
          }
          return v;
        });

        if (stockUpdated) {
          await updateDoc(prodRef, { variants: updatedVariants });
        }
      }

      if (!stockUpdated) {
        newStock = Math.max(0, prodData.stock - item.quantity);
        await updateDoc(prodRef, { stock: newStock });
      }

      await apiAddInventoryLog({
        productID: item.productID,
        productName: item.name + (item.variantName ? ` (${item.variantName})` : ''),
        branchID: order.branchID,
        changeAmount: -item.quantity,
        newStock: newStock,
        reason: `Order #${docRef.id.slice(0, 6)}`,
        timestamp: new Date().toISOString(),
        performedBy: 'System (Order)'
      });
    }
  }

  return docRef.id;
};

export const apiGetOrders = async (role: UserRole, userId?: string, branchId?: string): Promise<Order[]> => {
  let q;
  const ordersRef = collection(db, "orders");

  if (role === UserRole.SUPER_ADMIN) {
    q = ordersRef;
  } else if (role === UserRole.BRANCH_ADMIN && branchId) {
    q = query(ordersRef, where("branchID", "==", branchId));
  } else if (role === UserRole.USER && userId) {
    q = query(ordersRef, where("userID", "==", userId));
  } else {
    return [];
  }

  const querySnapshot = await getDocs(q);
  const orders = querySnapshot.docs.map(d => ({ ...(d.data() as any), id: d.id } as Order));
  return orders.sort((a, b) => b.createdAt - a.createdAt);
};

export const apiGetOrderById = async (orderId: string): Promise<Order | null> => {
  const docRef = doc(db, "orders", orderId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { ...(docSnap.data() as any), id: docSnap.id } as Order;
  }
  return null;
}

export const apiUpdateOrderStatus = async (orderId: string, status: OrderStatus, updatedBy: string = 'System'): Promise<void> => {
  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, {
    status,
    statusHistory: arrayUnion({
      status,
      timestamp: Date.now(),
      updatedBy
    })
  });
};

// --- Branch Request Services ---

const normalizeCountry = (country: string): string => {
  const normalized = country.toLowerCase().trim();
  const map: Record<string, string> = { 'dubai': 'uae', 'united arab emirates': 'uae' };
  return map[normalized] || normalized;
};

export const apiGetCountryConfig = async (country: string): Promise<CountryConfig | null> => {
  try {
    const id = normalizeCountry(country);
    const docRef = doc(db, "countries", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...snap.data(), id: snap.id } as CountryConfig;
    }
  } catch (e) {
    console.warn("Error fetching country config:", e);
  }
  return null;
};

export const apiSaveCountryConfig = async (config: CountryConfig): Promise<void> => {
  const normalized = config.id.toLowerCase().trim();
  const docRef = doc(db, "countries", normalized);
  await setDoc(docRef, config, { merge: true });
};

export const apiUploadFile = async (file: File, path: string): Promise<string> => {
  const { storage } = await import('./firebase');
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');

  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}

export const apiCreateBranchRequest = async (request: Omit<BranchRequest, 'id' | 'status' | 'createdAt'>): Promise<void> => {
  const newReq = {
    ...request,
    status: RequestStatus.PENDING,
    createdAt: Date.now()
  };
  await addDoc(collection(db, "branch_requests"), newReq);
};

export const apiGetBranchRequests = async (userId?: string): Promise<BranchRequest[]> => {
  let q;
  const reqRef = collection(db, "branch_requests");

  if (userId) {
    q = query(reqRef, where("userID", "==", userId));
  } else {
    // Only Admin can see all
    q = query(reqRef);
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ ...d.data() as any, id: d.id } as BranchRequest));
};

// --- Branch Services (New) ---
// This function fetches branches from the 'branches' collection AND falls back to 'users' collection
// for backward compatibility with existing branch admins who don't have a branches document yet.
export const apiGetBranches = async (country: string, isSuperAdmin: boolean = false): Promise<Branch[]> => {
  const results: Branch[] = [];
  const seenIds = new Set<string>();

  // 1. Try to get from 'branches' collection first
  try {
    const branchesRef = collection(db, "branches");
    let q;

    if (isSuperAdmin) {
      q = query(branchesRef);
    } else if (country) {
      q = query(branchesRef, where("country", "==", country), where("status", "==", "approved"));
    } else {
      // No country set - return empty
      return [];
    }

    const snapshot = await getDocs(q);
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data() as any;
      const branch: Branch = {
        id: docSnap.id,
        ownerId: data.ownerId || '',
        name: data.name || 'Shop',
        country: data.country || '',
        status: data.status || 'approved',
        logoURL: data.logoURL,
        bannerURL: data.bannerURL,
        rating: data.rating,
        reviewCount: data.reviewCount,
        shopCategory: data.shopCategory,
        description: data.description
      };
      results.push(branch);
      seenIds.add(branch.id);
    });
  } catch (e) {
    console.warn("Could not query branches collection:", e);
  }

  // 2. Fallback: Also check 'users' collection for BRANCH_ADMINs (backward compatibility)
  try {
    const usersRef = collection(db, "users");
    const usersQuery = query(usersRef, where("role", "==", UserRole.BRANCH_ADMIN));
    const usersSnapshot = await getDocs(usersQuery);

    usersSnapshot.docs.forEach(userDoc => {
      const userData = userDoc.data() as User;
      const branchId = userData.branchID;

      // Skip if we already have this branch from the branches collection
      if (!branchId || seenIds.has(branchId)) return;

      // Get the branch's country
      const userBranchCountry = userData.branchCountry || userData.country || '';

      // STRICT: For non-superadmins, only show branches that:
      // 1. Have a country set
      // 2. Match the user's country case-insensitively
      if (!isSuperAdmin) {
        // Require country match
        const normalizedUserCountry = (country || '').toLowerCase().trim();
        const normalizedBranchCountry = userBranchCountry.toLowerCase().trim();

        if (!normalizedUserCountry || !normalizedBranchCountry || normalizedBranchCountry !== normalizedUserCountry) {
          return; // Skip - country mismatch or not set
        }
      }

      // Create a Branch object from User data
      const branch: Branch = {
        id: branchId,
        ownerId: userData.uid,
        name: userData.name || 'Shop',
        country: userBranchCountry,
        status: 'approved',
        logoURL: userData.logoURL,
        bannerURL: userData.bannerURL,
        rating: userData.rating,
        reviewCount: userData.reviewCount,
        shopCategory: userData.shopCategory,
        description: userData.description
      };
      results.push(branch);
      seenIds.add(branchId);
    });
  } catch (e) {
    console.warn("Could not query users collection for branches:", e);
  }

  return results;
};

// Update branch country in both users and branches collections
export const apiUpdateBranchCountry = async (userId: string, branchId: string, newCountry: string): Promise<void> => {
  // 1. Update user's branchCountry and country
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    country: newCountry,
    branchCountry: newCountry
  });

  // 2. Update branches collection if exists
  try {
    const branchRef = doc(db, "branches", branchId);
    const branchSnap = await getDoc(branchRef);
    if (branchSnap.exists()) {
      await updateDoc(branchRef, { country: newCountry });
    }
  } catch (e) {
    console.warn("Could not update branches collection:", e);
  }
};

export const apiUpdateBranchRequestStatus = async (requestId: string, status: RequestStatus): Promise<void> => {
  const reqRef = doc(db, "branch_requests", requestId);
  await updateDoc(reqRef, { status });

  if (status === RequestStatus.APPROVED) {
    const reqSnap = await getDoc(reqRef);
    if (reqSnap.exists()) {
      const reqData = reqSnap.data() as BranchRequest;
      const branchId = `branch-${reqData.userID}`;

      // 1. Update User Profile
      const userRef = doc(db, "users", reqData.userID);
      await updateDoc(userRef, {
        role: UserRole.BRANCH_ADMIN,
        branchID: branchId,
        shopCategory: reqData.shopCategory || '',
        branchCountry: reqData.country || undefined
      });

      // 2. Create Branch Document in 'branches' collection
      const newBranch: Branch = {
        id: branchId,
        ownerId: reqData.userID,
        name: reqData.shopName || reqData.userName, // Use requested shop name or fallback
        country: reqData.country || 'Dubai', // Fallback
        status: 'approved',
        shopCategory: reqData.shopCategory,
        description: "New verified seller on NexusCart.",
        rating: 0,
        reviewCount: 0
      };

      // Use setDoc to ensure ID matches branchId
      await setDoc(doc(db, "branches", branchId), newBranch);
    }
  }
};

// --- Payment Methods ---

export const apiGetPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const querySnapshot = await getDocs(collection(db, "payment_methods"));
  return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as PaymentMethod));
};

export const apiSavePaymentMethod = async (method: PaymentMethod): Promise<void> => {
  const { id, ...data } = method;
  if (id) {
    await updateDoc(doc(db, "payment_methods", id), data);
  } else {
    await addDoc(collection(db, "payment_methods"), data);
  }
};

export const apiDeletePaymentMethod = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "payment_methods", id));
};

// --- New Country-Wise Payment System ---

export const apiGetCountryLocalPaymentMethods = async (country: string, onlyEnabled = true): Promise<CountryLocalPaymentMethod[]> => {
  try {
    const id = normalizeCountry(country);
    const constraints: any[] = [where("country", "==", id)];
    if (onlyEnabled) {
      constraints.push(where("enabled", "==", true));
    }
    const q = query(collection(db, "country_local_payment_methods"), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as CountryLocalPaymentMethod));
  } catch (e) {
    console.warn("Failed to fetch local payment methods:", e);
    return [];
  }
};

export const apiSaveCountryLocalPaymentMethod = async (method: CountryLocalPaymentMethod): Promise<void> => {
  const { id, ...data } = method;
  if (id) {
    await updateDoc(doc(db, "country_local_payment_methods", id), data);
  } else {
    await addDoc(collection(db, "country_local_payment_methods"), data);
  }
};

export const apiDeleteCountryLocalPaymentMethod = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "country_local_payment_methods", id));
};

export const apiGetPlatformPaymentAccounts = async (country: string, onlyEnabled = true): Promise<PlatformPaymentAccount[]> => {
  try {
    const id = normalizeCountry(country);
    const constraints: any[] = [where("country", "==", id)];
    if (onlyEnabled) {
      constraints.push(where("enabled", "==", true));
    }
    const q = query(collection(db, "platform_payment_accounts"), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as PlatformPaymentAccount));
  } catch (e) {
    console.warn("Failed to fetch platform accounts:", e);
    return [];
  }
};

export const apiSavePlatformPaymentAccount = async (account: PlatformPaymentAccount): Promise<void> => {
  const { id, ...data } = account;
  if (id) {
    await updateDoc(doc(db, "platform_payment_accounts", id), data);
  } else {
    await addDoc(collection(db, "platform_payment_accounts"), data);
  }
};

export const apiDeletePlatformPaymentAccount = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "platform_payment_accounts", id));
};

export const apiGetGlobalPaymentProviders = async (): Promise<GlobalPaymentProvider[]> => {
  const querySnapshot = await getDocs(collection(db, "global_payment_providers"));
  return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as GlobalPaymentProvider));
}

export const apiSaveGlobalPaymentProvider = async (provider: GlobalPaymentProvider): Promise<void> => {
  const { id, ...data } = provider;
  if (id) {
    await updateDoc(doc(db, "global_payment_providers", id), data);
  } else {
    await addDoc(collection(db, "global_payment_providers"), data);
  }
}

export const apiDeleteGlobalPaymentProvider = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "global_payment_providers", id));
}

// --- System Settings ---

export const apiGetSystemSettings = async (): Promise<SystemSettings> => {
  try {
    const docRef = doc(db, 'settings', 'global');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SystemSettings;
    }
  } catch (e) {
    console.warn("Could not fetch settings, using defaults", e);
  }
  return { branchSetupFee: 500, platformName: 'NexusCart', maintenanceMode: false };
};

export const apiUpdateSystemSettings = async (settings: SystemSettings): Promise<void> => {
  const docRef = doc(db, 'settings', 'global');
  await setDoc(docRef, settings, { merge: true });
};

// --- CMS ---

export const apiGetAllContentPages = async (): Promise<ContentPage[]> => {
  const q = query(collection(db, "content_pages"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as ContentPage));
};

export const apiGetContentPage = async (pageId: string): Promise<ContentPage> => {
  try {
    const docRef = doc(db, "content_pages", pageId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as ContentPage;
    }
    return {
      id: pageId,
      title: pageId.charAt(0).toUpperCase() + pageId.slice(1),
      content: "Content coming soon.",
      updatedAt: new Date().toISOString()
    };
  } catch (e) {
    return { id: pageId, title: "Error", content: "Failed to load content.", updatedAt: "" };
  }
};

export const apiSaveContentPage = async (pageId: string, data: { title: string, content: string }): Promise<void> => {
  const docRef = doc(db, "content_pages", pageId);
  await setDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString()
  }, { merge: true });
};

export const apiDeleteContentPage = async (pageId: string): Promise<void> => {
  await deleteDoc(doc(db, "content_pages", pageId));
};

// --- Social Links ---

export const apiGetSocialLinks = async (): Promise<SocialLink[]> => {
  const q = query(collection(db, "social_links"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as SocialLink));
};

export const apiSaveSocialLink = async (link: SocialLink): Promise<void> => {
  const { id, ...data } = link;
  if (id) {
    await setDoc(doc(db, "social_links", id), data, { merge: true });
  } else {
    await addDoc(collection(db, "social_links"), data);
  }
};

export const apiDeleteSocialLink = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "social_links", id));
};

// --- Categories ---

export const apiGetCategories = async (): Promise<Category[]> => {
  const querySnapshot = await getDocs(collection(db, "categories"));
  return querySnapshot.docs.map(d => ({ ...d.data() as any, id: d.id } as Category));
};

export const apiSaveCategory = async (category: Partial<Category>): Promise<void> => {
  const { id, ...data } = category;
  if (id) {
    await setDoc(doc(db, "categories", id), data, { merge: true });
  } else {
    await addDoc(collection(db, "categories"), { ...data, productCount: 0 });
  }
};

export const apiDeleteCategory = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "categories", id));
};

// --- Notifications ---

export const apiGetNotifications = async (userId: string): Promise<Notification[]> => {
  const q = query(collection(db, "notifications"), where("userID", "==", userId));
  const querySnapshot = await getDocs(q);
  const notifs = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Notification));
  return notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const apiCreateNotification = async (notification: Omit<Notification, 'id' | 'read' | 'date'>): Promise<void> => {
  await addDoc(collection(db, "notifications"), {
    ...notification,
    read: false,
    date: new Date().toISOString()
  });
};

export const apiMarkNotificationRead = async (id: string): Promise<void> => {
  await updateDoc(doc(db, "notifications", id), { read: true });
};

export const apiMarkAllNotificationsRead = async (userId: string): Promise<void> => {
  const q = query(collection(db, "notifications"), where("userID", "==", userId), where("read", "==", false));
  const snapshot = await getDocs(q);
  const batchPromises = snapshot.docs.map(doc => updateDoc(doc.ref, { read: true }));
  await Promise.all(batchPromises);
};

// --- Product Reviews ---

export const apiGetReviews = async (productId: string): Promise<Review[]> => {
  const q = query(collection(db, "reviews"), where("productID", "==", productId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Review));
}

export const apiAddReview = async (review: Omit<Review, 'id' | 'date'>): Promise<Review> => {
  const newReview = {
    ...review,
    date: new Date().toISOString()
  };

  // 1. Add review doc
  const docRef = await addDoc(collection(db, "reviews"), newReview);

  // 2. Update Product Rating stats
  const productRef = doc(db, "products", review.productID);
  const productSnap = await getDoc(productRef);

  if (productSnap.exists()) {
    const prodData = productSnap.data() as Product;
    const currentRating = prodData.rating || 0;
    const currentCount = prodData.reviewCount || 0;

    const newCount = currentCount + 1;
    const newAvg = ((currentRating * currentCount) + review.rating) / newCount;

    await updateDoc(productRef, {
      rating: newAvg,
      reviewCount: newCount
    });
  }

  return { ...newReview, id: docRef.id };
}

// --- SHOP Reviews & Rating System (NEW) ---

export const apiGetShopReviews = async (branchId: string): Promise<ShopReview[]> => {
  const q = query(collection(db, "shop_reviews"), where("branchID", "==", branchId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as ShopReview));
}

export const apiAddShopReview = async (review: Omit<ShopReview, 'id' | 'date'>): Promise<ShopReview> => {
  const newReview = {
    ...review,
    date: new Date().toISOString()
  };

  // 1. Add the review document
  const docRef = await addDoc(collection(db, "shop_reviews"), newReview);

  // 2. Find the Branch User to update rating
  const userUid = review.branchID.replace('branch-', '');

  let userRef = doc(db, "users", userUid);
  let userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const q = query(collection(db, "users"), where("branchID", "==", review.branchID));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      userRef = qSnap.docs[0].ref;
      userSnap = qSnap.docs[0];
    } else {
      throw new Error("Branch user not found to update rating.");
    }
  }

  const userData = userSnap.data() as User;
  const currentRating = userData.rating || 0;
  const currentCount = userData.reviewCount || 0;

  const newCount = currentCount + 1;
  const newRating = ((currentRating * currentCount) + review.rating) / newCount;

  await updateDoc(userRef, {
    rating: newRating,
    reviewCount: newCount
  });

  return { ...newReview, id: docRef.id };
}


// --- Wishlist ---

export const apiGetWishlist = async (userId: string): Promise<string[]> => {
  const docRef = doc(db, "wishlists", userId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data().productIDs || [];
  }
  return [];
}

export const apiToggleWishlist = async (userId: string, productId: string): Promise<boolean> => {
  const docRef = doc(db, "wishlists", userId);
  const docSnap = await getDoc(docRef);
  let isAdded = false;

  if (docSnap.exists()) {
    const list = docSnap.data().productIDs || [];
    if (list.includes(productId)) {
      await updateDoc(docRef, { productIDs: arrayRemove(productId) });
      isAdded = false;
    } else {
      await updateDoc(docRef, { productIDs: arrayUnion(productId) });
      isAdded = true;
    }
  } else {
    await setDoc(docRef, { productIDs: [productId] });
    isAdded = true;
  }
  return isAdded;
}

// --- Ads ---

export const apiGetActiveAds = async (): Promise<Ad[]> => {
  const q = query(collection(db, "ads"), where("active", "==", true));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Ad));
}

export const apiGetAllAds = async (): Promise<Ad[]> => {
  const querySnapshot = await getDocs(collection(db, "ads"));
  return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Ad));
}

export const apiSaveAd = async (ad: Ad): Promise<void> => {
  const { id, ...data } = ad;
  if (id) {
    await updateDoc(doc(db, "ads", id), data);
  } else {
    await addDoc(collection(db, "ads"), data);
  }
}

export const apiDeleteAd = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "ads", id));
}

// --- Branch Staff ---

export const apiGetBranchStaff = async (branchId: string): Promise<BranchStaff[]> => {
  const q = query(collection(db, "branch_staff"), where("branchID", "==", branchId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as BranchStaff));
}

export const apiAddBranchStaff = async (staff: Omit<BranchStaff, 'id'>): Promise<void> => {
  await addDoc(collection(db, "branch_staff"), staff);
}

export const apiDeleteBranchStaff = async (staffId: string): Promise<void> => {
  await deleteDoc(doc(db, "branch_staff", staffId));
}

// --- Coupons ---
export const apiGetCoupons = async (branchId: string): Promise<Coupon[]> => {
  const q = query(collection(db, "coupons"), where("branchID", "==", branchId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Coupon));
}

export const apiSaveCoupon = async (coupon: Coupon): Promise<void> => {
  const { id, ...data } = coupon;
  if (id) {
    await updateDoc(doc(db, "coupons", id), data);
  } else {
    await addDoc(collection(db, "coupons"), data);
  }
}

export const apiDeleteCoupon = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "coupons", id));
}

export const apiValidateCoupon = async (code: string, branchId: string, orderAmount: number): Promise<{ isValid: boolean, discount: number, message: string }> => {
  const q = query(collection(db, "coupons"), where("code", "==", code), where("branchID", "==", branchId), where("isActive", "==", true));
  const snap = await getDocs(q);

  if (snap.empty) return { isValid: false, discount: 0, message: "Invalid coupon code" };

  const coupon = snap.docs[0].data() as Coupon;

  if (new Date(coupon.expiryDate) < new Date()) return { isValid: false, discount: 0, message: "Coupon expired" };
  if (orderAmount < coupon.minOrderAmount) return { isValid: false, discount: 0, message: `Minimum order of ${coupon.minOrderAmount} required` };

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { isValid: false, discount: 0, message: "Coupon usage limit reached" };
  }

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = (orderAmount * coupon.value) / 100;
  } else {
    discount = coupon.value;
  }

  discount = Math.min(discount, orderAmount);

  return { isValid: true, discount, message: "Coupon applied" };
}

// --- Inventory Logs ---
export const apiGetInventoryLogs = async (branchId: string): Promise<InventoryLog[]> => {
  // UPDATED: Removed orderBy/limit from query to avoid composite index requirement.
  // Sorting and limiting is now done client-side.
  const q = query(collection(db, "inventory_logs"), where("branchID", "==", branchId));
  const snap = await getDocs(q);
  const logs = snap.docs.map(d => ({ ...d.data(), id: d.id } as InventoryLog));

  // Sort descending by timestamp (newest first) and limit to 100
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100);
}

export const apiAddInventoryLog = async (log: Omit<InventoryLog, 'id'>): Promise<void> => {
  await addDoc(collection(db, "inventory_logs"), log);
}

// --- Chat System ---
export const apiGetChats = async (userId: string, role: UserRole, branchId?: string): Promise<Chat[]> => {
  // Use participants array-contains to get all chats for this user/branch
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", role === UserRole.BRANCH_ADMIN && branchId ? branchId : userId)
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as Chat)).sort((a, b) => b.updatedAt - a.updatedAt);
}

export const apiGetMessages = async (chatId: string): Promise<ChatMessage[]> => {
  const q = query(collection(db, `chats/${chatId}/messages`), orderBy("timestamp", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...(d.data() as any), id: d.id } as ChatMessage));
}

export const apiSendMessage = async (chatId: string, message: Omit<ChatMessage, 'id'>, chatData?: Partial<Chat>): Promise<void> => {
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);

  const updates = {
    lastMessage: message.text,
    lastMessageTime: message.timestamp,
    updatedAt: message.timestamp,
    unreadCount: increment(1) // Increment unread for the recipient
  };

  if (!chatSnap.exists() && chatData) {
    await setDoc(chatRef, {
      ...chatData,
      ...updates,
      unreadCount: 1
    });
  } else {
    await updateDoc(chatRef, updates);
  }

  await addDoc(collection(db, `chats/${chatId}/messages`), message);
}

export const apiResetChatUnread = async (chatId: string): Promise<void> => {
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, { unreadCount: 0 });
}

export const apiInitChat = async (userId: string, branchId: string, userName: string, branchName: string): Promise<string> => {
  const chatId = `chat_${userId}_${branchId}`;
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      id: chatId,
      participants: [userId, branchId],
      userID: userId,
      userName,
      branchID: branchId,
      branchName,
      lastMessage: '',
      lastMessageTime: Date.now(),
      updatedAt: Date.now()
    });
  }
  return chatId;
}

// --- Dispute System ---

export const apiCreateDispute = async (dispute: Omit<Dispute, 'id' | 'status' | 'createdAt'>): Promise<void> => {
  await addDoc(collection(db, "disputes"), {
    ...dispute,
    status: DisputeStatus.OPEN,
    createdAt: Date.now()
  });

  // Notify Branch Admin about new report
  const branchUid = dispute.branchID.replace('branch-', '');
  await apiCreateNotification({
    userID: branchUid,
    title: "New Customer Report",
    message: `A customer has reported an issue with Order #${dispute.orderID.slice(0, 8).toUpperCase()}.`,
    type: 'system'
  });
};

export const apiGetDisputes = async (): Promise<Dispute[]> => {
  const q = query(collection(db, "disputes"));
  const snap = await getDocs(q);
  const disputes = snap.docs.map(d => ({ ...d.data(), id: d.id } as Dispute));
  return disputes.sort((a, b) => b.createdAt - a.createdAt);
};

export const apiGetDisputesByBranch = async (branchId: string): Promise<Dispute[]> => {
  const q = query(collection(db, "disputes"), where("branchID", "==", branchId));
  const snap = await getDocs(q);
  const disputes = snap.docs.map(d => ({ ...d.data(), id: d.id } as Dispute));
  return disputes.sort((a, b) => b.createdAt - a.createdAt);
};

export const apiReplyToDispute = async (disputeId: string, reply: string, userId: string): Promise<void> => {
  const disputeRef = doc(db, "disputes", disputeId);
  await updateDoc(disputeRef, {
    resolution: reply,
    status: DisputeStatus.RESOLVED,
    resolvedAt: Date.now()
  });

  // Notify User about the reply
  await apiCreateNotification({
    userID: userId,
    title: "Response to your Report",
    message: `A branch admin has replied to your report. Resolution: ${reply}`,
    type: 'system'
  });
};

export const apiResolveDispute = async (id: string, resolution: string): Promise<void> => {
  await updateDoc(doc(db, "disputes", id), {
    status: DisputeStatus.RESOLVED,
    resolution,
    resolvedAt: Date.now()
  });
};

export const apiBroadcastNotification = async (title: string, message: string): Promise<void> => {
  const users = await apiGetUsers();
  const batchPromises = users.map(u => apiCreateNotification({
    userID: u.uid,
    title,
    message,
    type: 'system'
  }));
  await Promise.all(batchPromises);
};

export const apiDeleteOrder = async (orderId: string): Promise<void> => {
  await deleteDoc(doc(db, "orders", orderId));
};
export const apiGetFinancePayments = async (): Promise<FinancePayment[]> => {
  const querySnapshot = await getDocs(collection(db, "finance_payments"));
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FinancePayment));
};

export const apiSubmitFinancePayment = async (payment: Omit<FinancePayment, 'id' | 'status' | 'createdAt'>): Promise<void> => {
  await addDoc(collection(db, "finance_payments"), {
    ...payment,
    status: 'pending',
    createdAt: Date.now()
  });
};

export const apiUpdateFinancePaymentStatus = async (id: string, status: FinancePayment['status']): Promise<void> => {
  const docRef = doc(db, "finance_payments", id);
  await updateDoc(docRef, { status });
};

// --- Branch Slug Management ---

export const apiGetBranch = async (branchId: string): Promise<Branch | null> => {
  const docRef = doc(db, "branches", branchId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { ...docSnap.data() as any, id: docSnap.id } as Branch;
  }
  return null;
};

export const apiGetBranchBySlug = async (slug: string): Promise<Branch | null> => {
  const q = query(collection(db, "branches"), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { ...docSnap.data() as any, id: docSnap.id } as Branch;
};

export const apiCheckSlugAvailability = async (slug: string): Promise<boolean> => {
  const q = query(collection(db, "branches"), where("slug", "==", slug));
  const snap = await getDocs(q);
  return snap.empty;
};

export const apiUpdateBranchSlug = async (branchId: string, slug: string): Promise<void> => {
  // Validate format
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("Slug must contain only lowercase letters, numbers, and hyphens.");
  }

  // Check unique
  const q = query(collection(db, "branches"), where("slug", "==", slug));
  const snap = await getDocs(q);

  if (!snap.empty) {
    // If it's the same branch, it's fine
    if (snap.docs[0].id === branchId) return;
    throw new Error("This Shop URL is already taken.");
  }

  // Update
  await updateDoc(doc(db, "branches", branchId), { slug });
};
