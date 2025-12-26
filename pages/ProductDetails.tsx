
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiGetProducts, apiGetReviews, apiAddReview, apiGetProductsByCategory, apiGetBranches } from '../services/api';
import { Product, Review, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { Button, Badge, Card } from '../components/UI';
import { getCurrency } from '../constants';
import { ShoppingCart, ArrowLeft, Star, Shield, Share2, Heart, CheckCircle, MessageSquare, Sparkles } from 'lucide-react';

export const ProductDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState(1);

    const { addToCart } = useCart();
    const { user, isSuperAdmin } = useAuth();
    const { addToWishlist, isInWishlist } = useWishlist();
    const { addToast } = useToast();

    // Variant State
    const [selectedColor, setSelectedColor] = useState<string>('');
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [activeVariant, setActiveVariant] = useState<ProductVariant | undefined>(undefined);
    const [branchCountry, setBranchCountry] = useState<string>('');
    const currency = getCurrency(branchCountry || user?.country);

    // Review Form
    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [allProducts, allBranches] = await Promise.all([
                    apiGetProducts(),
                    apiGetBranches(user?.country || '', isSuperAdmin)
                ]);

                const found = allProducts.find(p => p.id === id);

                // STRICT FILTERING: Check if product belongs to an approved branch in user's country
                if (found && !isSuperAdmin) {
                    const isBranchValid = allBranches.some(b => b.id === found.branchID && b.status === 'approved');
                    if (!isBranchValid) {
                        addToast("This product is not available in your region.", 'error');
                        navigate('/');
                        return;
                    }
                }

                setProduct(found || null);

                // Initialize variant state if variants exist
                if (found && found.variants && found.variants.length > 0) {
                    const first = found.variants[0];
                    setSelectedColor(first.color);
                    setSelectedSize(first.size);
                    setActiveVariant(first);
                }

                if (found) {
                    setProduct(found);
                    const branch = allBranches.find(b => b.id === found.branchID);
                    if (branch) setBranchCountry(branch.country);
                    const fetchedReviews = await apiGetReviews(found.id);
                    setReviews(fetchedReviews);
                    // Filter related products by same branch list to ensure region match
                    const validBranchIds = new Set(allBranches.map(b => b.id));
                    const rel = allProducts.filter(p => p.category === found.category && p.id !== id && validBranchIds.has(p.branchID)).slice(0, 4);
                    setRelatedProducts(rel);
                }
            } catch (error) {
                console.error("Error loading product details", error);
            } finally {
                setLoading(false);
            }
        };
        load();
        window.scrollTo(0, 0);
    }, [id, user, isSuperAdmin, navigate, addToast]);

    // Update active variant when selections change
    useEffect(() => {
        if (product?.variants) {
            const variant = product.variants.find(v => v.color === selectedColor && v.size === selectedSize);
            setActiveVariant(variant);
        }
    }, [selectedColor, selectedSize, product]);

    const handleAddToCart = () => {
        if (product) {
            if (product.variants && product.variants.length > 0 && !activeVariant) {
                addToast("Please select a valid color and size", 'error');
                return;
            }

            for (let i = 0; i < qty; i++) {
                addToCart(product, activeVariant);
            }
            addToast(`Added ${qty} ${product.name} to cart`, 'success');
        }
    }

    // Calculate distinct colors and sizes for UI
    const uniqueColors = Array.from(new Set(product?.variants?.map(v => v.color) || []));
    const uniqueSizes = Array.from(new Set(product?.variants?.map(v => v.size) || []));

    // Determine displayed info
    const displayPrice = activeVariant ? activeVariant.price : product?.price;
    const displaySalePrice = !activeVariant && product?.salePrice ? product.salePrice : undefined; // Variant overrides sale price currently (simplified)
    const displayImage = activeVariant && activeVariant.imageURL ? activeVariant.imageURL : product?.imageURL;
    const displayStock = activeVariant ? activeVariant.stock : product?.stock;
    const displayDescription = activeVariant && activeVariant.description ? activeVariant.description : product?.description;

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !product) return;
        setReviewSubmitting(true);
        try {
            const newReview = await apiAddReview({
                productID: product.id,
                userID: user.uid,
                userName: user.name,
                rating,
                comment
            });
            setReviews(prev => [...prev, newReview]);
            setComment('');
            setRating(5);
            addToast("Review submitted successfully", 'success');
        } catch (e) {
            addToast("Failed to submit review", 'error');
        } finally {
            setReviewSubmitting(false);
        }
    }

    const sortedReviews = [...reviews].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const averageRating = reviews.length > 0 ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) : 'New';

    if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
    if (!product) return <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-gray-500"><p>Product not found</p><Link to="/"><Button>Go Home</Button></Link></div>;

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-12">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 overflow-x-auto whitespace-nowrap pb-2 font-medium">
                <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
                <span>/</span>
                <Link to="/" className="hover:text-blue-600 transition-colors">{product.category}</Link>
                <span>/</span>
                <span className="text-gray-900 dark:text-gray-100 font-bold truncate">{product.name}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Image */}
                <div className="bg-gray-50 dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm aspect-square relative group">
                    <img src={displayImage} alt={product.name} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {product.isNewArrival && <Badge className="bg-purple-600 text-white shadow-md flex items-center gap-1 w-fit"><Sparkles size={12} /> New Arrival</Badge>}
                        {displaySalePrice && <Badge className="bg-red-600 text-white shadow-md w-fit">Sale</Badge>}
                    </div>
                    <div className="absolute top-4 right-4 space-y-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
                        <button onClick={() => addToWishlist(product.id)} className={`p-3 rounded-full shadow-lg transition-colors ${isInWishlist(product.id) ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500'}`}>
                            <Heart size={20} fill={isInWishlist(product.id) ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>

                {/* Details */}
                <div className="flex flex-col h-full">
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                            <Badge color="blue" className="text-sm px-3 py-1">{product.category}</Badge>
                            <div className="flex items-center gap-1 text-yellow-500 text-sm font-bold">
                                <Star fill="currentColor" size={16} /> {averageRating} <span className="text-gray-400 font-normal ml-1">({reviews.length} reviews)</span>
                            </div>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-6 tracking-tight leading-tight">{product.name}</h1>

                        {/* Variants Selection */}
                        {uniqueColors.length > 0 && (
                            <div className="mb-6 space-y-4">
                                <div>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select Color</p>
                                    <div className="flex flex-wrap gap-2">
                                        {uniqueColors.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setSelectedColor(color)}
                                                className={`px-4 py-2 border rounded-full text-sm font-medium transition-all ${selectedColor === color ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:bg-slate-800'}`}
                                            >
                                                {color}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select Size</p>
                                    <div className="flex flex-wrap gap-2">
                                        {uniqueSizes.map(size => (
                                            <button
                                                key={size}
                                                onClick={() => setSelectedSize(size)}
                                                className={`w-10 h-10 border rounded-lg text-sm font-medium flex items-center justify-center transition-all ${selectedSize === size ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:bg-slate-800'}`}
                                            >
                                                {size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">{displayDescription}</p>
                    </div>

                    <div className="border-t border-b border-gray-100 py-8 space-y-6 mt-8">
                        <div className="flex flex-wrap items-end gap-4 justify-between">
                            <div className="flex items-end gap-3">
                                {displaySalePrice ? (
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-4xl md:text-5xl font-bold text-red-600 tracking-tight">{currency}{displaySalePrice}</span>
                                        <span className="text-xl text-gray-400 line-through">{currency}{displayPrice}</span>
                                    </div>
                                ) : (
                                    <span className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{currency}{displayPrice}</span>
                                )}
                            </div>
                            <div className={`text-sm font-bold px-3 py-1 rounded-full ${!displayStock ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30' :
                                displayStock < 10 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30' :
                                    'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30'
                                }`}>
                                {(!displayStock || displayStock === 0) ? 'Out of Stock' :
                                    displayStock < 10 ? `Low Stock: ${displayStock} left` :
                                        `In Stock: ${displayStock} units`}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex items-center border border-gray-300 dark:border-slate-700 rounded-2xl bg-gray-50 dark:bg-slate-900 shadow-inner group overflow-hidden">
                                <button className="px-5 py-4 hover:bg-gray-100 dark:hover:bg-slate-800 text-xl text-gray-600 dark:text-gray-400 transition-colors font-bold" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                                <span className="px-4 font-black text-xl min-w-[3ch] text-center text-gray-900 dark:text-gray-100">{qty}</span>
                                <button className="px-5 py-4 hover:bg-gray-100 dark:hover:bg-slate-800 text-xl text-gray-600 dark:text-gray-400 transition-colors font-bold" onClick={() => setQty(Math.min(displayStock || 0, qty + 1))}>+</button>
                            </div>
                            <Button
                                className="flex-1 text-xl py-5 !rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.98] transition-all font-black"
                                onClick={handleAddToCart}
                                disabled={!displayStock || displayStock === 0 || (product.variants && product.variants.length > 0 && !activeVariant)}
                            >
                                <ShoppingCart className="mr-3" size={24} />
                                {(!displayStock || displayStock === 0) ? 'OUT OF STOCK' : 'ADD TO CART'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reviews and Description tabs... (Simplified for brevity, same as before) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 shadow-sm mt-12">
                <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Product Reviews</h3>
                {/* Add Review form ... */}
                {user ? (
                    <div className="bg-gray-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 mb-8">
                        <h4 className="font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">Write a Review</h4>
                        <form onSubmit={handleSubmitReview} className="space-y-4">
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button type="button" key={star} onClick={() => setRating(star)} className={`text-2xl ${rating >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-slate-700'}`}><Star fill="currentColor" /></button>
                                ))}
                            </div>
                            <textarea className="w-full border dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" rows={3} value={comment} onChange={e => setComment(e.target.value)} required placeholder="Share your thoughts..."></textarea>
                            <Button type="submit" isLoading={reviewSubmitting}>Submit Review</Button>
                        </form>
                    </div>
                ) : <p className="mb-8 text-gray-500 dark:text-gray-400">Please <Link to="/auth" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">log in</Link> to write a review.</p>}

                <div className="space-y-6">
                    {sortedReviews.map(review => (
                        <div key={review.id} className="border-b dark:border-slate-700 pb-6 last:border-0">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold">
                                    {review.userName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-gray-100 leading-none">{review.userName}</p>
                                    <div className="flex text-yellow-400 text-xs mt-1">
                                        {[...Array(5)].map((_, i) => <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-300 dark:text-slate-600"} />)}
                                    </div>
                                </div>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 text-sm">{review.comment}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
