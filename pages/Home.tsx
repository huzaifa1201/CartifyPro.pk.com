
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGetProducts, apiGetActiveAds, apiGetUsers, apiGetCategories, apiGetBranches } from '../services/api';
import { Product, Ad, User, UserRole, Category, Branch } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { Card, Button, Badge } from '../components/UI';
import { getCurrency } from '../constants';
import { Search, Filter, ShoppingBag, ArrowRight, ArrowLeft, Star, Truck, ShieldCheck, RefreshCw, ChevronDown, Heart, Layers, Store, Users, Sparkles } from 'lucide-react';

export const HomePage: React.FC = () => {
    const { user, isSuperAdmin } = useAuth(); // Moved to top
    const [products, setProducts] = useState<Product[]>([]);
    // shops state removed - now using branches
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
    const [filteredShops, setFilteredShops] = useState<Branch[]>([]);
    const [ads, setAds] = useState<Ad[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const [searchMode, setSearchMode] = useState<'products' | 'shops'>('products');
    const [suggestions, setSuggestions] = useState<Product[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const { addToCart } = useCart();
    const { addToWishlist, isInWishlist } = useWishlist();
    const navigate = useNavigate();

    const [sortBy, setSortBy] = useState('featured');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const [branches, setBranches] = useState<Branch[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                // Optimized Load: Limit to 50 items and filter by country if logged in
                // If not logged in (user is null), we might show general/mixed, or empty. 
                // Passing undefined for country will use default limit 50 and no filter.

                const [prodData, adData, catData] = await Promise.all([
                    apiGetProducts(50, user?.country),
                    apiGetActiveAds(),
                    apiGetCategories()
                ]);
                setProducts(prodData);
                setAds(adData);
                setCategories(catData);
            } catch (e) {
                console.error(e);
            }
        };
        load();
    }, [user?.country]); // Reload when country changes



    // Fetch branches when User State changes
    useEffect(() => {
        const fetchBranches = async () => {
            if (user && user.country) {
                const br = await apiGetBranches(user.country, isSuperAdmin);
                setBranches(br);
            } else if (isSuperAdmin) {
                const br = await apiGetBranches('', true);
                setBranches(br);
            } else {
                // Guest or no country selected: Show nothing or everything? 
                // Requirement: "Users select country... Save it... Filter logic: When a user visits app, show..."
                // Implies logged in. If guest, maybe empty? Or default?
                // Let's assume empty until login/select.
                setBranches([]);
            }
        }
        fetchBranches();
    }, [user, isSuperAdmin]);

    useEffect(() => {
        // --- Country Filtering Base ---
        let availableShops = [...branches];
        let availableProducts: Product[] = [];

        // STRICT FILTERING:
        // - Super Admin sees all
        // - Logged in user with country: sees only their country's shops/products
        // - Guest or user without country: sees nothing

        if (isSuperAdmin) {
            // Super Admin sees all products
            availableProducts = [...products];
        } else if (user && user.country) {
            // Regular user with country - filter products by valid branch IDs
            const userCountryNormalized = user.country.toLowerCase().trim();
            const validBranchIds = new Set(availableShops
                .filter(s => (s.country || '').toLowerCase().trim() === userCountryNormalized)
                .map(s => s.id)
            );
            availableProducts = products.filter(p => validBranchIds.has(p.branchID));
        } else {
            // Guest or no country - show nothing
            availableShops = [];
            availableProducts = [];
        }

        // --- Product Filtering ---
        let prodResult = availableProducts;

        if (searchTerm && searchMode === 'products') {
            const lower = searchTerm.toLowerCase();
            prodResult = prodResult.filter(p =>
                p.name.toLowerCase().includes(lower) ||
                p.category.toLowerCase().includes(lower) ||
                p.description.toLowerCase().includes(lower)
            );
        }

        if (selectedCategory !== 'All') {
            prodResult = prodResult.filter(p => p.category === selectedCategory);
        }

        switch (sortBy) {
            case 'price-asc': prodResult.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price)); break;
            case 'price-desc': prodResult.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price)); break;
            case 'name-asc': prodResult.sort((a, b) => a.name.localeCompare(b.name)); break;
            default: break;
        }

        setFilteredProducts(prodResult);

        // --- Shop Filtering ---
        let shopResult = availableShops;

        if (searchTerm && searchMode === 'shops') {
            const lower = searchTerm.toLowerCase();
            shopResult = shopResult.filter(s =>
                s.name.toLowerCase().includes(lower) ||
                (s.shopCategory && s.shopCategory.toLowerCase().includes(lower))
            );
        }

        if (selectedCategory !== 'All') {
            shopResult = shopResult.filter(s => {
                const profileMatch = s.shopCategory === selectedCategory;
                const productMatch = products.some(p => p.branchID === s.id && p.category === selectedCategory);
                return profileMatch || productMatch;
            });
        }

        // Sort shops by rating descending by default
        shopResult.sort((a, b) => (b.rating || 0) - (a.rating || 0));

        setFilteredShops(shopResult);

    }, [searchTerm, selectedCategory, sortBy, products, branches, searchMode, user, isSuperAdmin]);
    const getProductCurrency = (branchID: string) => {
        const branch = branches.find(b => b.id === branchID);
        return getCurrency(branch?.country || user?.country);
    };
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (value.trim().length > 0 && searchMode === 'products') {
            const matches = products.filter(p => p.name.toLowerCase().includes(value.toLowerCase())).slice(0, 5);
            setSuggestions(matches);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (name: string) => {
        setSearchTerm(name);
        setShowSuggestions(false);
    };

    const uniqueCategories = ['All', ...Array.from(new Set([
        ...products.map(p => p.category),
        ...branches.filter(s => s.shopCategory).map(s => s.shopCategory!)
    ])).sort()];

    // For visual infinite scroll
    const slidingCategories = categories.length > 0 ? [...categories, ...categories] : [];

    const handleCategoryClick = (categoryName: string) => {
        navigate(`/category/${categoryName}`);
    };

    const handleAdClick = (url?: string) => {
        if (!url) return;
        if (url.startsWith('http')) window.open(url, '_blank');
        else navigate(url);
    }

    return (
        <div className="space-y-12 overflow-hidden">
            {/* Hero Banner */}
            <div className="relative h-[400px] md:h-[500px] rounded-3xl overflow-hidden shadow-2xl group mx-4 md:mx-0">
                <img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=2000&q=80" alt="Banner" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/40 to-transparent flex items-center px-6 md:px-20">
                    <div className="text-white space-y-4 md:space-y-6 max-w-xl animate-in slide-in-from-left duration-700">
                        <Badge color="blue" className="!bg-blue-600 !text-white px-3 md:px-4 py-1 text-xs md:text-sm">New Collection 2024</Badge>
                        <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">Elevate Your <br /> Lifestyle</h1>
                        <Button size="lg" className="!bg-white !text-gray-900 hover:!bg-gray-100 font-bold border-none shadow-xl" onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })}>Shop Now</Button>
                    </div>
                </div>
            </div>

            {/* --- ADS SECTION (Restored) --- */}
            {ads.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    {ads.map(ad => (
                        <div key={ad.id} onClick={() => handleAdClick(ad.linkURL)} className="cursor-pointer group relative overflow-hidden rounded-xl h-48 shadow-md">
                            <img src={ad.imageURL} alt={ad.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                                <div>
                                    <h3 className="text-white font-bold text-lg mb-1">{ad.title}</h3>
                                    <span className="text-blue-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                        View Offer <ArrowRight size={12} />
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- CATEGORIES SLIDER (Restored) --- */}
            <div className="space-y-4">
                <div className="flex justify-between items-center px-4 md:px-0">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Explore Categories</h2>
                    <div className="flex gap-2">
                        <button className="p-2 rounded-full border dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"><ArrowLeft size={16} /></button>
                        <button className="p-2 rounded-full border dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"><ArrowRight size={16} /></button>
                    </div>
                </div>

                <div className="relative overflow-hidden group">
                    <div className="flex gap-6 animate-scroll hover:pause px-4 pb-4">
                        {slidingCategories.map((cat, idx) => (
                            <div
                                key={`${cat.id}-${idx}`}
                                onClick={() => handleCategoryClick(cat.name)}
                                className="flex-shrink-0 flex flex-col items-center gap-3 group/cat cursor-pointer min-w-[100px]"
                            >
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-transparent group-hover/cat:border-blue-600 transition-all shadow-sm group-hover/cat:shadow-md">
                                    <img src={cat.imageURL} alt={cat.name} className="w-full h-full object-cover group-hover/cat:scale-110 transition-transform duration-500" />
                                </div>
                                <span className="font-medium text-sm text-gray-700 dark:text-gray-300 group-hover/cat:text-blue-600 transition-colors">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                    <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-gray-50 dark:from-[#0f172a] to-transparent pointer-events-none"></div>
                    <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-gray-50 dark:from-[#0f172a] to-transparent pointer-events-none"></div>
                </div>
            </div>

            {/* Search & Listing */}
            <div className="space-y-6 md:space-y-8" id="shop-section">
                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 md:gap-6 bg-slate-50/50 dark:bg-slate-900/50 p-4 md:p-6 rounded-3xl border border-gray-100 dark:border-slate-800">
                    <div className="flex items-center justify-center sm:justify-start gap-2 bg-white dark:bg-slate-800 p-1 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setSearchMode('products')}
                            className={`whitespace-nowrap px-4 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${searchMode === 'products' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        >
                            Products
                        </button>
                        <button
                            onClick={() => setSearchMode('shops')}
                            className={`whitespace-nowrap px-4 md:px-6 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${searchMode === 'shops' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        >
                            Shops
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full lg:w-auto flex-1 max-w-3xl">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder={searchMode === 'products' ? "Search products..." : "Search shops..."}
                                className="w-full pl-11 pr-4 py-2.5 md:py-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all text-sm"
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                        </div>
                        <div className="relative sm:w-48 lg:w-56">
                            <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            <select
                                className="w-full pl-11 pr-10 py-2.5 md:py-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm appearance-none cursor-pointer transition-all text-sm"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="All">All Categories</option>
                                {uniqueCategories.map(cat => cat !== 'All' && <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* --- PRODUCTS GRID --- */}
                {searchMode === 'products' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {filteredProducts.map(product => (
                            <Card key={product.id} className="group !p-0 overflow-hidden hover:shadow-xl transition-all border-none ring-1 ring-gray-100 dark:ring-slate-700">
                                <Link to={`/product/${product.id}`} className="block h-64 bg-gray-50 dark:bg-slate-800 overflow-hidden relative">
                                    <img src={product.imageURL} className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" alt={product.name} />
                                    <div className="absolute top-3 left-3 flex gap-1">
                                        <Badge className="bg-white/90 text-gray-800 backdrop-blur-sm shadow-sm">{product.category}</Badge>
                                        {product.isNewArrival && (
                                            <Badge className="bg-purple-600 text-white shadow-sm flex items-center gap-1"><Sparkles size={10} /> New</Badge>
                                        )}
                                        {product.salePrice && (
                                            <Badge className="bg-red-600 text-white shadow-sm">Sale</Badge>
                                        )}
                                    </div>
                                </Link>
                                <div className="p-5">
                                    <Link to={`/product/${product.id}`}><h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 truncate">{product.name}</h3></Link>

                                    <div className="flex items-center gap-1 mb-3">
                                        <div className="flex text-yellow-400 text-xs">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={12} fill={i < (product.rating || 0) ? "currentColor" : "none"} className={i < (product.rating || 0) ? "" : "text-gray-300 dark:text-slate-600"} />
                                            ))}
                                        </div>
                                        <span className="text-xs text-gray-400">({product.reviewCount || 0})</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            {product.salePrice ? (
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-400 line-through">{getProductCurrency(product.branchID)}{product.price}</span>
                                                    <span className="text-xl font-bold text-red-600">{getProductCurrency(product.branchID)}{product.salePrice}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{getProductCurrency(product.branchID)}{product.price}</span>
                                            )}
                                        </div>
                                        <Button onClick={() => addToCart(product)} className="rounded-full w-10 h-10 !p-0 flex items-center justify-center shadow-none border hover:bg-blue-600" disabled={product.stock === 0}><ShoppingBag size={18} /></Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* --- SHOPS GRID --- */}
                {searchMode === 'shops' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredShops.length === 0 && user?.country && (
                            <div className="col-span-full text-center py-20 bg-gray-50/50 dark:bg-slate-800/20 rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-800 animate-in fade-in zoom-in duration-500">
                                <Store size={64} className="mx-auto mb-6 text-gray-300 dark:text-gray-600" />
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No shops found</h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">We couldn't find any shops in {user.country} matching your search.</p>
                            </div>
                        )}
                        {filteredShops.map(shop => (
                            <Link key={shop.id} to={`/shop/${shop.id}`} className="group relative">
                                <Card className="h-full !p-0 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border-none ring-1 ring-gray-100 dark:ring-slate-800 bg-white dark:bg-slate-900 flex flex-col">
                                    <div className="relative h-32 w-full overflow-hidden bg-gray-100 dark:bg-slate-800">
                                        {shop.bannerURL ? (
                                            <img src={shop.bannerURL} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={shop.name} />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 opacity-80" />
                                        )}
                                        <div className="absolute -bottom-8 left-6">
                                            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center text-blue-600 font-black text-3xl overflow-hidden border-4 border-white dark:border-slate-800 transition-transform group-hover:rotate-3">
                                                {shop.logoURL ? (
                                                    <img src={shop.logoURL} className="w-full h-full object-cover" alt="Logo" />
                                                ) : (
                                                    shop.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-10 p-6 flex flex-col flex-1 justify-between">
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h3 className="font-black text-xl text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors truncate">{shop.name}</h3>
                                                <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                                                    <Star size={12} className="text-yellow-500" fill="currentColor" />
                                                    <span className="text-xs font-black text-yellow-700 dark:text-yellow-400">{shop.rating ? shop.rating.toFixed(1) : 'NEW'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mb-4">
                                                <Badge color="blue" className="!bg-blue-50 !text-blue-600 dark:!bg-blue-900/30 dark:!text-blue-400 border border-blue-100 dark:border-blue-800/50 uppercase text-[10px] font-bold tracking-widest">{shop.shopCategory || 'General Seller'}</Badge>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">• {shop.reviewCount || 0} Reviews</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between border-t dark:border-slate-800 pt-4 mt-2">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">View Products</span>
                                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                <ArrowRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
};
