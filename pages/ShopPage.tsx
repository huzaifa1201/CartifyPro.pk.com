
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiGetProducts, apiGetUsers, apiInitChat, apiGetShopReviews, apiAddShopReview, apiGetProductsByBranch, apiGetUser, apiGetBranchBySlug } from '../services/api';
import { Product, User, UserRole, ShopReview } from '../types';
import { Card, Button, Badge, Input } from '../components/UI';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getCurrency } from '../constants';
import { ShoppingBag, ArrowLeft, Heart, Store, Star, Share2, MessageSquare, User as UserIcon, Sparkles, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const ShopPage: React.FC = () => {
    const { branchId } = useParams<{ branchId: string }>();
    const [products, setProducts] = useState<Product[]>([]);
    const [shopUser, setShopUser] = useState<User | null>(null);
    const [shopReviews, setShopReviews] = useState<ShopReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'products' | 'reviews'>('products');

    // Shop Review Form
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const currency = getCurrency(shopUser?.branchCountry || shopUser?.country);

    const { addToCart } = useCart();
    const { addToWishlist, isInWishlist } = useWishlist();
    const { addToast } = useToast();
    const { user, isSuperAdmin } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const load = async (isSilent = false) => {
            if (!isSilent) setLoading(true);
            try {
                // Optimized Data Fetching
                // 1. Resolve Branch ID (Handle Slugs)
                let resolvedBranchId = branchId;
                if (branchId && !branchId.startsWith('branch-')) {
                    const slugBranch = await apiGetBranchBySlug(branchId);
                    if (!slugBranch) {
                        setProducts([]);
                        setShopUser(null);
                        setLoading(false);
                        return; // Not found
                    }
                    resolvedBranchId = slugBranch.id;
                }

                if (!resolvedBranchId) return;

                const uid = resolvedBranchId.replace('branch-', '') || '';

                // Parallel fetch: Shop Owner (User) & Products
                const [shopProducts, shopOwner] = await Promise.all([
                    resolvedBranchId ? apiGetProductsByBranch(resolvedBranchId, 100) : Promise.resolve([]),
                    uid ? apiGetUser(uid) : Promise.resolve(null)
                ]);

                // Update products to use resolved ID
                setProducts(shopProducts);

                const adminUser = shopOwner; // direct assignment

                if (adminUser && user && !isSuperAdmin && user.country) {
                    const shopCountry = (adminUser.branchCountry || adminUser.country || '').toLowerCase().trim();
                    const userCountry = user.country.toLowerCase().trim();
                    if (shopCountry !== userCountry) {
                        addToast("This shop is not available in your region.", "error");
                        navigate('/');
                        return;
                    }
                }

                setShopUser(adminUser || null);

                if (branchId) {
                    const reviews = await apiGetShopReviews(branchId);
                    setShopReviews(reviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                }

            } catch (e) {
                console.error("Error loading shop details", e);
            } finally {
                if (!isSilent) setLoading(false);
            }
        };

        if (branchId) {
            load(false);
            const interval = setInterval(() => load(true), 30000); // 30s refresh silent
            return () => clearInterval(interval);
        }
    }, [branchId, user?.country, isSuperAdmin, navigate, addToast, user]);

    const handleShare = async () => {
        const url = window.location.href;
        try {
            await navigator.clipboard.writeText(url);
            addToast("Shop link copied!", 'success');
        } catch (e) {
            addToast("Failed to copy", 'error');
        }
    }

    const handleChat = async () => {
        if (!user) {
            navigate('/auth'); return;
        }
        if (!branchId || !shopUser) return;
        try {
            await apiInitChat(user.uid, branchId, user.name, shopUser.name);
            navigate('/dashboard/user');
        } catch (e) {
            addToast("Failed to start chat", 'error');
        }
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !branchId || !shopUser) return;
        setReviewSubmitting(true);
        try {
            const newReview = await apiAddShopReview({
                branchID: branchId,
                userID: user.uid,
                userName: user.name,
                rating,
                comment
            });
            setShopReviews(prev => [newReview, ...prev]);
            setComment('');
            setRating(5);
            // Optimistically update rating display
            const newCount = (shopUser.reviewCount || 0) + 1;
            const newAvg = (((shopUser.rating || 0) * (shopUser.reviewCount || 0)) + rating) / newCount;
            setShopUser({ ...shopUser, rating: newAvg, reviewCount: newCount });

            addToast("Review submitted!", 'success');
        } catch (e) {
            addToast("Failed to submit review", 'error');
        } finally {
            setReviewSubmitting(false);
        }
    };

    if (loading) return <div className="h-[50vh] flex items-center justify-center">Loading shop...</div>;

    const shopName = shopUser?.name || 'Unknown Shop';
    const shopRating = shopUser?.rating ? shopUser.rating.toFixed(1) : 'New';
    const isSuspended = shopUser?.suspensionUntil && shopUser.suspensionUntil > Date.now();

    if (isSuspended) {
        return (
            <div className="max-w-4xl mx-auto py-20 px-4 text-center animate-in fade-in scale-in-95">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 mb-8 border-4 border-white dark:border-slate-900 shadow-xl">
                    <ShoppingBag size={48} className="opacity-50" />
                    <div className="absolute">
                        <X size={32} className="text-red-600 -rotate-12" />
                    </div>
                </div>
                <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 mb-4 tracking-tight">Shop Temporarily Closed</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                    We're sorry, but <strong>{shopName}</strong> is currently not accepting new orders. Please check back later.
                </p>
                <Card className="p-8 bg-gray-50/50 dark:bg-slate-900/50 border-gray-100 dark:border-slate-800 max-w-md mx-auto">
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-2">Message from Platform</p>
                    <p className="text-gray-700 dark:text-gray-300 italic leading-snug">
                        {shopUser?.suspensionReason || "This shop has been temporarily restricted by the administration for maintenance or policy review."}
                    </p>
                </Card>
                <div className="mt-12">
                    <Button onClick={() => navigate('/')} variant="secondary">Browse Other Shops</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* Header */}
            <div className="relative rounded-3xl p-8 md:p-12 shadow-xl overflow-hidden bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
                {shopUser?.bannerURL && (
                    <img src={shopUser.bannerURL} className="absolute inset-0 w-full h-full object-cover opacity-40" />
                )}
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-blue-900 font-bold text-4xl shadow-lg overflow-hidden border-4 border-white">
                        {shopUser?.logoURL ? <img src={shopUser.logoURL} className="w-full h-full object-cover" /> : shopName.charAt(0)}
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-3xl font-bold mb-2">{shopName}</h1>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center">
                            <div className="flex items-center bg-yellow-400 text-black px-2 py-0.5 rounded text-sm font-bold">
                                <Star size={14} fill="black" className="mr-1" /> {shopRating}
                            </div>
                            <span className="text-sm opacity-90">{shopUser?.reviewCount || 0} Ratings</span>
                            <div className="h-4 w-px bg-white/30"></div>
                            <button onClick={handleShare} className="flex items-center gap-1 text-sm hover:underline"><Share2 size={14} /> Share</button>
                        </div>
                        {user?.role !== UserRole.BRANCH_ADMIN && (
                            <button onClick={handleChat} className="mt-4 bg-white text-blue-900 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 mx-auto md:mx-0 hover:bg-gray-100 transition-colors">
                                <MessageSquare size={16} /> Chat with Seller
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'products' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    Products ({products.length})
                </button>
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'reviews' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                    Reviews ({shopReviews.length})
                </button>
            </div>

            {/* Content */}
            {activeTab === 'products' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map(product => (
                        <Card key={product.id} className="group !p-0 overflow-hidden hover:shadow-lg transition-all border dark:border-slate-700">
                            <Link to={`/product/${product.id}`} className="block h-48 bg-gray-50 dark:bg-slate-800 overflow-hidden relative">
                                <img src={product.imageURL} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform" />
                                <div className="absolute top-2 left-2 flex gap-1">
                                    {product.isNewArrival && <Badge className="bg-purple-600 text-white shadow-sm flex items-center gap-1"><Sparkles size={10} /> New</Badge>}
                                    {product.salePrice && <Badge className="bg-red-600 text-white shadow-sm">Sale</Badge>}
                                </div>
                            </Link>
                            <div className="p-4">
                                <Link to={`/product/${product.id}`}><h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{product.name}</h3></Link>

                                <div className="flex items-center gap-1 mt-1 mb-2">
                                    <div className="flex text-yellow-400 text-xs mb-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={12} fill={i < (product.rating || 0) ? "currentColor" : "none"} className={i < (product.rating || 0) ? "" : "text-gray-300 dark:text-slate-700"} />
                                        ))}
                                    </div>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">({product.reviewCount || 0})</span>
                                </div>

                                <div className="flex justify-between items-center mt-2">
                                    {product.salePrice ? (
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400 line-through">{currency}{product.price}</span>
                                            <span className="font-bold text-red-600 dark:text-red-400">{currency}{product.salePrice}</span>
                                        </div>
                                    ) : (
                                        <span className="font-bold text-gray-900 dark:text-gray-100">{currency}{product.price}</span>
                                    )}
                                    <Button size="sm" onClick={() => addToCart(product)} disabled={product.stock === 0}><ShoppingBag size={14} /></Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                    {products.length === 0 && <div className="col-span-full text-center py-20 text-gray-400">No products found.</div>}
                </div>
            ) : (
                <div className="max-w-2xl mx-auto space-y-8">
                    {/* Review Form */}
                    {user && user.uid !== shopUser?.uid && (
                        <Card className="p-6 bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-800">
                            <h4 className="font-bold mb-4 text-gray-900 dark:text-gray-100">Rate this Shop</h4>
                            <form onSubmit={handleSubmitReview} className="space-y-4">
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <button type="button" key={s} onClick={() => setRating(s)} className={`text-2xl ${rating >= s ? 'text-yellow-400' : 'text-gray-300 dark:text-slate-600'}`}>
                                            <Star fill="currentColor" />
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    className="w-full border border-gray-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                    rows={3}
                                    placeholder="Share your experience..."
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    required
                                />
                                <div className="flex justify-end"><Button type="submit" isLoading={reviewSubmitting}>Post Review</Button></div>
                            </form>
                        </Card>
                    )}

                    {/* Reviews List */}
                    <div className="space-y-6">
                        {shopReviews.map(review => (
                            <Card key={review.id} className="p-6">
                                <div className="flex justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                                            {review.userName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-900 dark:text-gray-100">{review.userName}</p>
                                            <div className="flex text-yellow-400 text-xs">
                                                {[...Array(5)].map((_, i) => <Star key={i} size={10} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-300 dark:text-slate-600"} />)}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(review.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{review.comment}</p>
                            </Card>
                        ))}
                        {shopReviews.length === 0 && <p className="text-center text-gray-400">No reviews yet.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};
