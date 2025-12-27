
import React, { createContext, useContext, useState } from 'react';
import { Product, CartItem, ProductVariant } from '../types';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, variant?: ProductVariant) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [cart, setCart] = React.useState<CartItem[]>(() => {
    const saved = localStorage.getItem('nexuscart_cart');
    return saved ? JSON.parse(saved) : [];
  });

  React.useEffect(() => {
    localStorage.setItem('nexuscart_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, variant?: ProductVariant) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setCart(prev => {
      // Find item with same Product ID AND same Variant ID (if applicable)
      const existing = prev.find(item => {
        const sameProduct = item.id === product.id;
        const sameVariant = variant ? item.selectedVariant?.id === variant.id : !item.selectedVariant;
        return sameProduct && sameVariant;
      });

      if (existing) {
        return prev.map(item => {
          const sameProduct = item.id === product.id;
          const sameVariant = variant ? item.selectedVariant?.id === variant.id : !item.selectedVariant;
          if (sameProduct && sameVariant) {
            return { ...item, quantity: item.quantity + 1 };
          }
          return item;
        });
      }

      // If variant, use variant price and image, otherwise product defaults
      const cartItem: CartItem = {
        ...product,
        quantity: 1,
        selectedVariant: variant,
        price: variant ? variant.price : product.price,
        imageURL: variant && variant.imageURL ? variant.imageURL : product.imageURL
      };

      return [...prev, cartItem];
    });
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setCart(prev => prev.filter(item => {
      const isTarget = item.id === productId && (variantId ? item.selectedVariant?.id === variantId : !item.selectedVariant);
      return !isTarget;
    }));
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total, itemCount, showLoginModal, setShowLoginModal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
