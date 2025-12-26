import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUpdateProfile } from '../services/api';
import { Card, Button } from './UI';
import { Globe, MapPin, Check } from 'lucide-react';

const COUNTRIES = [
    "Dubai",
    "India",
    "Pakistan"
];

export const CountrySelector: React.FC = () => {
    const { user, refreshProfile } = useAuth();
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        // Only show if user is logged in AND has no country set
        if (user && !user.country) {
            setShowModal(true);
        } else {
            setShowModal(false);
        }
    }, [user]);

    const handleSave = async () => {
        if (!selectedCountry || !user) return;
        setLoading(true);
        try {
            await apiUpdateProfile(user.uid, { country: selectedCountry });
            await refreshProfile(); // Refresh context to update user state
            setShowModal(false);
        } catch (error) {
            console.error("Failed to save country", error);
        } finally {
            setLoading(false);
        }
    };

    if (!showModal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <Card className="w-full max-w-lg p-0 overflow-hidden shadow-2xl relative">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
                    <Globe className="mx-auto mb-3 text-blue-100" size={48} />
                    <h2 className="text-2xl font-bold">Select Your Location</h2>
                    <p className="text-blue-100 opacity-90 mt-1">
                        Please select your country to see relevant products and shops.
                    </p>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {COUNTRIES.map((country) => (
                            <button
                                key={country}
                                onClick={() => setSelectedCountry(country)}
                                className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200
                  ${selectedCountry === country
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md ring-1 ring-blue-500'
                                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                            >
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0
                  ${selectedCountry === country ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300'}`}>
                                    {selectedCountry === country && <Check size={12} strokeWidth={3} />}
                                </div>
                                <span className="font-medium truncate">{country}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={!selectedCountry || loading}
                        isLoading={loading}
                        className="w-full sm:w-auto min-w-[150px] shadow-lg shadow-blue-200"
                    >
                        Confirm Selection
                    </Button>
                </div>
            </Card>
        </div>
    );
};
