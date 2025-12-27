
import React, { useEffect, useState } from 'react';
import { Card, Button, Badge } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { apiGetShopReviews, apiGetProductsByBranch, apiGetReviews } from '../services/api';
import { ShopReview, Product, Review } from '../types';
import { Star, MessageSquare, TrendingUp, ShoppingBag, Store, Info } from 'lucide-react';

export const BranchReviewsPage: React.FC = () => {
    const { user, isBranchAdmin } = useAuth();
    const [shopReviews, setShopReviews] = useState<ShopReview[]>([]);
    const [productReviews, setProductReviews] = useState<{ product: Product, reviews: Review[] }[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'shop' | 'products'>('shop');

    useEffect(() => {
        const load = async () => {
            if (!user?.branchID) return;
            setLoading(true);
            try {
                // 1. Fetch Shop Reviews
                const sReviews = await apiGetShopReviews(user.branchID);
                setShopReviews(sReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

                // 2. Fetch Top Products & Their Reviews
                // Since we don't have a direct "get all branch product reviews" endpoint yet that is efficient,
                // we will fetch the branch products and then fetch reviews for valid ones.
                const products = await apiGetProductsByBranch(user.branchID, 20); // Limit to 20 for performance

                const prodReviewPromises = products.map(async (p) => {
                    const revs = await apiGetReviews(p.id);
                    return { product: p, reviews: revs };
                });

                const prodsWithReviews = await Promise.all(prodReviewPromises);
                // Filter out products with no reviews
                setProductReviews(prodsWithReviews.filter(item => item.reviews.length > 0));

            } catch (e) {
                console.error("Failed to load reviews", e);
            } finally {
                setLoading(false);
            }
        };

        if (isBranchAdmin) load();
    }, [user, isBranchAdmin]);

    if (!isBranchAdmin) return <div className="p-8 text-center text-red-500">Access Restricted</div>;
    if (loading) return <div className="p-8 text-center text-gray-500">Loading reviews...</div>;

    const shopRating = user?.rating ? user.rating.toFixed(1) : 'N/A';
    const shopReviewCount = user?.reviewCount || 0;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <MessageSquare className="text-blue-600" /> Reviews & Ratings
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage and view feedback for your shop and products.</p>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-none shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-white/20 rounded-xl"><Store size={24} /></div>
                        <span className="text-xs font-bold uppercase tracking-wider opacity-80">Shop Rating</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <h2 className="text-4xl font-black">{shopRating}</h2>
                        <div className="mb-2 flex text-yellow-300">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={16} fill={i < Math.round(Number(shopRating)) ? "currentColor" : "none"} className={i < Math.round(Number(shopRating)) ? "" : "opacity-30"} />
                            ))}
                        </div>
                    </div>
                    <p className="mt-2 text-sm opacity-90">{shopReviewCount} total reviews</p>
                </Card>

                <Card className="p-6 bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl"><ShoppingBag size={24} /></div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Product Quality</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <h2 className="text-4xl font-black text-gray-900 dark:text-gray-100">
                            {productReviews.length > 0
                                ? (productReviews.reduce((acc, curr) => acc + (curr.product.rating || 0), 0) / productReviews.length).toFixed(1)
                                : 'N/A'}
                        </h2>
                        <span className="text-sm text-gray-400 mb-2">avg rating</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Based on {productReviews.length} active products</p>
                </Card>

                <Card className="p-6 bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl"><TrendingUp size={24} /></div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ranking</span>
                    </div>
                    <div className="flex items-end gap-2">
                        <h2 className="text-4xl font-black text-gray-900 dark:text-gray-100">Top 10%</h2> {/* Placeholder logic or fetch real ranking if needed */}
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Your shop is performing well!</p>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex border-b dark:border-slate-700 space-x-6">
                <button
                    onClick={() => setActiveTab('shop')}
                    className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'shop' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    Shop Reviews
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'products' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    Product Reviews
                </button>
            </div>

            {/* Content */}
            {activeTab === 'shop' ? (
                <div className="space-y-4">
                    {shopReviews.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 bg-gray-50 dark:bg-slate-900 rounded-xl">No shop reviews yet.</div>
                    ) : (
                        shopReviews.map(review => (
                            <Card key={review.id} className="p-6 hover:shadow-md transition-shadow dark:bg-slate-900/50">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                                            {review.userName.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-gray-100">{review.userName}</h4>
                                            <div className="flex text-yellow-400 text-xs">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-300 dark:text-slate-700"} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400">{new Date(review.date).toLocaleDateString()}</span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 pl-12">{review.comment}</p>
                            </Card>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {productReviews.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 bg-gray-50 dark:bg-slate-900 rounded-xl">No product reviews yet.</div>
                    ) : (
                        productReviews.map(({ product, reviews }) => (
                            <div key={product.id} className="space-y-3">
                                <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border dark:border-slate-800">
                                    <img src={product.imageURL} alt={product.name} className="w-12 h-12 rounded-lg object-cover bg-white" />
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100">{product.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="flex items-center gap-1 text-yellow-500 font-bold"><Star size={10} fill="currentColor" /> {product.rating?.toFixed(1) || 0}</span>
                                            <span>• {reviews.length} reviews</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pl-6 space-y-3 border-l-2 border-gray-100 dark:border-slate-800 ml-6">
                                    {reviews.map(review => (
                                        <Card key={review.id} className="p-4 bg-white dark:bg-slate-900">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm">{review.userName}</span>
                                                    <div className="flex text-yellow-400 text-[10px]">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} size={10} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-300 dark:text-slate-700"} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-gray-400">{new Date(review.date).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{review.comment}</p>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
