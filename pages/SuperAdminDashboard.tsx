
import React, { useEffect, useState } from 'react';
import {
    apiGetBranchRequests,
    apiUpdateBranchRequestStatus,
    apiGetUsers,
    apiGetOrders,
    apiDeleteUser,
    apiUpdateProfile,
    apiGetProducts,
    apiUpdateUserRole,
    apiGetSystemSettings,
    apiUpdateSystemSettings,

    apiGetContentPage,
    apiSaveContentPage,
    apiGetAllContentPages,
    apiDeleteContentPage,
    apiGetSocialLinks,
    apiSaveSocialLink,
    apiDeleteSocialLink,
    apiGetGlobalPaymentProviders,
    apiSaveGlobalPaymentProvider,
    apiDeleteGlobalPaymentProvider,
    apiGetAllAds,
    apiSaveAd,
    apiDeleteAd,
    apiGetCategories,
    apiSaveCategory,
    apiDeleteCategory,
    apiGetDisputes,
    apiResolveDispute,
    apiBroadcastNotification,
    apiGetChats,
    apiGetMessages,
    apiSendMessage,
    apiResetChatUnread,
    apiGetFinancePayments,
    apiUpdateFinancePaymentStatus,
    apiCreateNotification,
    apiUpdateBranchCountry
} from '../services/api';
import { BranchRequest, User, Order, RequestStatus, UserRole, Product, SystemSettings, PaymentMethod, OrderStatus, GlobalPaymentProvider, Ad, Category, Dispute, DisputeStatus, Chat, ChatMessage, SocialLink, ContentPage, FinancePayment } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Card, Button, Badge, Input, Textarea, Select } from '../components/UI';
import { Users, Store, Check, X, ExternalLink, Activity, Trash2, Settings, ShieldOff, BarChart2, Save, CreditCard, Plus, Edit2, FileText, ClipboardList, Wallet, Banknote, Megaphone, Link as LinkIcon, Layers, AlertTriangle, Send, Radio, Loader2, Star, MessageSquare, Sparkles, ArrowLeft, Phone, ShieldCheck } from 'lucide-react';
import { getCurrency, PAYMENT_PROVIDERS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CountryPaymentSettings } from '../components/admin/CountryPaymentSettings';

const COUNTRIES = [
    "Dubai",
    "India",
    "Pakistan"
];

export const SuperAdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const currency = getCurrency(user?.country);
    const [activeTab, setActiveTab] = useState<'overview' | 'branches' | 'users' | 'orders' | 'settings' | 'content' | 'ads' | 'categories' | 'disputes' | 'broadcast' | 'messages' | 'social' | 'finance' | 'globalPayments'>('overview');
    const [loading, setLoading] = useState(true);

    // Global Payments State
    const [globalProviders, setGlobalProviders] = useState<GlobalPaymentProvider[]>([]);
    const [showProviderForm, setShowProviderForm] = useState(false);
    const [providerForm, setProviderForm] = useState<GlobalPaymentProvider>({
        id: '',
        name: '',
        type: 'manual',
        enabled: true
    });

    // Chat State
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');

    // Data State
    const [requests, setRequests] = useState<BranchRequest[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [settings, setSettings] = useState<SystemSettings>({
        branchSetupFee: 500,
        platformName: '',
        maintenanceMode: false,
        stripePublicKey: '',
        stripeSecretKey: '',
        jazzCashMerchantID: '',
        jazzCashPassword: '',
        jazzCashIntegritySalt: ''
    });

    const [ads, setAds] = useState<Ad[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [allPages, setAllPages] = useState<ContentPage[]>([]);
    const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
    const [financePayments, setFinancePayments] = useState<FinancePayment[]>([]);

    // Order Filters
    const [orderSearch, setOrderSearch] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
    const [orderBranchFilter, setOrderBranchFilter] = useState<string>('all');





    // Ad Form State
    const [showAdForm, setShowAdForm] = useState(false);
    const [adForm, setAdForm] = useState<Ad>({
        id: '',
        title: '',
        imageURL: '',
        linkURL: '',
        active: true
    });

    // Category Form State
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [categoryForm, setCategoryForm] = useState<Partial<Category>>({
        id: '',
        name: '',
        imageURL: ''
    });

    // Social Link Form
    const [showSocialForm, setShowSocialForm] = useState(false);
    const [socialForm, setSocialForm] = useState<SocialLink>({
        id: '',
        platform: '',
        url: '',
        enabled: true
    });

    // Broadcast Form
    const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '' });
    const [broadcasting, setBroadcasting] = useState(false);

    // CMS State
    const [selectedPageId, setSelectedPageId] = useState('about');
    const [pageContent, setPageContent] = useState({ title: '', content: '' });
    const [cmsLoading, setCmsLoading] = useState(false);

    // Suspension Form State
    const [suspensionForm, setSuspensionForm] = useState({
        userId: '',
        days: 0,
        reason: ''
    });
    const [showSuspensionModal, setShowSuspensionModal] = useState(false);

    useEffect(() => {
        loadData(true);
        const interval = setInterval(() => {
            loadData(); // Periodic refresh is silent
            if (activeTab === 'messages') loadChats();
        }, 30000);
        return () => clearInterval(interval);
    }, [user, activeTab]);

    const loadChats = async () => {
        if (!user) return;
        const data = await apiGetChats(user.uid, user.role);
        setChats(data);
    };

    useEffect(() => {
        if (activeTab === 'content') {
            loadContentPage(selectedPageId);
        }
    }, [activeTab, selectedPageId]);

    useEffect(() => {
        if (selectedChat) {
            apiGetMessages(selectedChat.id).then(setMessages);
            const interval = setInterval(() => {
                apiGetMessages(selectedChat.id).then(setMessages);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [selectedChat]);

    const loadData = async (initial = false) => {
        if (initial) setLoading(true);
        try {
            const [reqs, usrs, ords, prods, sysSettings, allAds, allCats, allDisputes, allChats, cmsPages, sLinks, finPay, gProviders] = await Promise.all([
                apiGetBranchRequests(),
                apiGetUsers(),
                apiGetOrders(UserRole.SUPER_ADMIN),
                apiGetProducts(),
                apiGetSystemSettings(),

                apiGetAllAds(),
                apiGetCategories(),
                apiGetDisputes(),
                user ? apiGetChats(user.uid, UserRole.SUPER_ADMIN) : Promise.resolve([]),
                apiGetAllContentPages(),
                apiGetSocialLinks(),
                apiGetFinancePayments(),
                apiGetGlobalPaymentProviders()
            ]);
            setRequests(reqs);
            setUsers(usrs);
            setOrders(ords);
            setProducts(prods);
            setSettings(sysSettings);

            setAds(allAds);
            setCategories(allCats);
            setDisputes(allDisputes);
            setChats(allChats);
            setAllPages(cmsPages);
            setSocialLinks(sLinks);
            setFinancePayments(finPay);
            setGlobalProviders(gProviders);
            if (cmsPages.length > 0 && !cmsPages.find(p => p.id === selectedPageId)) {
                setSelectedPageId(cmsPages[0].id);
            }
        } catch (e) {
            addToast("Failed to load admin data", 'error');
            console.error(e);
        } finally {
            if (initial) setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        try {
            await apiUpdateUserRole(userId, newRole, null);
            addToast(`User role updated to ${newRole}`, 'success');
            loadData();
        } catch (e) {
            addToast("Failed to update user role", 'error');
        }
    };

    const handleSuspendUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const until = Date.now() + (suspensionForm.days * 24 * 60 * 60 * 1000);
        try {
            await apiUpdateProfile(suspensionForm.userId, {
                suspensionUntil: until,
                suspensionReason: suspensionForm.reason
            });
            await apiCreateNotification({
                userID: suspensionForm.userId,
                title: "Your Shop has been Suspended",
                message: `Suspended until ${new Date(until).toLocaleDateString()}. Reason: ${suspensionForm.reason}`,
                type: 'system'
            });
            addToast(`Shop suspended for ${suspensionForm.days} days`, 'success');
            setShowSuspensionModal(false);
            setSuspensionForm({ userId: '', days: 0, reason: '' });
            loadData();
        } catch (e) {
            addToast("Failed to suspend shop", 'error');
        }
    };

    const handleUnsuspendUser = async (userId: string) => {
        try {
            await apiUpdateProfile(userId, {
                suspensionUntil: 0,
                suspensionReason: ''
            });
            addToast("Shop unsuspended", 'success');
            loadData();
        } catch (e) {
            addToast("Failed to unsuspend shop", 'error');
        }
    };
    const handleUpdateFinanceStatus = async (id: string, status: FinancePayment['status']) => {
        try {
            await apiUpdateFinancePaymentStatus(id, status);
            addToast(`Payment ${status}`, 'success');
            loadData();
        } catch (e) {
            addToast("Failed to update status", 'error');
        }
    };

    const handleUpdateBranchFinance = async (userId: string, data: { taxRate?: number, monthlySubscriptionFee?: number }) => {
        try {
            await apiUpdateProfile(userId, data);
            addToast("Branch finance settings updated", 'success');
            loadData();
        } catch (e) {
            addToast("Failed to update branch finance settings", 'error');
        }
    };

    const loadContentPage = async (pageId: string) => {
        setCmsLoading(true);
        try {
            const page = await apiGetContentPage(pageId);
            setPageContent({ title: page.title, content: page.content });
        } catch (e) {
            addToast("Failed to load page content", 'error');
        } finally {
            setCmsLoading(false);
        }
    };

    const handleRequest = async (id: string, status: RequestStatus) => {
        try {
            await apiUpdateBranchRequestStatus(id, status);
            addToast(`Request ${status}`, 'success');
            loadData();
        } catch (e) {
            addToast("Action failed", 'error');
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) {
            try {
                await apiDeleteUser(uid);
                addToast("User deleted", 'success');
                loadData();
            } catch (e) {
                addToast("Failed to delete user", 'error');
            }
        }
    };

    const handleRevokeBranch = async (uid: string) => {
        if (confirm('Are you sure? This will remove their admin access and branch status.')) {
            try {
                await apiUpdateUserRole(uid, UserRole.USER, null);
                addToast("Branch access revoked", 'success');
                loadData();
            } catch (e) {
                addToast("Failed to revoke access", 'error');
            }
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiUpdateSystemSettings(settings);
            addToast("System settings updated", 'success');
        } catch (e) {
            addToast("Failed to update settings", 'error');
        }
    };





    const handleSaveContent = async (e: React.FormEvent) => {
        e.preventDefault();
        setCmsLoading(true);
        try {
            await apiSaveContentPage(selectedPageId, pageContent);
            addToast("Page updated successfully", 'success');
            const cmsPages = await apiGetAllContentPages();
            setAllPages(cmsPages);
        } catch (e) {
            addToast("Failed to update page", 'error');
        } finally {
            setCmsLoading(false);
        }
    };

    const handleAddPage = async () => {
        const title = prompt("Enter Page Title (e.g., Shipping Policy):");
        if (!title) return;
        const id = title.toLowerCase().replace(/\s+/g, '-');
        try {
            await apiSaveContentPage(id, { title, content: '# ' + title + '\n\nContent goes here...' });
            addToast("Page added", 'success');
            const cmsPages = await apiGetAllContentPages();
            setAllPages(cmsPages);
            setSelectedPageId(id);
        } catch (e) {
            addToast("Failed to add page", 'error');
        }
    };

    const handleDeletePage = async (pageId: string) => {
        if (['about', 'contact', 'privacy', 'terms'].includes(pageId)) {
            addToast("Protected system pages cannot be deleted.", "error");
            return;
        }
        if (confirm(`Are you sure you want to delete the "${pageId}" page?`)) {
            try {
                await apiDeleteContentPage(pageId);
                addToast("Page deleted", 'success');
                const cmsPages = await apiGetAllContentPages();
                setAllPages(cmsPages);
                if (selectedPageId === pageId) {
                    setSelectedPageId(cmsPages[0]?.id || 'about');
                }
            } catch (e) {
                addToast("Failed to delete page", 'error');
            }
        }
    };

    const handleSaveSocialLink = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiSaveSocialLink(socialForm);
            addToast("Social link saved", 'success');
            setShowSocialForm(false);
            setSocialForm({ id: '', platform: '', url: '', enabled: true });
            const sLinks = await apiGetSocialLinks();
            setSocialLinks(sLinks);
        } catch (e) {
            addToast("Failed to save social link", 'error');
        }
    };

    const handleDeleteSocialLink = async (id: string) => {
        if (confirm("Delete this social link?")) {
            try {
                await apiDeleteSocialLink(id);
                addToast("Deleted", 'success');
                const sLinks = await apiGetSocialLinks();
                setSocialLinks(sLinks);
            } catch (e) {
                addToast("Failed to delete", 'error');
            }
        }
    };

    const handleSaveAd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiSaveAd(adForm);
            addToast("Ad saved successfully", 'success');
            setShowAdForm(false);
            setAdForm({ id: '', title: '', imageURL: '', linkURL: '', active: true });
            const updatedAds = await apiGetAllAds();
            setAds(updatedAds);
        } catch (e) {
            addToast("Failed to save ad", 'error');
        }
    };

    const handleDeleteAd = async (id: string) => {
        if (confirm("Are you sure you want to delete this ad?")) {
            try {
                await apiDeleteAd(id);
                addToast("Ad deleted", 'success');
                const updatedAds = await apiGetAllAds();
                setAds(updatedAds);
            } catch (e) {
                addToast("Failed to delete ad", 'error');
            }
        }
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiSaveCategory(categoryForm);
            addToast("Category saved successfully", 'success');
            setShowCategoryForm(false);
            setCategoryForm({ id: '', name: '', imageURL: '' });
            const cats = await apiGetCategories();
            setCategories(cats);
        } catch (e) {
            addToast("Failed to save category", 'error');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (confirm("Delete this category? This will affect shops listed under it.")) {
            try {
                await apiDeleteCategory(id);
                addToast("Category deleted", 'success');
                const cats = await apiGetCategories();
                setCategories(cats);
            } catch (e) {
                addToast("Failed to delete category", 'error');
            }
        }
    };

    const handleResolveDispute = async (id: string) => {
        const resolution = prompt("Enter resolution details (e.g., Refunded, Closed, Item Resent):");
        if (!resolution) return;

        try {
            await apiResolveDispute(id, resolution);
            addToast("Dispute resolved", 'success');
            const disputes = await apiGetDisputes();
            setDisputes(disputes);
        } catch (e) {
            addToast("Failed to resolve dispute", 'error');
        }
    };

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        setBroadcasting(true);
        try {
            await apiBroadcastNotification(broadcastForm.title, broadcastForm.message);
            addToast("Broadcast sent successfully", 'success');
            setBroadcastForm({ title: '', message: '' });
        } catch (e) {
            addToast("Failed to send broadcast", 'error');
        } finally {
            setBroadcasting(false);
        }
    };

    const handleSaveProvider = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiSaveGlobalPaymentProvider(providerForm);
            addToast("Provider saved", "success");
            setShowProviderForm(false);
            setProviderForm({ id: '', name: '', type: 'manual', enabled: true });
            loadData();
        } catch (err) {
            console.error(err);
            addToast("Failed to save provider", "error");
        }
    };

    const handleDeleteProvider = async (id: string) => {
        if (!window.confirm("Delete this provider?")) return;
        try {
            await apiDeleteGlobalPaymentProvider(id);
            addToast("Provider deleted", "success");
            loadData();
        } catch (err) {
            console.error(err);
            addToast("Failed to delete", "error");
        }
    };

    // --- Derived Data ---

    const pendingRequests = requests.filter(r => r.status === RequestStatus.PENDING);
    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const activeBranches = users.filter(u => u.role === UserRole.BRANCH_ADMIN);
    const pendingDisputes = disputes.filter(d => d.status === DisputeStatus.OPEN).length;

    const chartData = activeBranches.map(branch => {
        const revenue = orders
            .filter(o => o.branchID === branch.branchID && o.status !== OrderStatus.CANCELLED)
            .reduce((acc, curr) => acc + curr.totalAmount, 0);
        return {
            name: branch.name ? branch.name.split(' ')[0] : 'Branch',
            revenue,
            fullName: branch.name || 'Unknown Branch'
        };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const getBranchName = (branchId: string) => {
        const branch = users.find(u => u.branchID === branchId && u.role === UserRole.BRANCH_ADMIN);
        return branch ? branch.name : branchId;
    };

    const getUserName = (userId: string) => {
        const user = users.find(u => u.uid === userId);
        return user ? user.name : userId.substring(0, 8);
    };

    const renderOverview = () => (
        <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gray-900 border-none text-white shadow-xl">
                    <div className="mb-2 opacity-70">Total Users</div>
                    <div className="text-3xl font-bold flex items-center gap-2">
                        <Users /> {users.length}
                    </div>
                </Card>
                <Card className="bg-blue-600 dark:bg-blue-600 border-none text-white shadow-xl">
                    <div className="mb-2 opacity-70">Active Branches</div>
                    <div className="text-3xl font-bold flex items-center gap-2">
                        <Store /> {activeBranches.length}
                    </div>
                </Card>
                <Card className="bg-purple-600 dark:bg-purple-600 border-none text-white shadow-xl">
                    <div className="mb-2 opacity-70">Total Platform Sales</div>
                    <div className="text-3xl font-bold flex items-center gap-2">
                        {currency}{totalSales.toLocaleString()}
                    </div>
                </Card>
                <Card className="bg-orange-600 dark:bg-orange-600 border-none text-white shadow-xl">
                    <div className="mb-2 opacity-70">Pending Requests</div>
                    <div className="text-3xl font-bold flex items-center gap-2">
                        <Activity /> {pendingRequests.length}
                    </div>
                </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Activity className="text-orange-500" /> Pending Applications
                    </h2>
                    {pendingRequests.length === 0 ? (
                        <Card className="text-gray-400 py-12 text-center bg-gray-50 dark:bg-slate-800/50 border-dashed border-gray-200 dark:border-slate-700">No pending requests.</Card>
                    ) : (
                        pendingRequests.map(req => (
                            <Card key={req.id} className="border-l-4 border-l-yellow-400">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100">{req.userName}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{req.userEmail}</p>
                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <Badge color="blue">{req.shopCategory || 'General'}</Badge>
                                            <Badge color="gray">{req.country}</Badge>
                                            <Badge color="purple">{req.paymentMethod}</Badge>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border dark:border-slate-700">
                                            <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Payment Details</div>
                                            <p className="text-xs font-mono text-gray-700 dark:text-gray-300">TRX: {req.transactionId || 'N/A'}</p>
                                            {req.screenshotUrl && (
                                                <a
                                                    href={req.screenshotUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-2 inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline"
                                                >
                                                    <ExternalLink size={12} /> View Screenshot
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleRequest(req.id, RequestStatus.APPROVED)}>
                                            Approve
                                        </Button>
                                        <Button size="sm" variant="danger" onClick={() => {
                                            if (window.confirm("Are you sure you want to reject this request?")) {
                                                handleRequest(req.id, RequestStatus.REJECTED);
                                            }
                                        }}>
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <BarChart2 className="text-blue-600" /> Top Performing Branches
                    </h2>
                    <Card className="h-80">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                    <YAxis fontSize={12} tickFormatter={(value) => `${currency}${value}`} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                        formatter={(value: number) => [`${currency}${value.toLocaleString()}`, 'Revenue']}
                                    />
                                    <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">No sales data available yet.</div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );

    const renderBranches = () => {
        const countryGroups = ['Pakistan', 'Dubai', 'India'];

        return (
            <div className="space-y-8 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Branch Management</h2>
                    <Badge color="blue">{activeBranches.length} Active Branches</Badge>
                </div>

                {countryGroups.map(country => {
                    // Filter branches for this country. Handle "Dubai" mapping to "UAE" if necessary, but assuming "Dubai" is stored as country or mapped to it.
                    // The app seems to use "Dubai" in COUNTRIES constant.
                    const countryBranches = activeBranches.filter(b => {
                        const bCountry = (b.branchCountry || b.country || '').toLowerCase();
                        return bCountry.includes(country.toLowerCase()) || (country === 'Dubai' && bCountry.includes('uae'));
                    });

                    if (countryBranches.length === 0) return null;

                    return (
                        <div key={country} className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b pb-2 dark:border-slate-700">
                                <span className="text-3xl">{country === 'Pakistan' ? '🇵🇰' : country === 'India' ? '🇮🇳' : '🇦🇪'}</span> {country}
                            </h3>
                            <Card className="!p-0 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700">
                                            <tr>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Branch Name</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Rating</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Category</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Total Sales</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Total Tax</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Rate</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {countryBranches.map(branch => {
                                                const branchSales = orders.filter(o => o.branchID === branch.branchID).reduce((acc, curr) => acc + curr.totalAmount, 0);
                                                return (
                                                    <tr key={branch.uid} className="border-b dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                        <td className="p-4">
                                                            <div className="font-bold text-gray-900 dark:text-gray-100">{branch.name}</div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">{branch.email}</div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-1 text-yellow-500 font-bold">
                                                                <Star size={14} fill="currentColor" /> {branch.rating ? branch.rating.toFixed(1) : '0.0'}
                                                                <span className="text-gray-400 font-normal">({branch.reviewCount || 0})</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <Badge color="blue">{branch.shopCategory || 'General'}</Badge>
                                                        </td>
                                                        <td className="p-4 font-bold text-green-700 dark:text-green-400">
                                                            {currency}{branchSales.toLocaleString()}
                                                        </td>
                                                        <td className="p-4 font-bold text-orange-600 dark:text-orange-400">
                                                            {(() => {
                                                                const accumulated = orders
                                                                    .filter(o => o.branchID === branch.branchID && o.status !== OrderStatus.CANCELLED)
                                                                    .reduce((acc, curr) => {
                                                                        const rate = branch.taxRate || 0;
                                                                        const tax = curr.taxAmount && curr.taxAmount > 0 ? curr.taxAmount : (curr.totalAmount * (rate / 100));
                                                                        return acc + tax;
                                                                    }, 0);
                                                                const paid = financePayments
                                                                    .filter(p => p.branchID === branch.branchID && p.type === 'tax' && p.status === 'approved')
                                                                    .reduce((acc, p) => acc + p.amount, 0);
                                                                return `${currency}${Math.max(0, accumulated - paid).toLocaleString()}`;
                                                            })()}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="text-xs font-black px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded">{branch.taxRate || 0}%</span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <Button size="sm" variant="danger" onClick={() => handleRevokeBranch(branch.uid)}>
                                                                <ShieldOff size={14} className="mr-1" /> Revoke
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    );
                })}

                {/* Unassigned / Other Branches */}
                {(() => {
                    const otherBranches = activeBranches.filter(b => {
                        const bCountry = (b.branchCountry || b.country || '').toLowerCase();
                        return !bCountry.includes('pakistan') &&
                            !bCountry.includes('india') &&
                            !bCountry.includes('dubai') &&
                            !bCountry.includes('uae');
                    });

                    if (otherBranches.length === 0) return null;

                    return (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b pb-2 dark:border-slate-700">
                                <span className="text-3xl">🌐</span> Others / Unassigned
                            </h3>
                            <Card className="!p-0 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700">
                                            <tr>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Branch Name</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Rating</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Category</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Total Sales</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Total Tax</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Rate</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {otherBranches.map(branch => {
                                                const branchSales = orders.filter(o => o.branchID === branch.branchID).reduce((acc, curr) => acc + curr.totalAmount, 0);
                                                return (
                                                    <tr key={branch.uid} className="border-b dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                        <td className="p-4">
                                                            <div className="font-bold text-gray-900 dark:text-gray-100">{branch.name}</div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">{branch.email}</div>
                                                            {(!branch.branchCountry && !branch.country) && <div className="text-[10px] text-red-500 mt-0.5">No Country</div>}
                                                            {(branch.branchCountry || branch.country) && <div className="text-[10px] text-gray-500 mt-0.5">{branch.branchCountry || branch.country}</div>}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-1 text-yellow-500 font-bold">
                                                                <Star size={14} fill="currentColor" /> {branch.rating ? branch.rating.toFixed(1) : '0.0'}
                                                                <span className="text-gray-400 font-normal">({branch.reviewCount || 0})</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <Badge color="blue">{branch.shopCategory || 'General'}</Badge>
                                                        </td>
                                                        <td className="p-4 font-bold text-green-700 dark:text-green-400">
                                                            {currency}{branchSales.toLocaleString()}
                                                        </td>
                                                        <td className="p-4 font-bold text-orange-600 dark:text-orange-400">
                                                            {(() => {
                                                                const accumulated = orders
                                                                    .filter(o => o.branchID === branch.branchID && o.status !== OrderStatus.CANCELLED)
                                                                    .reduce((acc, curr) => {
                                                                        const rate = branch.taxRate || 0;
                                                                        const tax = curr.taxAmount && curr.taxAmount > 0 ? curr.taxAmount : (curr.totalAmount * (rate / 100));
                                                                        return acc + tax;
                                                                    }, 0);
                                                                const paid = financePayments
                                                                    .filter(p => p.branchID === branch.branchID && p.type === 'tax' && p.status === 'approved')
                                                                    .reduce((acc, p) => acc + p.amount, 0);
                                                                return `${currency}${Math.max(0, accumulated - paid).toLocaleString()}`;
                                                            })()}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="text-xs font-black px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded">{branch.taxRate || 0}%</span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <Button size="sm" variant="danger" onClick={() => handleRevokeBranch(branch.uid)}>
                                                                <ShieldOff size={14} className="mr-1" /> Revoke
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    );
                })()}
            </div>
        );
    };

    const renderUsers = () => {
        const countryGroups = ['Pakistan', 'Dubai', 'India'];

        return (
            <div className="space-y-8 animate-in fade-in">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Management</h2>

                {countryGroups.map(country => {
                    const countryUsers = users.filter(u => {
                        const uCountry = (u.country || '').toLowerCase();
                        return uCountry.includes(country.toLowerCase()) || (country === 'Dubai' && uCountry.includes('uae'));
                    });

                    if (countryUsers.length === 0) return null;

                    return (
                        <div key={country} className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b pb-2 dark:border-slate-700">
                                <span className="text-3xl">{country === 'Pakistan' ? '🇵🇰' : country === 'India' ? '🇮🇳' : '🇦🇪'}</span> {country}
                            </h3>
                            <Card className="!p-0 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700">
                                            <tr>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Email</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Country</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Role</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {countryUsers.map(u => (
                                                <tr key={u.uid} className="border-b dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                    <td className="p-4 font-bold text-gray-900 dark:text-gray-100">{u.name}</td>
                                                    <td className="p-4 text-gray-600 dark:text-gray-400">{u.email}</td>
                                                    <td className="p-4">
                                                        <select
                                                            value={u.country || ''}
                                                            onChange={async (e) => {
                                                                const newCountry = e.target.value;
                                                                try {
                                                                    if (u.role === UserRole.BRANCH_ADMIN && u.branchID) {
                                                                        await apiUpdateBranchCountry(u.uid, u.branchID, newCountry);
                                                                    } else {
                                                                        await apiUpdateProfile(u.uid, { country: newCountry });
                                                                    }
                                                                    addToast("User country updated", "success");
                                                                    loadData();
                                                                } catch (err) {
                                                                    addToast("Failed to update country", "error");
                                                                }
                                                            }}
                                                            className="bg-transparent text-sm border-0 focus:ring-0 cursor-pointer text-gray-700 dark:text-gray-300 font-medium w-32"
                                                        >
                                                            <option value="">None</option>
                                                            {COUNTRIES.map(c => <option key={c} value={c} className="dark:bg-slate-900">{c}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="p-4">
                                                        <select
                                                            value={u.role}
                                                            onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                                                            className="bg-transparent text-sm border-0 focus:ring-0 cursor-pointer text-gray-700 dark:text-gray-300 font-medium capitalize"
                                                        >
                                                            <option value={UserRole.USER} className="dark:bg-slate-900">User</option>
                                                            <option value={UserRole.BRANCH_ADMIN} className="dark:bg-slate-900">Branch Admin</option>
                                                            <option value={UserRole.SUPER_ADMIN} className="dark:bg-slate-900">Super Admin</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-4">
                                                        {u.role === UserRole.BRANCH_ADMIN ? (
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] font-bold text-gray-400">TAX:</span>
                                                                    <input
                                                                        type="number"
                                                                        className="w-16 text-xs bg-gray-50 dark:bg-slate-800 border-0 rounded px-1 py-0.5"
                                                                        defaultValue={u.taxRate || 0}
                                                                        onBlur={(e) => handleUpdateBranchFinance(u.uid, { taxRate: parseFloat(e.target.value) || 0 })}
                                                                    />
                                                                    <span className="text-xs">%</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] font-bold text-gray-400">SUB:</span>
                                                                    <input
                                                                        type="number"
                                                                        className="w-16 text-xs bg-gray-50 dark:bg-slate-800 border-0 rounded px-1 py-0.5"
                                                                        defaultValue={u.monthlySubscriptionFee || 0}
                                                                        onBlur={(e) => handleUpdateBranchFinance(u.uid, { monthlySubscriptionFee: parseFloat(e.target.value) || 0 })}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 italic text-xs">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 font-medium">
                                                        {u.suspensionUntil && u.suspensionUntil > Date.now() ? (
                                                            <Badge color="red">Suspended</Badge>
                                                        ) : (
                                                            <Badge color="green">Active</Badge>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {u.role === UserRole.BRANCH_ADMIN && (
                                                                u.suspensionUntil && u.suspensionUntil > Date.now() ? (
                                                                    <Button size="sm" variant="secondary" onClick={() => handleUnsuspendUser(u.uid)}>Unsuspend</Button>
                                                                ) : (
                                                                    <Button size="sm" variant="secondary" onClick={() => {
                                                                        setSuspensionForm({ ...suspensionForm, userId: u.uid });
                                                                        setShowSuspensionModal(true);
                                                                    }}>Suspend</Button>
                                                                )
                                                            )}
                                                            <Button size="sm" variant="danger" onClick={() => handleDeleteUser(u.uid)} disabled={u.role === UserRole.SUPER_ADMIN}>
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    );
                })}

                {/* Unassigned / Other Users */}
                {(() => {
                    const otherUsers = users.filter(u => {
                        const uCountry = (u.country || '').toLowerCase();
                        return !uCountry.includes('pakistan') &&
                            !uCountry.includes('india') &&
                            !uCountry.includes('dubai') &&
                            !uCountry.includes('uae');
                    });

                    if (otherUsers.length === 0) return null;

                    return (
                        <div key="others" className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b pb-2 dark:border-slate-700">
                                <span className="text-3xl">🌐</span> Others / Unassigned
                            </h3>
                            <Card className="!p-0 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700">
                                            <tr>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Email</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Country</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Role</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {otherUsers.map(u => (
                                                <tr key={u.uid} className="border-b dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                    <td className="p-4 font-bold text-gray-900 dark:text-gray-100">{u.name}</td>
                                                    <td className="p-4 text-gray-600 dark:text-gray-400">{u.email}</td>
                                                    <td className="p-4">
                                                        <select
                                                            value={u.country || ''}
                                                            onChange={async (e) => {
                                                                const newCountry = e.target.value;
                                                                try {
                                                                    if (u.role === UserRole.BRANCH_ADMIN && u.branchID) {
                                                                        await apiUpdateBranchCountry(u.uid, u.branchID, newCountry);
                                                                    } else {
                                                                        await apiUpdateProfile(u.uid, { country: newCountry });
                                                                    }
                                                                    addToast("User country updated", "success");
                                                                    loadData();
                                                                } catch (err) {
                                                                    addToast("Failed to update country", "error");
                                                                }
                                                            }}
                                                            className="bg-transparent text-sm border-0 focus:ring-0 cursor-pointer text-gray-700 dark:text-gray-300 font-medium w-32"
                                                        >
                                                            <option value="">None</option>
                                                            {COUNTRIES.map(c => <option key={c} value={c} className="dark:bg-slate-900">{c}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="p-4">
                                                        <select
                                                            value={u.role}
                                                            onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                                                            className="bg-transparent text-sm border-0 focus:ring-0 cursor-pointer text-gray-700 dark:text-gray-300 font-medium capitalize"
                                                        >
                                                            <option value={UserRole.USER} className="dark:bg-slate-900">User</option>
                                                            <option value={UserRole.BRANCH_ADMIN} className="dark:bg-slate-900">Branch Admin</option>
                                                            <option value={UserRole.SUPER_ADMIN} className="dark:bg-slate-900">Super Admin</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-4">
                                                        {u.role === UserRole.BRANCH_ADMIN ? (
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] font-bold text-gray-400">TAX:</span>
                                                                    <input
                                                                        type="number"
                                                                        className="w-16 text-xs bg-gray-50 dark:bg-slate-800 border-0 rounded px-1 py-0.5"
                                                                        defaultValue={u.taxRate || 0}
                                                                        onBlur={(e) => handleUpdateBranchFinance(u.uid, { taxRate: parseFloat(e.target.value) || 0 })}
                                                                    />
                                                                    <span className="text-xs">%</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] font-bold text-gray-400">SUB:</span>
                                                                    <input
                                                                        type="number"
                                                                        className="w-16 text-xs bg-gray-50 dark:bg-slate-800 border-0 rounded px-1 py-0.5"
                                                                        defaultValue={u.monthlySubscriptionFee || 0}
                                                                        onBlur={(e) => handleUpdateBranchFinance(u.uid, { monthlySubscriptionFee: parseFloat(e.target.value) || 0 })}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 italic text-xs">N/A</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 font-medium">
                                                        {u.suspensionUntil && u.suspensionUntil > Date.now() ? (
                                                            <Badge color="red">Suspended</Badge>
                                                        ) : (
                                                            <Badge color="green">Active</Badge>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {u.role === UserRole.BRANCH_ADMIN && (
                                                                u.suspensionUntil && u.suspensionUntil > Date.now() ? (
                                                                    <Button size="sm" variant="secondary" onClick={() => handleUnsuspendUser(u.uid)}>Unsuspend</Button>
                                                                ) : (
                                                                    <Button size="sm" variant="secondary" onClick={() => {
                                                                        setSuspensionForm({ ...suspensionForm, userId: u.uid });
                                                                        setShowSuspensionModal(true);
                                                                    }}>Suspend</Button>
                                                                )
                                                            )}
                                                            <Button size="sm" variant="danger" onClick={() => handleDeleteUser(u.uid)} disabled={u.role === UserRole.SUPER_ADMIN}>
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    );
                })()}

                {/* Global Suspension Modal */}
                {showSuspensionModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                        <Card className="w-full max-w-md p-6 animate-in zoom-in-95">
                            <h3 className="text-xl font-bold mb-4 dark:text-white">Suspend Shop</h3>
                            <form onSubmit={handleSuspendUser} className="space-y-4">
                                <Input label="Suspension Duration (Days)" type="number" value={suspensionForm.days} onChange={e => setSuspensionForm({ ...suspensionForm, days: parseInt(e.target.value) || 0 })} min="1" required />
                                <div className="flex flex-col">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Suspension</label>
                                    <textarea className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100" rows={3} value={suspensionForm.reason} onChange={e => setSuspensionForm({ ...suspensionForm, reason: e.target.value })} placeholder="Explain why the shop is being suspended..." required />
                                </div>
                                <div className="flex gap-3 justify-end mt-6">
                                    <Button type="button" variant="secondary" onClick={() => setShowSuspensionModal(false)}>Cancel</Button>
                                    <Button type="submit" variant="danger">Confirm Suspension</Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )}
            </div>
        );
    };

    const renderOrders = () => {
        const filteredOrders = orders.filter(o =>
            (orderStatusFilter === 'all' || o.status === orderStatusFilter) &&
            (orderBranchFilter === 'all' || o.branchID === orderBranchFilter) &&
            (orderSearch ? o.id.toLowerCase().includes(orderSearch.toLowerCase()) || getUserName(o.userID).toLowerCase().includes(orderSearch.toLowerCase()) : true)
        );

        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex flex-col md:flex-row justify-between gap-4 items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Global Orders</h2>
                    <div className="flex gap-2">
                        <Input placeholder="Search Order ID or User" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} containerClassName="mb-0 w-64" className="py-1.5" />
                        <Select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)} containerClassName="mb-0 !w-40" className="!py-1.5 text-sm">
                            <option value="all">All Status</option>
                            <option value={OrderStatus.PENDING}>Pending</option>
                            <option value={OrderStatus.COMPLETED}>Completed</option>
                            <option value={OrderStatus.CANCELLED}>Cancelled</option>
                        </Select>
                    </div>
                </div>
                <Card className="!p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700">
                                <tr>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">ID</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Branch</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Total</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map(o => (
                                    <tr key={o.id} className="border-b dark:border-slate-700 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">{o.id.slice(0, 8)}</td>
                                        <td className="p-4 text-gray-600 dark:text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                                        <td className="p-4 text-gray-900 dark:text-gray-100">{getUserName(o.userID)}</td>
                                        <td className="p-4"><Badge color="blue">{getBranchName(o.branchID)}</Badge></td>
                                        <td className="p-4 font-bold text-gray-900 dark:text-gray-100">{currency}{o.totalAmount}</td>
                                        <td className="p-4"><Badge color={o.status === OrderStatus.COMPLETED ? 'green' : o.status === OrderStatus.PENDING ? 'yellow' : 'red'}>{o.status}</Badge></td>
                                    </tr>
                                ))}
                                {filteredOrders.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No orders found matching criteria.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    };

    const renderDisputes = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dispute Resolution</h2>
                <Badge color="red">{disputes.filter(d => d.status === DisputeStatus.OPEN).length} Open</Badge>
            </div>
            <div className="grid gap-4">
                {disputes.map(dispute => (
                    <Card key={dispute.id} className="border-l-4 border-l-red-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge color={dispute.status === DisputeStatus.OPEN ? 'red' : 'green'}>{dispute.status.toUpperCase()}</Badge>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">Order: #{dispute.orderID.slice(0, 8)}</span>
                                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Branch: {getBranchName(dispute.branchID)}</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">User: {getUserName(dispute.userID)}</span>
                                </div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-100">{dispute.reason}</h4>
                                <p className="text-gray-600 dark:text-gray-400 mt-1">{dispute.description}</p>
                                {dispute.resolution && (
                                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm rounded border border-green-100 dark:border-green-800">
                                        <strong>Resolution:</strong> {dispute.resolution}
                                    </div>
                                )}
                            </div>
                            {dispute.status === DisputeStatus.OPEN && (
                                <Button size="sm" onClick={() => handleResolveDispute(dispute.id)}>Resolve</Button>
                            )}
                        </div>
                    </Card>
                ))}
                {disputes.length === 0 && <Card className="text-center py-10 text-gray-400">No disputes found.</Card>}
            </div>
        </div>
    );

    const renderBroadcast = () => (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100"><Radio className="text-blue-600 dark:text-blue-400" /> System Broadcast</h2>
            <Card className="p-6">
                <form onSubmit={handleBroadcast} className="space-y-4">
                    <Input label="Title" value={broadcastForm.title} onChange={e => setBroadcastForm({ ...broadcastForm, title: e.target.value })} placeholder="Maintenance Alert" required />
                    <Textarea
                        label="Message"
                        value={broadcastForm.message}
                        onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                        placeholder="We will be undergoing scheduled maintenance..."
                        rows={4}
                        required
                    />
                    <Button type="submit" className="w-full" isLoading={broadcasting}>
                        <Send size={18} className="mr-2" /> Send Broadcast
                    </Button>
                </form>
            </Card>
        </div>
    );

    const renderSettings = () => (
        <div className="space-y-8 animate-in fade-in">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Platform Settings</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* System Config */}
                <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100"><Settings size={18} /> General Config</h3>
                    <form onSubmit={handleSaveSettings} className="space-y-4">
                        <Input label="Platform Name" value={settings.platformName} onChange={e => setSettings({ ...settings, platformName: e.target.value })} />
                        <Input label="Branch Setup Fee (PKR)" type="number" value={settings.branchSetupFee} onChange={e => setSettings({ ...settings, branchSetupFee: parseInt(e.target.value) })} />
                        <div className="flex items-center gap-2">
                            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={settings.maintenanceMode} onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked })} id="maint" />
                            <label htmlFor="maint" className="text-sm font-medium text-gray-700 dark:text-gray-300">Maintenance Mode</label>
                        </div>
                        <Button type="submit">Save Settings</Button>
                    </form>
                </Card>

                {/* Payment Gateway Config */}
                <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100"><CreditCard size={18} /> Payment Gateway API Keys</h3>
                    <form onSubmit={handleSaveSettings} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Stripe Public Key" value={settings.stripePublicKey} onChange={e => setSettings({ ...settings, stripePublicKey: e.target.value })} />
                            <Input label="Stripe Secret Key" type="password" value={settings.stripeSecretKey} onChange={e => setSettings({ ...settings, stripeSecretKey: e.target.value })} />
                        </div>
                        <div className="mt-4 pt-4 border-t dark:border-slate-800">
                            <h4 className="text-sm font-bold text-gray-500 mb-4">JazzCash Credentials</h4>
                            <Input label="Merchant ID" value={settings.jazzCashMerchantID} onChange={e => setSettings({ ...settings, jazzCashMerchantID: e.target.value })} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Password" type="password" value={settings.jazzCashPassword} onChange={e => setSettings({ ...settings, jazzCashPassword: e.target.value })} />
                                <Input label="Integrity Salt" type="password" value={settings.jazzCashIntegritySalt} onChange={e => setSettings({ ...settings, jazzCashIntegritySalt: e.target.value })} />
                            </div>
                        </div>
                        <Button type="submit" className="w-full">Save Gateway Config</Button>
                    </form>
                </Card>
            </div>

            {/* New Country-Wise Payment Configuration */}
            <div className="animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Banknote className="text-green-600" /> Country-Wise Payment Rules
                </h2>
                <CountryPaymentSettings />
            </div>


        </div >
    );

    const renderContent = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {selectedPageId && (
                        <button onClick={() => setSelectedPageId(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <FileText size={24} className="text-blue-600 dark:text-blue-400" />
                        {selectedPageId ? 'Edit Page Content' : 'Content Management'}
                    </h2>
                </div>
                {!selectedPageId && (
                    <Button onClick={handleAddPage} size="sm"><Plus size={16} className="mr-2" /> Add New Page</Button>
                )}
            </div>

            {selectedPageId ? (
                <Card className="flex-1 p-6">
                    {cmsLoading ? <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-blue-600" /></div> : (
                        <form onSubmit={handleSaveContent} className="space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">
                                    Editing: <span className="text-blue-600 dark:text-blue-400">{pageContent.title}</span>
                                </h3>
                                {['about', 'contact', 'privacy', 'terms'].includes(selectedPageId) && (
                                    <Badge color="yellow">System Page</Badge>
                                )}
                            </div>

                            <Input
                                label="Page Title"
                                value={pageContent.title}
                                onChange={e => setPageContent({ ...pageContent, title: e.target.value })}
                                disabled={['about', 'contact', 'privacy', 'terms'].includes(selectedPageId)} // Lock title for system pages to prevent breaking links
                            />

                            <Textarea
                                label="Content (Markdown supported)"
                                value={pageContent.content}
                                onChange={e => setPageContent({ ...pageContent, content: e.target.value })}
                                className="h-96 font-mono text-sm leading-relaxed"
                                placeholder="# Heading&#10;Write your content here..."
                            />

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-slate-800">
                                <span className="text-xs text-gray-400">
                                    {['about', 'contact', 'privacy', 'terms'].includes(selectedPageId)
                                        ? "Note: Title cannot be changed for system pages."
                                        : ""}
                                </span>
                                <div className="flex gap-3">
                                    <Button type="button" variant="secondary" onClick={() => setSelectedPageId(null)}>Cancel</Button>
                                    <Button type="submit"><Save size={16} className="mr-2" /> Save Changes</Button>
                                </div>
                            </div>
                        </form>
                    )}
                </Card>
            ) : (
                <div className="space-y-8">
                    {/* System Pages Section */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 px-1 border-l-4 border-blue-500 pl-3">Core Platform Pages</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {(allPages.length > 0 ? allPages.filter(p => ['about', 'contact', 'privacy', 'terms'].includes(p.id)) : [
                                { id: 'about', title: 'About Us', content: '' },
                                { id: 'contact', title: 'Contact Support', content: '' },
                                { id: 'privacy', title: 'Privacy Policy', content: '' },
                                { id: 'terms', title: 'Terms of Service', content: '' }
                            ]).map(page => (
                                <Card
                                    key={page.id}
                                    className="group hover:shadow-lg transition-all cursor-pointer border-t-4 border-t-gray-200 hover:border-t-blue-500 dark:border-t-slate-700 dark:hover:border-t-blue-500"
                                    onClick={() => setSelectedPageId(page.id)}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
                                            {page.id === 'about' && <Users size={24} />}
                                            {page.id === 'contact' && <Phone size={24} />}
                                            {page.id === 'privacy' && <ShieldCheck size={24} />}
                                            {page.id === 'terms' && <FileText size={24} />}
                                        </div>
                                        <div className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
                                            <Edit2 size={16} />
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1">{page.title}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                        Manage content for {page.title}.
                                    </p>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Custom Pages Section */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 px-1 border-l-4 border-purple-500 pl-3">Custom Pages</h3>

                        {allPages.filter(p => !['about', 'contact', 'privacy', 'terms'].includes(p.id)).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {allPages.filter(p => !['about', 'contact', 'privacy', 'terms'].includes(p.id)).map(page => (
                                    <Card key={page.id} className="group hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="font-bold text-gray-900 dark:text-gray-100 truncate pr-4">{page.title}</div>
                                            <div className="flex gap-1 opacity-100">
                                                <button
                                                    onClick={() => setSelectedPageId(page.id)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePage(page.id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-400 font-mono bg-gray-50 dark:bg-slate-900 p-2 rounded truncate">
                                            /page/{page.id}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-gray-50 dark:bg-slate-900/50 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl p-8 text-center">
                                <p className="text-gray-500 dark:text-gray-400">No custom pages added yet.</p>
                                <Button variant="outline" size="sm" onClick={handleAddPage} className="mt-4">Create Your First Page</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderAds = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Ad Banners</h2>
                <Button onClick={() => setShowAdForm(!showAdForm)}><Plus size={16} className="mr-2" /> New Ad</Button>
            </div>

            {showAdForm && (
                <Card className="bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700">
                    <form onSubmit={handleSaveAd} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Title" value={adForm.title} onChange={e => setAdForm({ ...adForm, title: e.target.value })} required />
                            <Input label="Link URL" value={adForm.linkURL} onChange={e => setAdForm({ ...adForm, linkURL: e.target.value })} required />
                        </div>
                        <Input label="Image URL" value={adForm.imageURL} onChange={e => setAdForm({ ...adForm, imageURL: e.target.value })} required />
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="secondary" onClick={() => setShowAdForm(false)}>Cancel</Button>
                            <Button type="submit">Save Ad</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ads.map(ad => (
                    <Card key={ad.id} className="group !p-0 overflow-hidden relative">
                        <img src={ad.imageURL} alt={ad.title} className="w-full h-48 object-cover" />
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDeleteAd(ad.id)} className="p-2 bg-white text-red-500 rounded-full shadow hover:bg-red-50"><Trash2 size={16} /></button>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100">{ad.title}</h3>
                            <p className="text-xs text-blue-600 dark:text-blue-400 truncate">{ad.linkURL}</p>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );

    const renderCategories = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Categories & Tax Control</h2>
                <Button onClick={() => setShowCategoryForm(!showCategoryForm)}><Plus size={16} className="mr-2" /> New Category</Button>
            </div>

            {showCategoryForm && (
                <Card className="bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700 p-6">
                    <form onSubmit={handleSaveCategory} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="Name" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
                            <Input label="Image URL" value={categoryForm.imageURL} onChange={e => setCategoryForm({ ...categoryForm, imageURL: e.target.value })} required />
                            <Input label="Tax Rate (%)" type="number" step="0.01" value={categoryForm.taxRate || 0} onChange={e => setCategoryForm({ ...categoryForm, taxRate: parseFloat(e.target.value) || 0 })} required />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="secondary" onClick={() => setShowCategoryForm(false)}>Cancel</Button>
                            <Button type="submit">Save Category</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map(cat => (
                    <Card key={cat.id} className="group relative hover:shadow-md transition-all border border-gray-100 dark:border-slate-800 p-4">
                        <div className="flex flex-col items-center text-center gap-3">
                            <img src={cat.imageURL} alt={cat.name} className="w-20 h-20 rounded-xl object-cover bg-gray-100 dark:bg-slate-900" />
                            <div>
                                <div className="font-bold text-gray-900 dark:text-gray-100">{cat.name}</div>
                                <div className="flex flex-col gap-1 mt-1">
                                    <Badge color="blue">{cat.productCount || 0} Products</Badge>
                                    <Badge color="orange">{cat.taxRate || 0}% Tax</Badge>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setCategoryForm(cat); setShowCategoryForm(true); }} className="p-1.5 bg-white dark:bg-slate-800 text-blue-500 rounded-full shadow hover:bg-blue-50"><Edit2 size={12} /></button>
                            <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 bg-white dark:bg-slate-800 text-red-500 rounded-full shadow hover:bg-red-50"><Trash2 size={12} /></button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
    const renderFinance = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Branch Finance & Tax Approval</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30">
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Total Pending Payments</p>
                    <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                        {financePayments.filter(p => p.status === 'pending').length}
                    </h3>
                </Card>
                <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30">
                    <p className="text-sm text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">Approved Total</p>
                    <h3 className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                        {currency}{financePayments.filter(p => p.status === 'approved').reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                    </h3>
                </Card>
            </div>
            <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700">
                            <tr>
                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Branch</th>
                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Type</th>
                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Trx ID</th>
                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                                <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {financePayments.sort((a, b) => b.createdAt - a.createdAt).map(p => (
                                <tr key={p.id} className="border-b dark:border-slate-800 last:border-0">
                                    <td className="p-4 text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4 font-bold">{p.branchName}</td>
                                    <td className="p-4 capitalize"><Badge color={p.type === 'tax' ? 'orange' : 'purple'}>{p.type}</Badge></td>
                                    <td className="p-4 font-bold">{currency}{p.amount}</td>
                                    <td className="p-4"><code className="bg-gray-100 px-2 py-1 rounded text-xs">{p.trxID}</code></td>
                                    <td className="p-4"><Badge color={p.status === 'approved' ? 'green' : p.status === 'rejected' ? 'red' : 'yellow'}>{p.status}</Badge></td>
                                    <td className="p-4 text-right">
                                        {p.status === 'pending' && (
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" onClick={() => handleUpdateFinanceStatus(p.id, 'approved')}>Approve</Button>
                                                <Button size="sm" variant="danger" onClick={() => handleUpdateFinanceStatus(p.id, 'rejected')}>Reject</Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );

    const renderMessages = () => (
        <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-[70vh] overflow-hidden animate-in fade-in">
            {/* Chat List */}
            <div className="w-1/3 border-r border-gray-100 dark:border-slate-700 flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <MessageSquare size={18} className="text-blue-600 dark:text-blue-400" /> Support Chats
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto dark:bg-slate-900/20">
                    {chats.map(chat => (
                        <button
                            key={chat.id}
                            onClick={async () => {
                                setSelectedChat(chat);
                                await apiResetChatUnread(chat.id);
                                loadChats();
                            }}
                            className={`w-full p-4 flex flex-col items-start gap-1 border-b border-gray-50 dark:border-slate-700 transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-900/20 ${selectedChat?.id === chat.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-600' : ''}`}
                        >
                            <div className="flex justify-between w-full items-center">
                                <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                                    {chat.branchName || chat.userName || 'Unknown'}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                    {new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="flex justify-between w-full items-center gap-2">
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate text-left w-full">
                                    {chat.lastMessage || 'No messages yet'}
                                </p>
                                {(chat.unreadCount || 0) > 0 && (
                                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                        {chat.unreadCount}
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                    {chats.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">No support conversations yet.</div>
                    )}
                </div>
            </div>

            {/* Message Window */}
            <div className="flex-1 flex flex-col bg-gray-50/30 dark:bg-slate-900/30">
                {selectedChat ? (
                    <>
                        <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-between items-center shadow-sm">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100">
                                    {selectedChat.branchName || selectedChat.userName || 'Unknown'}
                                </h3>
                                <p className="text-[10px] text-green-500 font-medium">Online</p>
                            </div>
                            <Button size="sm" variant="secondary" onClick={() => setSelectedChat(null)}>
                                <X size={16} />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map(msg => {
                                const isMe = msg.senderID === user?.uid;
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-slate-700 rounded-tl-none'}`}>
                                            <p>{msg.text}</p>
                                            <span className={`text-[9px] block mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!newMessage.trim() || !selectedChat) return;
                            const msg: Omit<ChatMessage, 'id'> = {
                                senderID: user!.uid,
                                senderName: user!.name || 'Super Admin',
                                text: newMessage.trim(),
                                timestamp: Date.now(),
                                read: false
                            };
                            setNewMessage('');
                            await apiSendMessage(selectedChat.id, msg);
                            apiGetMessages(selectedChat.id).then(setMessages);
                        }} className="p-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                />
                                <Button type="submit" className="rounded-full w-10 h-10 p-0 flex items-center justify-center">
                                    <Sparkles size={18} />
                                </Button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 gap-3">
                        <div className="p-4 bg-gray-100 dark:bg-slate-800 rounded-full">
                            <MessageSquare size={32} />
                        </div>
                        <p className="font-medium">Select a support chat to reply</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderSocial = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Social Media Links</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">These links will appear in the platform footer.</p>
                </div>
                <Button onClick={() => setShowSocialForm(true)}><Plus size={16} className="mr-2" /> Add Link</Button>
            </div>

            {showSocialForm && (
                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 p-6 animate-in slide-in-from-top-2">
                    <form onSubmit={handleSaveSocialLink} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <Input label="Platform Name" value={socialForm.platform} onChange={e => setSocialForm({ ...socialForm, platform: e.target.value })} placeholder="e.g. Facebook, TikTok" required />
                        <Input label="URL" value={socialForm.url} onChange={e => setSocialForm({ ...socialForm, url: e.target.value })} placeholder="https://..." required />
                        <div className="flex gap-2">
                            <Button type="submit">Save Link</Button>
                            <Button variant="secondary" onClick={() => setShowSocialForm(false)}>Cancel</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {socialLinks.map(link => (
                    <Card key={link.id} className="p-4 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-blue-600">
                                <LinkIcon size={18} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-gray-100">{link.platform}</h4>
                                <p className="text-xs text-gray-500 truncate max-w-[150px]">{link.url}</p>
                            </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setSocialForm(link); setShowSocialForm(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"><Edit2 size={16} /></button>
                            <button onClick={() => handleDeleteSocialLink(link.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={16} /></button>
                        </div>
                    </Card>
                ))}
                {socialLinks.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed rounded-xl">
                        No social media links added yet.
                    </div>
                )}
            </div>
        </div>
    );

    const renderGlobalPayments = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Global Payment Providers</h2>
                <Button onClick={() => setShowProviderForm(true)}><Plus size={16} className="mr-2" /> Add Provider</Button>
            </div>

            {showProviderForm && (
                <Card className="p-6 bg-blue-50 dark:bg-blue-900/20">
                    <form onSubmit={handleSaveProvider} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Provider Name" value={providerForm.name} onChange={e => setProviderForm({ ...providerForm, name: e.target.value })} placeholder="Easypaisa, JazzCash, etc." required />
                            <Select label="Type" value={providerForm.type} onChange={e => setProviderForm({ ...providerForm, type: e.target.value as any })}>
                                <option value="manual">Manual (Slip Required)</option>
                                <option value="cod">Cash on Delivery</option>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit">Save Provider</Button>
                            <Button variant="secondary" onClick={() => setShowProviderForm(false)}>Cancel</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {globalProviders.map(provider => (
                    <Card key={provider.id} className="p-6 relative group overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-600/10 rounded-xl text-blue-600">
                                <CreditCard size={24} />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setProviderForm(provider); setShowProviderForm(true); }} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit2 size={16} /></button>
                                <button onClick={() => handleDeleteProvider(provider.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{provider.name}</h3>
                        <Badge color={provider.type === 'manual' ? 'blue' : 'green'}>{provider.type.toUpperCase()}</Badge>
                    </Card>
                ))}
            </div>
        </div>
    );

    if (loading) return <div className="h-[80vh] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>;

    return (
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 min-h-[80vh]">
            {/* Sidebar */}
            <div className="w-full md:w-64 flex-shrink-0">
                <Card className="sticky top-20 md:top-24 p-2 flex md:flex-col gap-1 overflow-x-auto no-scrollbar md:overflow-visible shadow-sm md:shadow-md border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                    <button onClick={() => setActiveTab('overview')} className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Activity size={18} /> <span>Overview</span>
                    </button>
                    <button onClick={() => setActiveTab('branches')} className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'branches' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Store size={18} /> <span>Branches</span>
                    </button>
                    <button onClick={() => setActiveTab('users')} className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Users size={18} /> <span>Users</span>
                    </button>
                    <button onClick={() => setActiveTab('orders')} className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <ClipboardList size={18} /> <span>Orders</span>
                    </button>
                    <button onClick={() => setActiveTab('finance')} className={`flex-shrink-0 md:w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'finance' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <div className="flex items-center gap-3">
                            <Wallet size={18} /> <span>Finance</span>
                        </div>
                        {financePayments.filter(p => p.status === 'pending').length > 0 && (
                            <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                {financePayments.filter(p => p.status === 'pending').length}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('disputes')} className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'disputes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <AlertTriangle size={18} /> <span>Disputes</span>
                    </button>
                    <button onClick={() => setActiveTab('categories')} className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'categories' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Layers size={18} /> <span>Categories</span>
                    </button>
                    <button onClick={() => setActiveTab('content')} className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'content' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <FileText size={18} /> <span>Content</span>
                    </button>
                    <button onClick={() => setActiveTab('ads')} className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'ads' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Sparkles size={18} /> <span>Ads</span>
                    </button>
                    <button onClick={() => setActiveTab('social')} className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'social' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <LinkIcon size={18} /> <span>Social</span>
                    </button>
                    <button onClick={() => setActiveTab('globalPayments')} className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'globalPayments' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Banknote size={18} /> <span>Payment Providers</span>
                    </button>
                    <button onClick={() => setActiveTab('broadcast')} className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'broadcast' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Megaphone size={18} /> <span>Broadcast</span>
                    </button>
                    <button onClick={() => setActiveTab('messages')} className={`flex-shrink-0 md:w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'messages' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <div className="flex items-center gap-3">
                            <MessageSquare size={18} /> <span>Messages</span>
                        </div>
                        {chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0) > 0 && (
                            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                {chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0)}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <Settings size={18} /> <span>Settings</span>
                    </button>
                </Card>
            </div>

            <div className="flex-1 overflow-x-hidden">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'branches' && renderBranches()}
                {activeTab === 'users' && renderUsers()}
                {activeTab === 'orders' && renderOrders()}
                {activeTab === 'finance' && renderFinance()}
                {activeTab === 'disputes' && renderDisputes()}
                {activeTab === 'broadcast' && renderBroadcast()}
                {activeTab === 'settings' && renderSettings()}
                {activeTab === 'content' && renderContent()}
                {activeTab === 'ads' && renderAds()}
                {activeTab === 'categories' && renderCategories()}
                {activeTab === 'social' && renderSocial()}
                {activeTab === 'messages' && renderMessages()}
                {activeTab === 'globalPayments' && renderGlobalPayments()}
            </div>
        </div>
    );
};

