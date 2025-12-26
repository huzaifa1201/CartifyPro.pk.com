
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUpdateProfile, apiGetCategories } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Card, Button, Input } from '../components/UI';
import { Store, Image, Save, FileText, Link as LinkIcon, Wallet, CreditCard, Tag, Info, CheckCircle, Truck } from 'lucide-react';
import { BranchPaymentConfig, Category, CountryLocalPaymentMethod } from '../types';
import { getCurrency } from '../constants';

export const BranchSettingsPage: React.FC = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const currency = getCurrency(user?.branchCountry || user?.country);

    // General Profile Data
    const [formData, setFormData] = useState({
        branchName: '',
        slug: '', // Shop URL Slug
        description: '',
        bannerURL: '',
        logoURL: '',
        shopCategory: '',
        deliveryFee: 0
    });

    // Data Loading
    const [countryMethods, setCountryMethods] = useState<CountryLocalPaymentMethod[]>([]);
    const [paymentConfigs, setPaymentConfigs] = useState<BranchPaymentConfig[]>([]);
    const [categories, setCategories] = useState<Category[]>([]); // Categories for selection
    const [originalSlug, setOriginalSlug] = useState('');

    useEffect(() => {
        if (user) {
            const loadData = async () => {
                const country = user.country?.toLowerCase() || 'pakistan';
                // Dynamically import to avoid circular dep issues if any, though explicit import is better
                const { apiGetCountryLocalPaymentMethods, apiGetCategories, apiGetBranch } = await import('../services/api');

                const [methods, cats] = await Promise.all([
                    apiGetCountryLocalPaymentMethods(country), // fetch only ENABLED methods by default
                    apiGetCategories()
                ]);
                setCountryMethods(methods);
                setCategories(cats);

                // Load Branch Data for Slug
                if (user.branchID) {
                    const branch = await apiGetBranch(user.branchID);
                    if (branch) {
                        setFormData(prev => ({
                            ...prev,
                            branchName: user.name || '',
                            slug: branch.slug || '',
                            description: user.description || '',
                            bannerURL: user.bannerURL || '',
                            logoURL: user.logoURL || '',
                            shopCategory: user.shopCategory || '',
                            deliveryFee: user.deliveryFee || 0
                        }));
                        setOriginalSlug(branch.slug || '');
                    }
                } else {
                    setFormData(prev => ({
                        ...prev,
                        branchName: user.name || '',
                        description: user.description || '',
                        bannerURL: user.bannerURL || '',
                        logoURL: user.logoURL || '',
                        shopCategory: user.shopCategory || '',
                        deliveryFee: user.deliveryFee || 0
                    }));
                }


                // Initialize config state: merge existing user config with allowed country methods
                const existingConfigs = user.paymentConfig || [];
                const merged = methods.map(method => {
                    const existing = existingConfigs.find(c => c.providerName === method.name); // Match by name as IDs might differ
                    if (existing) {
                        return { ...existing, providerId: method.id }; // Update ID to match current method ID
                    }
                    return {
                        providerId: method.id,
                        providerName: method.name,
                        accountTitle: '',
                        accountNumber: '',
                        instructions: '',
                        enabled: false
                    };
                });
                setPaymentConfigs(merged);
            };
            loadData();
        }
    }, [user]);

    const handlePaymentConfigChange = (index: number, field: keyof BranchPaymentConfig, value: any) => {
        const updated = [...paymentConfigs];
        updated[index] = { ...updated[index], [field]: value };
        setPaymentConfigs(updated);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            const { apiUpdateBranchSlug } = await import('../services/api');

            // 1. Update Slug if changed
            if (formData.slug !== originalSlug && user.branchID) {
                await apiUpdateBranchSlug(user.branchID, formData.slug);
                setOriginalSlug(formData.slug);
            }

            // 2. Update Profile
            await apiUpdateProfile(user.uid, {
                name: formData.branchName,
                description: formData.description,
                bannerURL: formData.bannerURL,
                logoURL: formData.logoURL,
                shopCategory: formData.shopCategory,
                deliveryFee: formData.deliveryFee,
                paymentConfig: paymentConfigs
            });
            addToast("Branch settings updated successfully!", 'success');
        } catch (e: any) {
            console.error(e);
            addToast(e.message || "Failed to update settings.", 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-10">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Branch Settings</h1>

            <form onSubmit={handleSave} className="space-y-8">
                <Card className="p-8 shadow-md">
                    {/* General Section */}
                    <div className="mb-8">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                            <Store className="text-blue-600 dark:text-blue-400" size={20} /> General Information
                        </h3>
                        <div className="space-y-4">
                            <Input
                                label="Branch Name"
                                value={formData.branchName}
                                onChange={e => setFormData({ ...formData, branchName: e.target.value })}
                                placeholder="e.g. My Official Store"
                                required
                            />
                            {/* Shop URL Slug */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shop URL Slug</label>
                                <div className="flex items-center">
                                    <span className="bg-gray-100 dark:bg-slate-800 px-3 py-2.5 border border-r-0 border-gray-300 dark:border-slate-700 rounded-l-lg text-gray-500 text-sm">
                                        /shop/
                                    </span>
                                    <input
                                        type="text"
                                        value={formData.slug}
                                        onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-r-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="my-shop-name"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Your shop will be accessible at: <span className="font-mono text-blue-600">{window.location.origin}/#/shop/{formData.slug || '...'}</span>
                                </p>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shop Category</label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <select
                                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
                                        value={formData.shopCategory}
                                        onChange={e => setFormData({ ...formData, shopCategory: e.target.value })}
                                    >
                                        <option value="">Select a Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name} className="bg-white dark:bg-slate-900">{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This helps users find your shop in search results.</p>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Tell customers about your shop..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Delivery Settings (New) */}
                    <div className="mb-8">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                            <Truck className="text-orange-600 dark:text-orange-400" size={20} /> Delivery Settings
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label={`Fixed Delivery Charge (${currency})`}
                                type="number"
                                value={formData.deliveryFee}
                                onChange={e => setFormData({ ...formData, deliveryFee: parseFloat(e.target.value) || 0 })}
                                min="0"
                                placeholder="0"
                            />
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-100 dark:border-slate-800">
                                <Info size={20} className="mr-2 text-blue-500 shrink-0" />
                                This fee will be added to the customer's total at checkout for orders from your branch. Set to 0 for free shipping.
                            </div>
                        </div>
                    </div>

                    {/* Branding Section */}
                    <div className="mb-8">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                            <Image className="text-purple-600 dark:text-purple-400" size={20} /> Branding & Visuals
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <Input
                                        label="Logo URL"
                                        value={formData.logoURL}
                                        onChange={e => setFormData({ ...formData, logoURL: e.target.value })}
                                        placeholder="https://example.com/logo.png"
                                        containerClassName="mb-1"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Recommended Size: 500x500px (Square)</p>
                                </div>
                                {/* Logo Preview */}
                                <div className="mt-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Logo Preview</label>
                                    <div className="mt-1 w-24 h-24 rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 overflow-hidden flex items-center justify-center relative">
                                        {formData.logoURL ? (
                                            <img src={formData.logoURL} alt="Logo" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = '')} />
                                        ) : (
                                            <span className="text-3xl font-bold text-gray-300 dark:text-gray-600">{formData.branchName.charAt(0)}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Input
                                        label="Banner Image URL"
                                        value={formData.bannerURL}
                                        onChange={e => setFormData({ ...formData, bannerURL: e.target.value })}
                                        placeholder="https://example.com/banner.jpg"
                                        containerClassName="mb-1"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Recommended Size: 1200x400px (Landscape)</p>
                                </div>
                                {/* Banner Preview */}
                                <div className="mt-2">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Banner Preview</label>
                                    <div className="mt-1 h-24 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 overflow-hidden relative">
                                        {formData.bannerURL ? (
                                            <img src={formData.bannerURL} alt="Banner" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = '')} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm italic">No banner set</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Payment Configuration Section */}
                <Card className="p-8 shadow-md">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                        <Wallet className="text-green-600 dark:text-green-400" size={20} /> Payment Receiving Settings
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Configure the payment methods you accept. Enable a provider to add your specific account details.
                    </p>

                    <div className="space-y-4">
                        {paymentConfigs.map((config, idx) => {
                            const provider = countryMethods.find(p => p.id === config.providerId);
                            if (!provider) return null;

                            const isCOD = provider.name.toLowerCase().includes('cash') || provider.name.toLowerCase().includes('cod');

                            return (
                                <div
                                    key={config.providerId}
                                    className={`border rounded-xl transition-all duration-200 ${config.enabled
                                        ? 'bg-white dark:bg-slate-900 border-blue-500 dark:border-blue-500 ring-1 ring-blue-500/20 shadow-md p-6'
                                        : 'bg-gray-50 dark:bg-slate-800/30 border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800/50 p-4'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-lg flex items-center justify-center ${config.enabled ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-500'}`}>
                                                <CreditCard size={24} />
                                            </div>
                                            <div>
                                                <h4 className={`font-bold text-lg ${config.enabled ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                                                    {provider.name}
                                                </h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide">
                                                    {isCOD ? 'Cash on Delivery' : 'Digital Payment'}
                                                </p>
                                            </div>
                                        </div>

                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={config.enabled}
                                                onChange={(e) => handlePaymentConfigChange(idx, 'enabled', e.target.checked)}
                                            />
                                            <div className="w-14 h-8 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    {config.enabled && (
                                        <div className="mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-top-2 fade-in duration-300">
                                            {!isCOD ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <Input
                                                        label="Account Title"
                                                        placeholder="e.g. My Store Official"
                                                        value={config.accountTitle}
                                                        onChange={e => handlePaymentConfigChange(idx, 'accountTitle', e.target.value)}
                                                        containerClassName="mb-0"
                                                        className="bg-gray-50 focus:bg-white"
                                                    />
                                                    <Input
                                                        label="Account Number / IBAN"
                                                        placeholder="e.g. 03001234567 or PK36MEZN..."
                                                        value={config.accountNumber}
                                                        onChange={e => handlePaymentConfigChange(idx, 'accountNumber', e.target.value)}
                                                        containerClassName="mb-0"
                                                        className="bg-gray-50 focus:bg-white"
                                                    />
                                                    <div className="md:col-span-2">
                                                        <Input
                                                            label="Payment Instructions (Optional)"
                                                            placeholder="e.g. Please share screenshot on WhatsApp after payment."
                                                            value={config.instructions}
                                                            onChange={e => handlePaymentConfigChange(idx, 'instructions', e.target.value)}
                                                            containerClassName="mb-0"
                                                            className="bg-gray-50 focus:bg-white"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
                                                    <CheckCircle size={20} className="shrink-0" />
                                                    <p className="text-sm font-medium">Cash on Delivery is active. Customers will pay when they receive the order.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {paymentConfigs.length === 0 && <p className="text-gray-500 text-center py-8">No payment providers configured by the administrator.</p>}
                    </div>
                </Card>

                <div className="sticky bottom-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur p-4 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-800 flex justify-end z-20">
                    <Button type="submit" className="w-full md:w-auto px-8 h-12 text-lg shadow-lg shadow-blue-200 dark:shadow-blue-900/20" isLoading={loading}>
                        <Save size={20} className="mr-2" /> Save All Settings
                    </Button>
                </div>
            </form>
        </div>
    );
};
