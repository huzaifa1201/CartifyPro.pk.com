import React, { useEffect, useState } from 'react';
import {
    apiGetCountryLocalPaymentMethods,
    apiSaveCountryLocalPaymentMethod,
    apiGetPlatformPaymentAccounts,
    apiSavePlatformPaymentAccount,
    apiDeletePlatformPaymentAccount,
    apiGetCountryConfig,
    apiSaveCountryConfig,
    apiDeleteCountryLocalPaymentMethod
} from '../../services/api';
import { CountryLocalPaymentMethod, PlatformPaymentAccount, CountryConfig } from '../../types';
import { Card, Button, Input, Badge, Select } from '../UI';
import { CreditCard, Wallet, Plus, Trash2, Save, Edit2, CheckCircle, XCircle, X, Banknote, ShieldCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const COUNTRIES = ['pakistan', 'india', 'uae'];

const PREDEFINED_METHODS: Record<string, { name: string; type: 'digital' | 'manual' | 'cod' }[]> = {
    pakistan: [
        { name: 'JazzCash', type: 'digital' },
        { name: 'EasyPaisa', type: 'digital' },
        { name: 'Cash on Delivery', type: 'cod' },
        { name: 'Bank Transfer', type: 'manual' },
        { name: 'NayaPay', type: 'digital' }
    ],
    india: [
        { name: 'Paytm', type: 'digital' },
        { name: 'PhonePe', type: 'digital' },
        { name: 'Google Pay', type: 'digital' },
        { name: 'Cash on Delivery', type: 'cod' },
        { name: 'Bank Transfer', type: 'manual' }
    ],
    uae: [
        { name: 'Careem Pay', type: 'digital' },
        { name: 'Apple Pay', type: 'digital' },
        { name: 'Cash on Delivery', type: 'cod' },
        { name: 'Bank Transfer', type: 'manual' },
        { name: 'M-Paisa', type: 'digital' }
    ]
};

export const CountryPaymentSettings: React.FC = () => {
    const { addToast } = useToast();
    const [selectedCountry, setSelectedCountry] = useState('pakistan');
    const [loading, setLoading] = useState(false);

    // Data State
    const [countryConfig, setCountryConfig] = useState<CountryConfig | null>(null);
    const [localMethods, setLocalMethods] = useState<CountryLocalPaymentMethod[]>([]);
    const [platformAccounts, setPlatformAccounts] = useState<PlatformPaymentAccount[]>([]);

    // Form states for Country Config
    const [fee, setFee] = useState(0);
    const [currency, setCurrency] = useState('');

    // Edit States
    const [editingLocalId, setEditingLocalId] = useState<string | null>(null);
    const [localInstruction, setLocalInstruction] = useState('');

    // Modal State for Platform Account
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [accountForm, setAccountForm] = useState<PlatformPaymentAccount>({
        id: '',
        country: selectedCountry,
        type: 'Bank',
        title: '',
        accountNumber: '',
        instructions: '',
        enabled: true
    });

    useEffect(() => {
        loadData();
    }, [selectedCountry]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [locals, platforms, config] = await Promise.all([
                apiGetCountryLocalPaymentMethods(selectedCountry, false), // Fetch all
                apiGetPlatformPaymentAccounts(selectedCountry, false),
                apiGetCountryConfig(selectedCountry)
            ]);

            setLocalMethods(locals);
            setPlatformAccounts(platforms);
            setCountryConfig(config);
            if (config) {
                setFee(config.branch_fee);
                setCurrency(config.currency);
            } else {
                setFee(0);
                setCurrency('');
            }
        } catch (e) {
            console.error(e);
            addToast("Failed to load payment settings", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCountryConfig = async () => {
        try {
            const newConfig: CountryConfig = {
                id: selectedCountry,
                branch_fee: fee,
                currency: currency,
                payment_methods: countryConfig?.payment_methods || [],
                payment_instructions: countryConfig?.payment_instructions || ''
            };
            await apiSaveCountryConfig(newConfig);
            setCountryConfig(newConfig);
            addToast("Country configuration updated", 'success');
        } catch (e) {
            addToast("Failed to save country config", 'error');
        }
    };

    // --- Local Methods Handlers ---

    const toggleLocalMethod = async (method: CountryLocalPaymentMethod) => {
        try {
            await apiSaveCountryLocalPaymentMethod({ ...method, enabled: !method.enabled });
            addToast(`${method.name} ${!method.enabled ? 'Enabled' : 'Disabled'}`, 'success');
            // Optimistic update
            setLocalMethods(prev => prev.map(m => m.id === method.id ? { ...m, enabled: !m.enabled } : m));
        } catch (e) {
            addToast("Failed to update status", 'error');
            loadData();
        }
    };

    const handleDeleteLocalMethod = async (id: string) => {
        if (confirm("Delete this payment method?")) {
            try {
                await apiDeleteCountryLocalPaymentMethod(id);
                addToast("Method deleted", 'success');
                setLocalMethods(prev => prev.filter(m => m.id !== id));
            } catch (e) {
                addToast("Failed to delete", 'error');
            }
        }
    };

    const startEditLocal = (method: CountryLocalPaymentMethod) => {
        setEditingLocalId(method.id);
        setLocalInstruction(method.instructions);
    };

    const saveLocalInstruction = async (method: CountryLocalPaymentMethod) => {
        try {
            await apiSaveCountryLocalPaymentMethod({ ...method, instructions: localInstruction });
            addToast("Instructions updated", 'success');
            setEditingLocalId(null);
            // Optimistic update
            setLocalMethods(prev => prev.map(m => m.id === method.id ? { ...m, instructions: localInstruction } : m));
        } catch (e) {
            addToast("Failed to save instructions", 'error');
        }
    };

    const handleQuickToggleMethod = async (name: string, type: 'digital' | 'manual' | 'cod') => {
        const existing = localMethods.find(m => m.name.toLowerCase() === name.toLowerCase());
        try {
            if (existing) {
                // Toggle existing
                await apiSaveCountryLocalPaymentMethod({ ...existing, enabled: !existing.enabled });
                addToast(`${name} ${!existing.enabled ? 'Enabled' : 'Disabled'}`, 'success');
            } else {
                // Create new
                await apiSaveCountryLocalPaymentMethod({
                    country: selectedCountry,
                    name,
                    type,
                    enabled: true,
                    instructions: type === 'cod' ? 'Pay cash upon arrival.' : `Send to ${name} Account`
                } as any);
                addToast(`${name} added and enabled`, 'success');
            }
            loadData();
        } catch (e) {
            addToast("Action failed", 'error');
        }
    };

    // --- Platform Account Handlers ---

    const handleSaveAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiSavePlatformPaymentAccount({ ...accountForm, country: selectedCountry });
            addToast("Payment account saved", 'success');
            setIsAccountModalOpen(false);
            setAccountForm({ id: '', country: selectedCountry, type: 'Bank', title: '', accountNumber: '', instructions: '', enabled: true });
            loadData();
        } catch (e) {
            addToast("Failed to save account", 'error');
        }
    };

    const togglePlatformAccount = async (account: PlatformPaymentAccount) => {
        try {
            await apiSavePlatformPaymentAccount({ ...account, enabled: !account.enabled });
            addToast(`Account ${!account.enabled ? 'Enabled' : 'Disabled'}`, 'success');
            loadData(); // Reload to reflect
        } catch (e) {
            addToast("Failed to update status", 'error');
        }
    };

    const handleDeleteAccount = async (id: string) => {
        if (confirm("Are you sure you want to delete this payment account?")) {
            try {
                await apiDeletePlatformPaymentAccount(id);
                addToast("Account deleted", 'success');
                loadData();
            } catch (e) {
                addToast("Failed to delete account", 'error');
            }
        }
    };

    const updateAccountForm = (field: keyof PlatformPaymentAccount, value: any) => {
        setAccountForm(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-6">
            {/* Country Tabs */}
            <div className="flex border-b border-gray-200 dark:border-slate-700">
                {COUNTRIES.map(c => (
                    <button
                        key={c}
                        onClick={() => setSelectedCountry(c)}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${selectedCountry === c
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        {c}
                    </button>
                ))}
            </div>

            {/* SECTION 0: Country General Config (Fees & Currency) */}
            <Card className="border-l-4 border-l-blue-600">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                            <Banknote size={20} className="text-blue-600" />
                            Country Configuration & Fees
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Set the registration fee and currency for branches in <span className="font-bold capitalize">{selectedCountry}</span>.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:flex items-end gap-4">
                        <Input
                            label="Currency Code"
                            placeholder="e.g. PKR, AED"
                            value={currency}
                            onChange={e => setCurrency(e.target.value.toUpperCase())}
                            containerClassName="mb-0 w-full md:w-32"
                        />
                        <Input
                            label="Registration Fee"
                            type="number"
                            placeholder="0"
                            value={fee}
                            onChange={e => setFee(parseFloat(e.target.value) || 0)}
                            containerClassName="mb-0 w-full md:w-40"
                        />
                        <Button className="h-10 px-6" onClick={handleSaveCountryConfig}>
                            <Save size={18} className="mr-2" /> Save Config
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* SECTION 1: Customer -> Branch (Local Methods) */}
                <Card className="h-fit">
                    <div className="mb-6 pb-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                <CreditCard size={20} className="text-blue-500" />
                                Customer Checkout Options
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Toggle methods available for customers in <span className="font-bold capitalize">{selectedCountry}</span>.
                            </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setIsManageModalOpen(true)}>
                            <ShieldCheck size={16} className="mr-2" /> Manage Methods
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {loading ? <div className="text-center py-8"><div className="animate-spin w-6 h-6 border-2 border-blue-500 rounded-full border-t-transparent mx-auto"></div></div> : localMethods.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 bg-gray-50 dark:bg-slate-900 rounded-lg">
                                No local methods configured for {selectedCountry}.
                            </div>
                        ) : (
                            localMethods.map(method => (
                                <div key={method.id} className={`flex flex-col border rounded-lg transition-all ${method.enabled ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10' : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800 opacity-75'}`}>
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${method.enabled ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-gray-100 text-gray-400 dark:bg-slate-700'}`}>
                                                <CreditCard size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-gray-100">{method.name}</h4>
                                                <Badge color={method.type === 'digital' ? 'purple' : 'gray'} className="text-[10px] mt-0.5 uppercase tracking-wide">
                                                    {method.type}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Toggle Switch */}
                                        <div className="flex items-center gap-3">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={method.enabled} onChange={() => toggleLocalMethod(method)} />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                            </label>
                                            <button onClick={() => handleDeleteLocalMethod(method.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete Method">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Instruction Area */}
                                    <div className="px-4 pb-4">
                                        {editingLocalId === method.id ? (
                                            <div className="flex gap-2">
                                                <Input
                                                    value={localInstruction}
                                                    onChange={e => setLocalInstruction(e.target.value)}
                                                    placeholder="Enter user instructions..."
                                                    className="text-sm h-9"
                                                    containerClassName="mb-0 flex-1"
                                                />
                                                <Button size="sm" onClick={() => saveLocalInstruction(method)}><Save size={14} /></Button>
                                                <Button size="sm" variant="secondary" onClick={() => setEditingLocalId(null)}><X size={14} /></Button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-2 rounded text-sm text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-100 dark:hover:border-slate-700 group transition-all">
                                                <span className="italic truncate flex-1">{method.instructions || 'No instructions set'}</span>
                                                <button onClick={() => startEditLocal(method)} className="opacity-0 group-hover:opacity-100 text-blue-500 hover:bg-blue-50 p-1 rounded transition-all">
                                                    <Edit2 size={12} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* SECTION 2: Branch -> Platform (Platform Accounts) */}
                <Card className="h-fit">
                    <div className="mb-6 pb-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                <Wallet size={20} className="text-purple-500" />
                                Platform Accounts
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Where branches in <span className="font-bold capitalize">{selectedCountry}</span> send fees.
                            </p>
                        </div>
                        <Button size="sm" onClick={() => setIsAccountModalOpen(true)}>
                            <Plus size={16} className="mr-2" /> Add Account
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {loading ? <div className="text-center py-8"><div className="animate-spin w-6 h-6 border-2 border-purple-500 rounded-full border-t-transparent mx-auto"></div></div> : platformAccounts.length === 0 ? (
                            <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl">
                                <Wallet className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                                <p>No accounts configured.</p>
                                <Button variant="secondary" size="sm" className="mt-4" onClick={() => setIsAccountModalOpen(true)}>Add Your First Account</Button>
                            </div>
                        ) : (
                            platformAccounts.map(account => (
                                <div key={account.id} className="relative group p-4 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-3">
                                            <div className="mt-1">
                                                {account.type === 'Bank' && <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Wallet size={18} /></div>}
                                                {account.type !== 'Bank' && <div className="p-2 bg-green-100 text-green-600 rounded-lg"><CreditCard size={18} /></div>}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                                    {account.title}
                                                    <Badge color={account.enabled ? 'green' : 'red'} className="text-[10px]">
                                                        {account.enabled ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </h4>
                                                <p className="font-mono text-sm text-gray-600 dark:text-gray-300 mt-1 bg-gray-50 dark:bg-slate-900 px-2 py-0.5 rounded w-fit">
                                                    {account.accountNumber}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic border-l-2 border-gray-200 dark:border-slate-600 pl-2">
                                                    {account.instructions}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => togglePlatformAccount(account)}
                                                className={`p-1.5 rounded-lg transition-colors ${account.enabled ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`}
                                                title={account.enabled ? 'Disable' : 'Enable'}
                                            >
                                                {account.enabled ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAccount(account.id)}
                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* Add Account Modal */}
            {isAccountModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <Card className="w-full max-w-lg shadow-2xl scale-100 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-slate-700">
                            <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100">Add Platform Account</h3>
                            <button onClick={() => setIsAccountModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAccount} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                                    <div className="px-3 py-2 bg-gray-100 dark:bg-slate-700 rounded-lg text-gray-500 capitalize font-medium">{selectedCountry}</div>
                                </div>
                                <Select
                                    label="Account Type"
                                    value={accountForm.type}
                                    onChange={e => updateAccountForm('type', e.target.value)}
                                >
                                    <option value="Bank">Bank Transfer</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Wallet">Digital Wallet</option>
                                    <option value="Crypto">Crypto Address</option>
                                    <option value="Other">Other</option>
                                </Select>
                            </div>

                            <Input
                                label="Account Title"
                                placeholder="e.g. Nexus Corporate Bank"
                                value={accountForm.title}
                                onChange={e => updateAccountForm('title', e.target.value)}
                                required
                            />

                            <Input
                                label="Account Number / ID"
                                placeholder="IBAN, UPI ID, or Wallet Address"
                                value={accountForm.accountNumber}
                                onChange={e => updateAccountForm('accountNumber', e.target.value)}
                                required
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructions for Branch</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                    rows={3}
                                    placeholder="Add any specific instructions like 'Send screenshot after payment'..."
                                    value={accountForm.instructions}
                                    onChange={e => updateAccountForm('instructions', e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsAccountModalOpen(false)}>Cancel</Button>
                                <Button type="submit" className="flex-1">Save Account</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Manage Methods Modal */}
            {isManageModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <Card className="w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-slate-700">
                            <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <CreditCard className="text-blue-600" />
                                {selectedCountry.toUpperCase()} Providers
                            </h3>
                            <button onClick={() => setIsManageModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Quick toggle standard payment providers for {selectedCountry}.
                            </p>

                            <div className="grid grid-cols-1 gap-3">
                                {PREDEFINED_METHODS[selectedCountry]?.map(m => {
                                    const activeMethod = localMethods.find(lm => lm.name.toLowerCase() === m.name.toLowerCase());
                                    const isEnabled = activeMethod?.enabled || false;

                                    return (
                                        <div key={m.name} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isEnabled ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-gray-50 border-gray-100 dark:bg-slate-900 dark:border-slate-800'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${isEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                                                    <CreditCard size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-gray-100">{m.name}</p>
                                                    <p className="text-xs text-gray-500 uppercase tracking-wider">{m.type}</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={isEnabled}
                                                    onChange={() => handleQuickToggleMethod(m.name, m.type)}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>

                            <Button className="w-full mt-6" onClick={() => setIsManageModalOpen(false)}>Done</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};
