import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, Menu, X, User as UserIcon, LogOut, LayoutDashboard, ShieldCheck, Bell, Heart, Facebook, Twitter, Instagram, Linkedin, Sun, Moon, Link as LinkIcon, ShoppingBag, Users, ClipboardList } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { APP_NAME, getCurrency } from '../constants';
import { Button } from './UI';
import { apiGetNotifications, apiGetSocialLinks, apiGetAllContentPages } from '../services/api';
import { UserRole, SocialLink, ContentPage } from '../types';
import { CountrySelector } from './CountrySelector';

// Helper for Nav Links
const NavLink = ({ to, children }: { to: string; children?: React.ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  const { theme } = useTheme();
  return (
    <Link
      to={to}
      className={`text-sm font-semibold transition-colors hover:text-blue-600 ${isActive ? 'text-blue-600' : theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
    >
      {children}
    </Link>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated, isBranchAdmin, isSuperAdmin } = useAuth();
  const { itemCount, total, cart, removeFromCart, clearCart } = useCart();
  const { wishlist } = useWishlist();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [pages, setPages] = useState<ContentPage[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const currency = getCurrency(user?.country);

  // Fetch unread notification count
  useEffect(() => {
    if (user) {
      apiGetNotifications(user.uid).then((notifs) => {
        setUnreadCount(notifs.filter(n => !n.read).length);
      });

      const interval = setInterval(() => {
        apiGetNotifications(user.uid).then((notifs) => {
          setUnreadCount(notifs.filter(n => !n.read).length);
        });
      }, 15000); // Check every 15s
      return () => clearInterval(interval);
    }
  }, [user, location]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsCartOpen(false); // Also close side cart on route change
  }, [location]);

  // Fetch Footer Data
  useEffect(() => {
    apiGetSocialLinks().then(setSocialLinks);
    apiGetAllContentPages().then(setPages);
  }, []);

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  const handleViewCart = () => {
    setIsCartOpen(false);
    navigate('/cart');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f172a] flex flex-col font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <CountrySelector />
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 transition-colors duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-md" />
            <span>{APP_NAME}</span>
          </Link>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 md:gap-6">

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <NavLink to="/">Marketplace</NavLink>
              <NavLink to="/about">About & Contact</NavLink>

              {isAuthenticated ? (
                <>
                  <NavLink to="/dashboard/user">My Orders</NavLink>

                  {isBranchAdmin && (
                    <Link to="/dashboard/branch" className="flex items-center gap-1 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors border border-purple-100 dark:border-purple-900/30">
                      <LayoutDashboard size={14} /> Branch Console
                    </Link>
                  )}

                  {isSuperAdmin && (
                    <Link to="/dashboard/admin" className="flex items-center gap-1 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-100 dark:border-red-900/30">
                      <ShieldCheck size={14} /> Admin
                    </Link>
                  )}

                  <Link to="/wishlist" className="relative p-2 text-gray-500 hover:text-red-500 transition-colors">
                    <Heart size={20} className={wishlist.length > 0 ? "fill-red-500 text-red-500" : ""} />
                  </Link>

                  <Link to="/notifications" className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold border border-white dark:border-slate-900">
                        {unreadCount}
                      </span>
                    )}
                  </Link>

                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-all duration-300"
                    aria-label="Toggle theme"
                  >
                    {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
                  </button>

                  <div className="h-6 w-px bg-gray-200 dark:bg-slate-800 mx-2"></div>

                  <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/profile')}>
                    <div className="text-right whitespace-nowrap">
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Welcome,</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight max-w-[100px] truncate">{user?.name}</p>
                    </div>
                    <div className="w-9 h-9 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-blue-600 font-bold border border-gray-200 dark:border-slate-700 group-hover:border-blue-300 transition-colors">
                      {user?.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <Button variant="outline" onClick={logout} className="!p-2 h-9 w-9 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/30">
                    <LogOut size={16} />
                  </Button>
                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="relative p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors group ml-2"
                    aria-label="Open cart"
                  >
                    <ShoppingCart size={22} className="text-gray-700 dark:text-gray-200 group-hover:text-blue-600 transition-colors" />
                    {itemCount > 0 && (
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
                        {itemCount}
                      </span>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="relative p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors group mr-2"
                    aria-label="Open cart"
                  >
                    <ShoppingCart size={22} className="text-gray-700 dark:text-gray-200 group-hover:text-blue-600 transition-colors" />
                    {itemCount > 0 && (
                      <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
                        {itemCount}
                      </span>
                    )}
                  </button>
                  <Link to="/auth">
                    <Button size="sm" className="font-semibold shadow-md shadow-blue-100">Sign In</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Only: Quick Actions */}
            <div className="flex md:hidden items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}
              </button>
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors group"
                aria-label="Open cart"
              >
                <ShoppingCart size={22} className="text-gray-700 dark:text-gray-200 group-hover:text-blue-600 transition-colors" />
                {itemCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200 shadow-xl absolute w-full left-0 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-2">Navigation</p>
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold transition-all">
                  <ShoppingBag size={18} className="text-blue-600" /> Marketplace
                </Link>
                <Link to="/about" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold transition-all">
                  <Users size={18} className="text-blue-600" /> About & Contact
                </Link>
                <Link to="/cart" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold transition-all">
                  <ShoppingCart size={18} className="text-blue-600" /> Shopping Cart
                </Link>
              </div>

              {isAuthenticated ? (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-2 mt-2">Account</p>
                    <Link to="/dashboard/user" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold transition-all">
                      <ClipboardList size={18} className="text-indigo-600" /> My Orders
                    </Link>
                    <Link to="/wishlist" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold transition-all">
                      <Heart size={18} className="text-red-600" /> My Wishlist
                    </Link>
                    <Link to="/notifications" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold transition-all">
                      <div className="flex items-center gap-3">
                        <Bell size={18} className="text-orange-500" /> Notifications
                      </div>
                      {unreadCount > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">{unreadCount}</span>}
                    </Link>
                    {isBranchAdmin && (
                      <Link to="/dashboard/branch" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 font-black border border-purple-100 dark:border-purple-900/30 transition-all">
                        <LayoutDashboard size={18} /> Branch Console
                      </Link>
                    )}
                    {isSuperAdmin && (
                      <Link to="/dashboard/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-black border border-red-100 dark:border-red-900/30 transition-all">
                        <ShieldCheck size={18} /> Super Admin
                      </Link>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 px-2 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold">
                        {user?.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-gray-100">{user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={logout} className="w-full justify-center text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200">
                      <LogOut size={16} /> Sign Out
                    </Button>
                  </div>
                </>
              ) : (
                <div className="pt-2">
                  <Link to="/auth" className="block">
                    <Button className="w-full justify-center">Sign In / Register</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Cart Sidebar */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
              <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
                <ShoppingCart size={20} className="text-blue-600 dark:text-blue-400" /> Your Cart
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <ShoppingCart size={40} className="text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="font-medium">Your cart is empty.</p>
                  <Button variant="outline" onClick={() => setIsCartOpen(false)}>Start Shopping</Button>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-3 p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <img src={item.imageURL} alt={item.name} className="w-20 h-20 object-cover rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700" />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-sm line-clamp-1 text-gray-900 dark:text-gray-100">{item.name}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.category}</p>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">{currency}{item.price}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-slate-900 rounded text-gray-600 dark:text-gray-300 font-medium">Qty: {item.quantity}</span>
                          <button onClick={() => removeFromCart(item.id)} className="text-red-400 dark:text-red-500 text-xs font-medium hover:text-red-600 dark:hover:text-red-400 transition-colors">Remove</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 border-t dark:border-slate-800 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-gray-100">
                <span>Total</span>
                <span>{currency}{total.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={handleViewCart}>
                  View Cart
                </Button>
                <Button className="shadow-lg shadow-blue-200" onClick={handleCheckout} disabled={cart.length === 0}>
                  Checkout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 w-full max-w-7xl animate-in fade-in duration-300">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 py-12 text-gray-500 dark:text-gray-400 text-sm transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Logo" className="w-6 h-6 rounded-md" />
                {APP_NAME}
              </Link>
              <p className="max-w-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                Your one-stop destination for premium products from top global branches. Quality and satisfaction guaranteed with every order.
              </p>
              <div className="flex gap-4">
                {socialLinks.length > 0 ? (
                  socialLinks.map(link => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-colors capitalize"
                      title={link.platform}
                    >
                      {link.platform.toLowerCase() === 'facebook' && <Facebook size={18} />}
                      {link.platform.toLowerCase() === 'twitter' && <Twitter size={18} />}
                      {link.platform.toLowerCase() === 'instagram' && <Instagram size={18} />}
                      {link.platform.toLowerCase() === 'linkedin' && <Linkedin size={18} />}
                      {!['facebook', 'twitter', 'instagram', 'linkedin'].includes(link.platform.toLowerCase()) && <LinkIcon size={18} />}
                    </a>
                  ))
                ) : (
                  <>
                    <a href="#" className="p-2 bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-colors"><Facebook size={18} /></a>
                    <a href="#" className="p-2 bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-colors"><Twitter size={18} /></a>
                    <a href="#" className="p-2 bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-colors"><Instagram size={18} /></a>
                    <a href="#" className="p-2 bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/50 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full transition-colors"><Linkedin size={18} /></a>
                  </>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Marketplace</Link></li>
                {pages.filter(p => !['privacy', 'terms'].includes(p.id)).map(page => (
                  <li key={page.id}><Link to={`/page/${page.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{page.title}</Link></li>
                ))}
                <li><Link to="/auth" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Login / Register</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Support</h4>
              <ul className="space-y-2">
                <li><Link to="/about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact Support</Link></li>
                {pages.filter(p => ['privacy', 'terms'].includes(p.id)).map(page => (
                  <li key={page.id}><Link to={`/page/${page.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{page.title}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-100 dark:border-slate-800 text-center flex flex-col items-center">
            <p className="mb-4">&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link to="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Privacy</Link>
              <Link to="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Terms</Link>
              <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
