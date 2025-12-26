
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiGetCountryConfig, apiCreateBranchRequest, apiUploadFile, apiGetPlatformPaymentAccounts } from '../services/api';
import { CountryConfig, PaymentMethod, PlatformPaymentAccount } from '../types';
import { Card, Button, Input, Badge } from './UI';
import { Building, CreditCard, ImageIcon, Tag, Store, Info, UploadCloud } from 'lucide-react';

interface BranchRegistrationFormProps {
    onSuccess: () => void;
}

export const BranchRegistrationForm: React.FC<BranchRegistrationFormProps> = ({ onSuccess }) => {
    const { user } = useAuth();
    const { addToast } = useToast();

    const [config, setConfig] = useState<CountryConfig | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [phone, setPhone] = useState('');
    const [shopName, setShopName] = useState('');
    const [address, setAddress] = useState('');

    // Category
    const [shopCategory, setShopCategory] = useState(''); // Simple input for now, or match existing

    // Payment
    const [platformAccounts, setPlatformAccounts] = useState<PlatformPaymentAccount[]>([]);

    // Payment
    const [selectedAccount, setSelectedAccount] = useState<PlatformPaymentAccount | null>(null);
    const [transactionId, setTransactionId] = useState('');
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string>('');

    useEffect(() => {
        if (user?.country) {
            loadConfig(user.country);
        } else {
            setLoadingConfig(false);
        }
    }, [user?.country]);

    const loadConfig = async (country: string) => {
        setLoadingConfig(true);
        try {
            const [countryConfig, accounts] = await Promise.all([
                apiGetCountryConfig(country),
                apiGetPlatformPaymentAccounts(country)
            ]);
            setConfig(countryConfig);
            setPlatformAccounts(accounts);
        } catch (error) {
            console.error("Failed to load config", error);
        } finally {
            setLoadingConfig(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setScreenshotFile(file);
            setScreenshotPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !config) return;

        if (!selectedAccount) {
            addToast("Please select a payment account", 'error');
            return;
        }
        // if (!screenshotFile) {
        //     addToast("Please upload a payment screenshot", 'error');
        //     return;
        // }

        if (!shopCategory.trim()) {
            addToast("Please enter a shop category", 'error');
            return;
        }

        if (!shopName.trim()) {
            addToast("Please enter a Shop Name", 'error');
            return;
        }

        setSubmitting(true);
        try {
            // 1. Upload Screenshot (Optional)
            let screenshotUrl = '';
            if (screenshotFile) {
                screenshotUrl = await apiUploadFile(screenshotFile, `payment_proofs/${user.uid}_${Date.now()}`);
            }

            // 2. Submit Request
            await apiCreateBranchRequest({
                userID: user.uid,
                userName: user.name,
                shopName: shopName.trim(), // Send Shop Name
                userEmail: user.email,
                phone,
                address,
                amount: config.branch_fee,
                currency: config.currency,
                paymentMethod: `${selectedAccount.type} - ${selectedAccount.title}`, // Store descriptive name
                transactionId,
                screenshotUrl,
                shopCategory,
                country: user.country || config.id
            });

            addToast("Application submitted successfully!", 'success');
            onSuccess();
        } catch (error) {
            console.error("Submission failed", error);
            addToast("Failed to submit application. Please try again.", 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingConfig) {
        return <div className="p-8 text-center text-gray-500">Loading country configuration...</div>;
    }

    if (!user?.country) {
        return (
            <Card className="p-8 text-center bg-red-50 border-red-100">
                <Info className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-red-800">Country Not Selected</h3>
                <p className="text-red-600 mb-4">You must update your profile with your country (Pakistan, India, or UAE) before applying.</p>
                <Button onClick={() => window.location.href = '/profile'}>Go to Profile</Button>
            </Card>
        )
    }

    if (!config) {
        // ... (Keep existing seeding button login)
        return (
            <Card className="p-8 text-center bg-yellow-50 border-yellow-100">
                <Info className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-yellow-800">Registration Unavailable</h3>
                <p className="text-yellow-700 mb-4">
                    Branch registration is not yet configured for {user.country}. Please contact support.
                </p>
                <div className="text-xs text-left bg-white p-4 rounded mt-4 border border-yellow-200">
                    <p className="font-bold mb-2">Developer Note: Populating default data...</p>
                    <p>Please ask admin to configure 'countries/{user.country.toLowerCase()}' in Firestore.</p>
                    <button
                        onClick={async () => {
                            const { seedMakeCountries } = await import('../utils/seedData');
                            await seedMakeCountries();
                            window.location.reload();
                        }}
                        className="mt-2 text-blue-600 underline text-xs"
                    >
                        Initialize Default Countries (Dev Only)
                    </button>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="mb-6">
                <h3 className="text-lg font-bold mb-2">Branch Registration</h3>
                <p className="text-sm text-gray-500">
                    Based on your location (<span className="font-bold text-gray-800">{user.country}</span>),
                    the branch registration fee is <span className="font-bold text-blue-600">{config.currency} {config.branch_fee}</span>.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg space-y-4 border border-gray-100 dark:border-slate-700">
                    <h4 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Shop / Business Name" value={shopName} onChange={e => setShopName(e.target.value)} required placeholder="e.g. My Fashion Store" containerClassName="md:col-span-2" />
                        <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="+123..." />
                        <Input label="Address" value={address} onChange={e => setAddress(e.target.value)} required placeholder="Full Address" />
                        <Input label="Shop Category" value={shopCategory} onChange={e => setShopCategory(e.target.value)} required placeholder="e.g. Clothing, Electronics" containerClassName="md:col-span-2" />
                    </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg space-y-4 border border-blue-100 dark:border-blue-900/30">
                    <h4 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2"><CreditCard size={16} /> Payment</h4>

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Select where to send fee:</p>
                        <div className="grid grid-cols-1 gap-3">
                            {platformAccounts.length === 0 ? (
                                <p className="text-sm text-red-500">No payment accounts configured for {user.country}.</p>
                            ) : platformAccounts.map(account => (
                                <div
                                    key={account.id}
                                    onClick={() => setSelectedAccount(account)}
                                    className={`p-4 rounded border cursor-pointer transition-all ${selectedAccount?.id === account.id ? 'bg-white border-blue-600 ring-2 ring-blue-600/20' : 'bg-white/50 border-blue-200 hover:bg-white'}`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-blue-900">{account.title}</span>
                                        <Badge color="blue">{account.type}</Badge>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-1">
                                        <p><span className="font-medium">Account:</span> <span className="font-mono bg-gray-100 px-1 rounded">{account.accountNumber}</span></p>
                                        <p className="italic text-xs mt-1">"{account.instructions}"</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg space-y-4 border border-gray-100 dark:border-slate-700">
                    <h4 className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><UploadCloud size={16} /> Proof of Payment</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Transaction ID" value={transactionId} onChange={e => setTransactionId(e.target.value)} required placeholder="Bank/App Transaction ID" />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Screenshot (Optional)</label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-4 text-center hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {screenshotPreview ? (
                                    <div className="relative h-32 w-full">
                                        <img src={screenshotPreview} alt="Preview" className="h-full w-full object-contain" />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        <ImageIcon size={24} className="mb-2" />
                                        <span className="text-xs">Click to upload image</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <Button type="submit" isLoading={submitting} className="w-full">
                    Submit Application ({config.currency} {config.branch_fee})
                </Button>
            </form>
        </Card>
    );
};
