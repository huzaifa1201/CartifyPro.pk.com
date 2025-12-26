import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { apiGetWishlist, apiToggleWishlist } from '../services/api';
import { useToast } from './ToastContext';

interface WishlistContextType {
  wishlist: string[];
  addToWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<string[]>([]);
  const { addToast } = useToast();

  useEffect(() => {
    if (user) {
      apiGetWishlist(user.uid).then(setWishlist);
    } else {
      setWishlist([]);
    }
  }, [user]);

  const addToWishlist = async (productId: string) => {
    if (!user) {
        addToast("Please login to save favorites", 'error');
        return;
    }
    
    // Optimistic Update
    const isCurrentlyIn = wishlist.includes(productId);
    if (isCurrentlyIn) {
        setWishlist(prev => prev.filter(id => id !== productId));
        addToast("Removed from Wishlist", 'info');
    } else {
        setWishlist(prev => [...prev, productId]);
        addToast("Added to Wishlist", 'success');
    }

    try {
        await apiToggleWishlist(user.uid, productId);
    } catch (e) {
        // Revert on error
        if (isCurrentlyIn) {
             setWishlist(prev => [...prev, productId]);
        } else {
             setWishlist(prev => prev.filter(id => id !== productId));
        }
        addToast("Failed to update wishlist", 'error');
    }
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
};
