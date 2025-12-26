import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { Button, Card } from '../components/UI';
import { getCurrency } from '../constants';
import { useAuth } from '../context/AuthContext';
import { Trash2, ArrowRight, ShoppingBag, ArrowLeft, Heart } from 'lucide-react';

export const CartPage: React.FC = () => {
  const { cart, removeFromCart, total, clearCart } = useCart();
  const { addToWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();
  const navigate = useNavigate();
  const currency = getCurrency(user?.country);

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 text-center px-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-8 rounded-full shadow-inner animate-pulse">
          <ShoppingBag size={64} className="text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-4 tracking-tight">Your cart is empty</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">Looks like you haven't added anything yet. Explore our marketplace and find something you love!</p>
        <Link to="/" className="pt-4">
          <Button size="lg" className="shadow-xl shadow-blue-200">Start Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-2">
        <Link to="/" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Shopping Cart</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="!p-0 overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-slate-700">
              {cart.map(item => (
                <div key={item.id} className="p-6 flex flex-col sm:flex-row gap-6 items-center">
                  <img
                    src={item.imageURL}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-xl bg-gray-50 dark:bg-slate-900 border dark:border-slate-700"
                  />
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{item.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{item.category}</p>
                    <p className="font-bold text-blue-600 dark:text-blue-400">{currency}{item.price}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded-lg text-sm font-medium dark:text-gray-200">
                      Qty: {item.quantity}
                    </div>

                    <button
                      onClick={() => addToWishlist(item.id)}
                      className={`p-2 rounded-full transition-colors ${isInWishlist(item.id) ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                      title={isInWishlist(item.id) ? "Remove from Wishlist" : "Save for Later"}
                    >
                      <Heart size={20} fill={isInWishlist(item.id) ? "currentColor" : "none"} />
                    </button>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                      title="Remove item"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex justify-between items-center px-2">
            <button onClick={clearCart} className="text-red-500 text-sm font-medium hover:underline">
              Clear Cart
            </button>
            <Link to="/">
              <Button variant="outline">Continue Shopping</Button>
            </Link>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 space-y-6">
            <h2 className="text-xl font-bold border-b dark:border-slate-700 pb-4 dark:text-gray-100">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal ({cart.reduce((a, c) => a + c.quantity, 0)} items)</span>
                <span>{currency}{total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Shipping</span>
                <span className="text-green-600 font-medium">Free</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tax Estimate</span>
                <span>{currency}0.00</span>
              </div>
              <div className="border-t dark:border-slate-700 pt-3 flex justify-between text-xl font-bold text-gray-900 dark:text-gray-100">
                <span>Total</span>
                <span>{currency}{total.toFixed(2)}</span>
              </div>
            </div>

            <Button onClick={() => navigate('/checkout')} className="w-full py-4 text-lg shadow-lg shadow-blue-200">
              Proceed to Checkout <ArrowRight className="ml-2" />
            </Button>

            <p className="text-xs text-center text-gray-400">
              Secure Checkout - 100% Money Back Guarantee
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};