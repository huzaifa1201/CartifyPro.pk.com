import React, { useEffect, useState } from 'react';
import { apiGetProducts } from '../services/api';
import { useWishlist } from '../context/WishlistContext';
import { Product } from '../types';
import { Card, Button } from '../components/UI';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { getCurrency } from '../constants';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { apiGetBranches } from '../services/api';
import { Branch } from '../types';

export const WishlistPage: React.FC = () => {
    const { wishlist, addToWishlist } = useWishlist();
    const { addToCart } = useCart();
    const [products, setProducts] = useState<Product[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const load = async () => {
            const [allProducts, allBranches] = await Promise.all([
                apiGetProducts(),
                apiGetBranches(user?.country || '')
            ]);
            setBranches(allBranches);
            // Filter products that are in the wishlist ID list
            const wishlisted = allProducts.filter(p => wishlist.includes(p.id));
            setProducts(wishlisted);
            setLoading(false);
        };
        load();
    }, [wishlist, user]);

    const getProductCurrency = (branchID: string) => {
        const branch = branches.find(b => b.id === branchID);
        return getCurrency(branch?.country || user?.country);
    };

    if (loading) return <div className="min-h-[50vh] flex items-center justify-center">Loading...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 min-h-[60vh]">
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <Heart className="fill-red-500 text-red-500" /> My Wishlist
            </h1>

            {products.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Heart className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                    <h2 className="text-xl font-bold text-gray-700">Your wishlist is empty</h2>
                    <p className="text-gray-500 mb-6">Save items you love to buy later.</p>
                    <Link to="/">
                        <Button>Start Shopping</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map(product => (
                        <Card key={product.id} className="group !p-0 overflow-hidden hover:shadow-lg transition-all duration-300 border-none ring-1 ring-gray-100 relative">
                            <button
                                onClick={() => addToWishlist(product.id)}
                                className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md text-red-500 hover:bg-gray-100 z-10"
                                title="Remove from wishlist"
                            >
                                <Trash2 size={16} />
                            </button>

                            <Link to={`/product/${product.id}`} className="block relative h-64 overflow-hidden bg-gray-100">
                                <img
                                    src={product.imageURL}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                {product.stock > 0 && product.stock < 10 && (
                                    <div className="absolute bottom-2 left-2 z-10">
                                        <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                            Only {product.stock} left
                                        </span>
                                    </div>
                                )}
                            </Link>
                            <div className="p-4">
                                <Link to={`/product/${product.id}`}>
                                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">{product.name}</h3>
                                </Link>
                                <p className="text-gray-500 text-xs mb-3">{product.category}</p>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-lg">{getProductCurrency(product.branchID)}{product.price}</span>
                                    <Button
                                        size="sm"
                                        onClick={() => addToCart(product)}
                                        disabled={product.stock === 0}
                                    >
                                        <ShoppingBag size={16} className="mr-1" /> Add
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};