
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from './UI';
import { X, LogIn, UserPlus } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const LoginModal: React.FC = () => {
    const { showLoginModal, setShowLoginModal } = useCart();
    const navigate = useNavigate();

    if (!showLoginModal) return null;

    const handleAction = (path: string) => {
        setShowLoginModal(false);
        navigate(path);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md mx-4 p-6 relative bg-white dark:bg-slate-900 shadow-2xl scale-100">
                <button
                    onClick={() => setShowLoginModal(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="text-center mb-8 pt-4">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
                        <LogIn size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Login Required</h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        Please login or create an account to add items to your cart and complete your purchase.
                    </p>
                </div>

                <div className="space-y-3">
                    <Button
                        onClick={() => handleAction('/auth')}
                        className="w-full flex items-center justify-center gap-2 h-12 text-lg"
                    >
                        <LogIn size={20} /> Login
                    </Button>
                    <Button
                        onClick={() => handleAction('/auth')}
                        variant="secondary"
                        className="w-full flex items-center justify-center gap-2 h-12 text-lg"
                    >
                        <UserPlus size={20} /> Create Account
                    </Button>
                </div>
            </Card>
        </div>
    );
};
