import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { WishlistProvider } from './context/WishlistContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/Home';
import { ProductDetailsPage } from './pages/ProductDetails';
import { AuthPage } from './pages/Auth';
import { CheckoutPage } from './pages/Checkout';
import { CartPage } from './pages/CartPage';
import { OrderSuccessPage } from './pages/OrderSuccess';
import { OrderDetailsPage } from './pages/OrderDetails';
import { ProfilePage } from './pages/Profile';
import { UserDashboard } from './pages/UserDashboard';
import { BranchDashboard } from './pages/BranchDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { NotFoundPage } from './pages/NotFound';
import { UnauthorizedPage } from './pages/Unauthorized';
// New Pages
import { AboutContactPage } from './pages/AboutContact';
import { NotificationsPage } from './pages/Notifications';
import { BranchStaffPage } from './pages/BranchStaff';
import { BranchSettingsPage } from './pages/BranchSettings';
import { AdminCategoriesPage } from './pages/AdminCategories';
import { AdminReportsPage } from './pages/AdminReports';
import { WishlistPage } from './pages/Wishlist';
// Shop Flow Pages
import { CategoryShopsPage } from './pages/CategoryShopsPage';
import { ShopPage } from './pages/ShopPage';
import { BranchReviewsPage } from './pages/BranchReviews';

// Legal Pages
import { LegalPage } from './pages/Legal';

import { UserRole } from './types';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/product/:id" element={<ProductDetailsPage />} />

        {/* New Shop Flow Routes */}
        <Route path="/category/:categoryName" element={<CategoryShopsPage />} />
        <Route path="/shop/:branchId" element={<ShopPage />} />

        <Route path="/auth" element={<AuthPage />} />
        <Route path="/cart" element={<CartPage />} />

        {/* Static / Content Pages */}
        <Route path="/about" element={<AboutContactPage />} />
        <Route path="/privacy" element={<LegalPage pageId="privacy" />} />
        <Route path="/terms" element={<LegalPage pageId="terms" />} />
        <Route path="/page/:pageId" element={<LegalPage />} />

        {/* Protected Routes */}
        <Route path="/notifications" element={
          <ProtectedRoute roles={[UserRole.USER, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN]}>
            <NotificationsPage />
          </ProtectedRoute>
        } />

        <Route path="/wishlist" element={
          <ProtectedRoute roles={[UserRole.USER, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN]}>
            <WishlistPage />
          </ProtectedRoute>
        } />

        <Route path="/checkout" element={
          <ProtectedRoute roles={[UserRole.USER, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN]}>
            <CheckoutPage />
          </ProtectedRoute>
        } />

        <Route path="/order-success" element={
          <ProtectedRoute roles={[UserRole.USER, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN]}>
            <OrderSuccessPage />
          </ProtectedRoute>
        } />

        <Route path="/order/:id" element={
          <ProtectedRoute roles={[UserRole.USER, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN]}>
            <OrderDetailsPage />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute roles={[UserRole.USER, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN]}>
            <ProfilePage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/user" element={
          <ProtectedRoute roles={[UserRole.USER, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN]}>
            <UserDashboard />
          </ProtectedRoute>
        } />

        {/* Branch Admin Protected Routes */}
        <Route path="/dashboard/branch" element={
          <ProtectedRoute roles={[UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN]}>
            <BranchDashboard />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/branch/reviews" element={
          <ProtectedRoute roles={[UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN]}>
            <BranchReviewsPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/branch/staff" element={
          <ProtectedRoute roles={[UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN]}>
            <BranchStaffPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/branch/settings" element={
          <ProtectedRoute roles={[UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN]}>
            <BranchSettingsPage />
          </ProtectedRoute>
        } />

        {/* Super Admin Protected Routes */}
        <Route path="/dashboard/admin" element={
          <ProtectedRoute roles={[UserRole.SUPER_ADMIN]}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/admin/categories" element={
          <ProtectedRoute roles={[UserRole.SUPER_ADMIN]}>
            <AdminCategoriesPage />
          </ProtectedRoute>
        } />

        <Route path="/dashboard/admin/reports" element={
          <ProtectedRoute roles={[UserRole.SUPER_ADMIN]}>
            <AdminReportsPage />
          </ProtectedRoute>
        } />

        {/* Errors */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
};

export default function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <WishlistProvider>
              <CartProvider>
                <AppRoutes />
              </CartProvider>
            </WishlistProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </HashRouter>
  );
}
