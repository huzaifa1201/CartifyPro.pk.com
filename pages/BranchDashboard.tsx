
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    apiGetProducts,
    apiSaveProduct,
    apiDeleteProduct,
    apiGetOrders,
    apiUpdateOrderStatus,
    apiCreateNotification,
    apiGetCoupons,
    apiSaveCoupon,
    apiDeleteCoupon,
    apiGetInventoryLogs,
    apiAddInventoryLog,
    apiGetChats,
    apiGetMessages,
    apiSendMessage,
    apiAddBranchSubCategory,
    apiRemoveBranchSubCategory,
    apiUpgradePlan,
    apiGetDisputesByBranch,
    apiReplyToDispute,
    apiResetChatUnread,
    apiGetCategories,
    apiGetFinancePayments,
    apiSubmitFinancePayment,
    apiGetPlatformPaymentAccounts,
    apiGetUsers,
    apiInitChat
} from '../services/api';
import { Product, Order, OrderStatus, Coupon, InventoryLog, Chat, ChatMessage, UserRole, ProductVariant, Dispute, DisputeStatus, Category, FinancePayment, PlatformPaymentAccount } from '../types';
import { Card, Button, Input, Badge, Textarea, Select } from '../components/UI';
import { Plus, Trash2, Edit2, Package, TrendingUp, DollarSign, CheckCircle, Truck, RefreshCw, History, X, UploadCloud, FileSpreadsheet, AlertTriangle, Share2, Copy, ExternalLink, LayoutDashboard, ShoppingBag, ClipboardList, Users, Settings, Search, Filter, Ticket, MessageSquare, Printer, Calendar, BarChart2, Layers, Crown, Sparkles, Tag, Banknote, ShieldOff, Wallet, CreditCard, Eye, User as UserIcon, MapPin } from 'lucide-react';
import { getCurrency } from '../constants';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

export const BranchDashboard: React.FC = () => {
    const { user, refreshProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const currency = getCurrency(user?.branchCountry || user?.country);

    // View State
    const [activeView, setActiveView] = useState<'overview' | 'products' | 'categories' | 'orders' | 'coupons' | 'messages' | 'analytics' | 'reports' | 'finance'>('overview');

    // Data State
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [financePayments, setFinancePayments] = useState<FinancePayment[]>([]);
    const [platformAccounts, setPlatformAccounts] = useState<PlatformPaymentAccount[]>([]);
    const [loading, setLoading] = useState(false);

    // Filtering & Search
    const [productSearch, setProductSearch] = useState('');
    const [orderFilter, setOrderFilter] = useState<string>('all');

    // Modals & Editing
    const [isEditing, setIsEditing] = useState(false);
    const [selectedOrderHistory, setSelectedOrderHistory] = useState<Order | null>(null);
    const [showLogs, setShowLogs] = useState(false);
    const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
    const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);

    // Coupon Form
    const [isEditingCoupon, setIsEditingCoupon] = useState(false);
    const [couponForm, setCouponForm] = useState<Coupon>({
        id: '',
        code: '',
        branchID: '',
        discountType: 'fixed',
        value: 0,
        minOrderAmount: 0,
        expiryDate: '',
        isActive: true,
        usageCount: 0,
        usageLimit: 0
    });

    // Chat State
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');

    // Category State
    const [subCatInput, setSubCatInput] = useState('');
    const [catLoading, setCatLoading] = useState(false);

    // Product Form
    const initialForm: Product = { id: '', name: '', price: 0, salePrice: undefined, description: '', imageURL: '', category: '', stock: 0, branchID: user?.branchID || '', variants: [], isNewArrival: false };
    const [form, setForm] = useState<Product>(initialForm);
    const [initialStock, setInitialStock] = useState(0);

    // Variant Input State
    const [newVariant, setNewVariant] = useState<Partial<ProductVariant>>({ color: '', size: 'M', price: 0, stock: 0, imageURL: '', description: '' });

    const isSuspended = user?.suspensionUntil && user.suspensionUntil > Date.now();

    useEffect(() => {
        if (user?.branchID) {
            loadData();
            // Periodic check for new orders and messages
            const interval = setInterval(() => {
                loadData();
                if (activeView === 'messages') loadChats();
                refreshProfile(true); // Silent refresh to detect suspension status changes without UI flicker
            }, 5000); // Poll every 5s for faster real-time updates (tax, status, messages)
            return () => clearInterval(interval);
        }
    }, [user?.branchID, activeView, refreshProfile]);

    useEffect(() => {
        if (isSuspended) {
            const poll = setInterval(() => {
                refreshProfile(true);
            }, 5000); // Extra polling when suspended for instant unlock
            return () => clearInterval(poll);
        }
    }, [isSuspended, refreshProfile]);

    useEffect(() => {
        if (isEditing && user?.branchID) {
            apiGetInventoryLogs(user.branchID).then(setInventoryLogs);
        }
    }, [isEditing]);

    useEffect(() => {
        if (activeView === 'messages' && user?.branchID) {
            loadChats();
        }
    }, [activeView]);

    useEffect(() => {
        if (selectedChat) {
            apiGetMessages(selectedChat.id).then(setMessages);
            const interval = setInterval(() => {
                apiGetMessages(selectedChat.id).then(setMessages);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [selectedChat]);

    const loadData = async () => {
        try {
            const [allProducts, branchOrders, branchCoupons, branchDisputes, allCats, allFinPayments, sysPayments] = await Promise.all([
                apiGetProducts(),
                apiGetOrders(user!.role, undefined, user?.branchID || undefined),
                user?.branchID ? apiGetCoupons(user.branchID) : Promise.resolve([]),
                user?.branchID ? apiGetDisputesByBranch(user.branchID) : Promise.resolve([]),
                apiGetCategories(),
                apiGetFinancePayments(),
                apiGetPlatformPaymentAccounts(user?.country?.toLowerCase() || 'pakistan', true)
            ]);
            setProducts(allProducts.filter(p => p.branchID === user?.branchID));
            setOrders(branchOrders);
            setCoupons(branchCoupons);
            setDisputes(branchDisputes);
            setCategories(allCats);
            setFinancePayments(allFinPayments.filter(p => p.branchID === user?.branchID));
            setPlatformAccounts(sysPayments);
        } catch (e) {
            addToast("Failed to load dashboard data", 'error');
        }
    };

    const loadChats = async () => {
        if (!user) return;
        const data = await apiGetChats(user.uid, user.role, user.branchID || undefined);
        setChats(data);
    }

    const handleReplyToReport = async (disputeId: string, reply: string, userId: string) => {
        if (!reply.trim()) return;
        try {
            await apiReplyToDispute(disputeId, reply, userId);
            addToast("Response sent to customer", 'success');
            loadData();
        } catch (e) {
            addToast("Failed to send response", 'error');
        }
    }

    // --- Category Handlers ---
    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subCatInput.trim() || !user) return;
        setCatLoading(true);
        try {
            await apiAddBranchSubCategory(user.uid, subCatInput.trim());
            await refreshProfile(); // Refresh local user state
            setSubCatInput('');
            addToast("Category added successfully", 'success');
        } catch (e: any) {
            addToast(e.message || "Failed to add category", 'error');
        } finally {
            setCatLoading(false);
        }
    }

    const handleRemoveCategory = async (cat: string) => {
        if (!user) return;
        if (!confirm(`Delete category "${cat}"?`)) return;
        setCatLoading(true);
        try {
            await apiRemoveBranchSubCategory(user.uid, cat);
            await refreshProfile();
            addToast("Category removed", 'success');
        } catch (e) {
            addToast("Failed to remove category", 'error');
        } finally {
            setCatLoading(false);
        }
    }

    const handleUpgradePlan = async () => {
        if (!user) return;
        if (!confirm(`Upgrade to Pro Plan for ${currency}5000/mo? (Simulated Payment)`)) return;
        setCatLoading(true);
        try {
            await apiUpgradePlan(user.uid);
            await refreshProfile();
            addToast("Welcome to Pro Plan!", 'success');
        } catch (e) {
            addToast("Upgrade failed", 'error');
        } finally {
            setCatLoading(false);
        }
    }

    // --- Variant Handlers ---
    const handleAddVariant = () => {
        if (!newVariant.color || !newVariant.price) {
            addToast("Color and Price are required for variant", "error");
            return;
        }

        const variant: ProductVariant = {
            id: Date.now().toString(), // Simple ID gen
            color: newVariant.color || '',
            size: newVariant.size || 'M',
            price: newVariant.price || 0,
            stock: newVariant.stock || 0,
            imageURL: newVariant.imageURL || form.imageURL, // Fallback to main image if not provided
            description: newVariant.description || ''
        };

        setForm(prev => ({
            ...prev,
            variants: [...(prev.variants || []), variant]
        }));

        // Reset input
        setNewVariant({ color: '', size: 'M', price: form.price, stock: 0, imageURL: '', description: '' });
    };

    const handleRemoveVariant = (id: string) => {
        setForm(prev => ({
            ...prev,
            variants: prev.variants?.filter(v => v.id !== id)
        }));
    };

    // --- Actions ---

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const productToSave = { ...form, branchID: user!.branchID! };

            // If variants exist, sum up stock for main display
            if (productToSave.variants && productToSave.variants.length > 0) {
                productToSave.stock = productToSave.variants.reduce((acc, v) => acc + v.stock, 0);
            }

            await apiSaveProduct(productToSave);

            // Simple log for main stock (detailed variant logging would require deeper diffing)
            if (form.id && form.stock !== initialStock) {
                const change = form.stock - initialStock;
                await apiAddInventoryLog({
                    productID: form.id,
                    productName: form.name,
                    branchID: user!.branchID!,
                    changeAmount: change,
                    newStock: form.stock,
                    reason: 'Manual Adjustment',
                    timestamp: new Date().toISOString(),
                    performedBy: user?.name || 'Admin'
                });
            }

            addToast(form.id ? "Product updated successfully" : "Product created successfully", 'success');
            setIsEditing(false);
            setForm(initialForm);
            loadData();
        } catch (e) {
            addToast("Failed to save product", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (confirm('Are you sure you want to delete this product?')) {
            try {
                await apiDeleteProduct(id);
                addToast("Product deleted", 'success');
                loadData();
            } catch (e) {
                addToast("Failed to delete product", 'error');
            }
        }
    };

    const handleSaveCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.branchID) return;
        setLoading(true);
        try {
            await apiSaveCoupon({ ...couponForm, branchID: user.branchID });
            addToast("Coupon saved successfully", 'success');
            setIsEditingCoupon(false);
            loadData();
        } catch (e) {
            addToast("Failed to save coupon", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCoupon = async (id: string) => {
        if (confirm("Delete this coupon?")) {
            try {
                await apiDeleteCoupon(id);
                addToast("Coupon deleted", 'success');
                loadData();
            } catch (e) {
                addToast("Failed to delete coupon", 'error');
            }
        }
    };

    const handleStatusUpdate = async (orderId: string, status: OrderStatus, customerId: string) => {
        try {
            await apiUpdateOrderStatus(orderId, status, user?.name || 'Branch Admin');

            await apiCreateNotification({
                userID: customerId,
                title: `Order Updated: ${status.toUpperCase()}`,
                message: `Your order #${orderId.slice(0, 6).toUpperCase()} has been marked as ${status}.`,
                type: 'order'
            });

            addToast(`Order marked as ${status}`, 'success');
            loadData();
        } catch (e) {
            addToast("Failed to update order status", 'error');
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChat || !newMessage.trim() || !user) return;

        try {
            await apiSendMessage(selectedChat.id, {
                senderID: user.uid,
                senderName: user.name || 'User',
                text: newMessage,
                timestamp: Date.now(),
                read: false
            } as ChatMessage);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                senderID: user.uid,
                senderName: user.name || 'User',
                text: newMessage,
                timestamp: Date.now(),
                read: false
            } as ChatMessage]);
            setNewMessage('');
        } catch (e) {
            addToast("Failed to send message", 'error');
        }
    };

    const handlePrintPackingSlip = (order: Order) => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
            <html>
              <head>
                <title>Packing Slip - #${order.id.slice(0, 8)}</title>
                <style>
                  body { font-family: sans-serif; padding: 20px; }
                  .header { display: flex; justify-content: space-between; border-bottom: 1px solid #ccc; padding-bottom: 20px; margin-bottom: 20px; }
                  .details { margin-bottom: 20px; }
                  table { w-full; width: 100%; border-collapse: collapse; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  th { background-color: #f2f2f2; }
                  .footer { margin-top: 40px; font-size: 12px; text-align: center; color: #666; }
                </style>
              </head>
              <body>
                <div class="header">
                  <h1>Packing Slip</h1>
                  <div>
                    <p><strong>Order ID:</strong> #${order.id.slice(0, 8).toUpperCase()}</p>
                    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div class="details">
                  <p><strong>From:</strong> ${user?.name} (Branch: ${user?.branchID})</p>
                  <p><strong>Ship To:</strong><br/>
                     ${order.shippingInfo?.fullName}<br/>
                     ${order.shippingInfo?.address}<br/>
                     ${order.shippingInfo?.city}, ${order.shippingInfo?.zip}<br/>
                     <strong>Phone:</strong> ${order.shippingInfo?.phone || 'N/A'}
                  </p>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Variant</th>
                      <th>Quantity</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${order.products.map(p => `
                      <tr>
                        <td>${p.name}</td>
                        <td>${p.variantName || '-'}</td>
                        <td>${p.quantity}</td>
                        <td>${currency}${p.price}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                <div class="footer">
                  Thank you for shopping with us!
                </div>
              </body>
            </html>
          `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    const copyShopLink = async () => {
        if (!user?.branchID) return;
        const link = `${window.location.origin}/#/shop/${user.branchID}`;
        try {
            await navigator.clipboard.writeText(link);
            addToast("Shop link copied to clipboard!", 'success');
        } catch (err) {
            addToast("Failed to copy", 'error');
        }
    };

    // --- Render Helpers ---

    const getProductTax = (productId: string) => {
        // If branch has override tax rate, use it first
        if (user?.taxRate) return user.taxRate;

        const product = products.find(p => p.id === productId);
        if (!product) return 0;
        const category = categories.find(c => c.name === product.category);
        return category?.taxRate || 0;
    };

    const calculateOrderTax = (order: Order) => {
        // If order has a non-zero taxAmount saved, use it for consistency with what customer saw
        if (order.taxAmount && order.taxAmount > 0) return order.taxAmount;

        // Fallback for older orders or if taxAmount missing
        const branchRate = user?.taxRate;
        if (branchRate !== undefined && branchRate > 0) {
            const subtotal = order.products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
            const taxable = (subtotal - (order.discountAmount || 0) + (order.shippingCost || 0));
            return taxable * (branchRate / 100);
        }

        let totalTax = 0;
        order.products.forEach(p => {
            const product = products.find(prod => prod.id === p.productID);
            const cat = categories.find(c => c.name === product?.category);
            const taxRate = cat?.taxRate || 0;
            totalTax += (p.price * p.quantity) * (taxRate / 100);
        });
        return totalTax;
    };

    const revenue = orders.filter(o => o.status !== OrderStatus.CANCELLED).reduce((acc, curr) => acc + curr.totalAmount, 0);
    const accumulatedTax = orders.filter(o => o.status !== OrderStatus.CANCELLED).reduce((acc, curr) => acc + (curr.taxAmount || calculateOrderTax(curr)), 0);
    const totalPaidTax = financePayments.filter(p => p.type === 'tax' && p.status === 'approved').reduce((acc, p) => acc + p.amount, 0);
    const totalTaxDue = Math.max(0, accumulatedTax - totalPaidTax);

    // Daily Tax
    const today = new Date().toLocaleDateString();
    const dailyTax = orders
        .filter(o => o.status !== OrderStatus.CANCELLED && new Date(o.createdAt).toLocaleDateString() === today)
        .reduce((acc, curr) => acc + (curr.taxAmount || calculateOrderTax(curr)), 0);

    const pendingOrdersCount = orders.filter(o => o.status === OrderStatus.PENDING).length;
    const lowStockProducts = products.filter(p => p.stock < 5).length;

    const [finForm, setFinForm] = useState({ amount: 0, trxID: '', type: 'tax' as any, message: '' });
    const [finSubmitting, setFinSubmitting] = useState(false);

    const handleSubmitFinance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.branchID) return;
        setFinSubmitting(true);
        try {
            await apiSubmitFinancePayment({
                branchID: user.branchID,
                branchName: user.name,
                amount: finForm.amount,
                trxID: finForm.trxID,
                type: finForm.type,
                message: finForm.message
            });
            addToast("Payment proof submitted for review", 'success');
            setFinForm({ amount: 0, trxID: '', type: 'tax', message: '' });
            loadData();
        } catch (err) {
            addToast("Failed to submit payment", 'error');
        } finally {
            setFinSubmitting(false);
        }
    };

    const handleContactSupport = async () => {
        try {
            const allUsers = await apiGetUsers();
            const superAdmin = allUsers.find(u => u.role === UserRole.SUPER_ADMIN);
            if (!superAdmin) {
                addToast("Support is currently offline. Please try again later.", "error");
                return;
            }
            if (user?.branchID) {
                const chatId = await apiInitChat(superAdmin.uid, user.branchID, superAdmin.name, user.name);
                await loadChats();
                setActiveView('messages');
                addToast("Connecting to platform support...", "success");
            }
        } catch (e) {
            addToast("Failed to initialize support chat", "error");
        }
    };

    const renderProducts = () => {
        const filteredProducts = products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));

        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Product Management</h2>
                    <div className="flex gap-2">
                        <Button onClick={() => { setForm({ ...initialForm, branchID: user!.branchID! }); setInitialStock(0); setIsEditing(true); }} size="sm">
                            <Plus size={16} className="mr-2" /> Add Product
                        </Button>
                    </div>
                </div>

                {isEditing && (
                    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 animate-in slide-in-from-top-2 border shadow-lg relative z-10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-blue-900 dark:text-blue-400">{form.id ? 'Edit Product' : 'New Product'}</h3>
                            <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)}><X size={16} /></Button>
                        </div>

                        <form onSubmit={handleSaveProduct} className="space-y-6">
                            {/* Base Info */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 space-y-4">
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">Basic Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                                    <Input label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Input label="Base Price" type="number" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) })} required />
                                    <Input label="Sale Price (Optional)" type="number" placeholder="Discounted Price" value={form.salePrice || ''} onChange={e => setForm({ ...form, salePrice: parseFloat(e.target.value) })} />
                                    <Input label="Total/Base Stock" type="number" value={form.stock} onChange={e => setForm({ ...form, stock: parseInt(e.target.value) })} required />
                                </div>
                                <Input label="Main Image URL" value={form.imageURL} onChange={e => setForm({ ...form, imageURL: e.target.value })} required />
                                <Textarea
                                    label="Description"
                                    rows={3}
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />

                                {/* Marketing Toggles */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isNewArrival"
                                        checked={form.isNewArrival}
                                        onChange={e => setForm({ ...form, isNewArrival: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded dark:bg-slate-900 dark:border-slate-700"
                                    />
                                    <label htmlFor="isNewArrival" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                        <Sparkles size={14} className="text-yellow-500" /> Mark as New Arrival
                                    </label>
                                </div>
                            </div>

                            {/* Variants Section */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 space-y-4">
                                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <Layers size={16} /> Product Variants (Color / Size)
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Add variations if this product comes in different colors or sizes. Variants override base price/image.</p>

                                {/* Variant Input */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end bg-gray-50 dark:bg-slate-900/50 p-3 rounded">
                                    <Input
                                        label="Color"
                                        placeholder="Red, Blue"
                                        value={newVariant.color}
                                        onChange={e => setNewVariant({ ...newVariant, color: e.target.value })}
                                        containerClassName="mb-0"
                                    />
                                    <Select
                                        label="Size"
                                        value={newVariant.size}
                                        onChange={e => setNewVariant({ ...newVariant, size: e.target.value })}
                                        containerClassName="mb-0"
                                    >
                                        <option>XS</option>
                                        <option>S</option>
                                        <option>M</option>
                                        <option>L</option>
                                        <option>XL</option>
                                        <option>XXL</option>
                                    </Select>
                                    <Input
                                        label="Price"
                                        type="number"
                                        value={newVariant.price}
                                        onChange={e => setNewVariant({ ...newVariant, price: parseFloat(e.target.value) })}
                                        containerClassName="mb-0"
                                    />
                                    <Input
                                        label="Stock"
                                        type="number"
                                        value={newVariant.stock}
                                        onChange={e => setNewVariant({ ...newVariant, stock: parseInt(e.target.value) })}
                                        containerClassName="mb-0"
                                    />
                                    <Button type="button" onClick={handleAddVariant} size="sm" className="h-10">Add</Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    <Input
                                        label="Variant Image URL (Optional)"
                                        value={newVariant.imageURL}
                                        onChange={e => setNewVariant({ ...newVariant, imageURL: e.target.value })}
                                        placeholder="Leave empty to use main image"
                                        containerClassName="mb-0"
                                    />
                                    <Input
                                        label="Variant Description (Optional)"
                                        value={newVariant.description}
                                        onChange={e => setNewVariant({ ...newVariant, description: e.target.value })}
                                        placeholder="Specific details for this variant..."
                                        containerClassName="mb-0"
                                    />
                                </div>

                                {/* Variants List */}
                                {form.variants && form.variants.length > 0 && (
                                    <div className="overflow-x-auto mt-4">
                                        <table className="w-full text-sm text-left border dark:border-slate-700 rounded">
                                            <thead className="bg-gray-100 dark:bg-slate-700">
                                                <tr>
                                                    <th className="p-2 dark:text-gray-300">Color</th>
                                                    <th className="p-2 dark:text-gray-300">Size</th>
                                                    <th className="p-2 dark:text-gray-300">Price</th>
                                                    <th className="p-2 dark:text-gray-300">Stock</th>
                                                    <th className="p-2 dark:text-gray-300">Desc</th>
                                                    <th className="p-2 dark:text-gray-300 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {form.variants.map((v) => (
                                                    <tr key={v.id} className="border-t dark:border-slate-700">
                                                        <td className="p-2 dark:text-gray-300">{v.color}</td>
                                                        <td className="p-2"><Badge>{v.size}</Badge></td>
                                                        <td className="p-2 dark:text-gray-300">{currency}{v.price}</td>
                                                        <td className="p-2 dark:text-gray-300">{v.stock}</td>
                                                        <td className="p-2 dark:text-gray-300 max-w-[150px] truncate" title={v.description}>{v.description || '-'}</td>
                                                        <td className="p-2 text-right">
                                                            <button type="button" onClick={() => handleRemoveVariant(v.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                                <Button type="submit" isLoading={loading}>Save Complete Product</Button>
                            </div>
                        </form>
                    </Card>
                )}

                <Card className="!p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px] text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700">
                                <tr>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Image</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Price</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Stock</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Attributes</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(p => (
                                    <tr key={p.id} className="border-b dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-4">
                                            <img src={p.imageURL} alt="" className="w-10 h-10 rounded object-cover bg-gray-200 dark:bg-slate-700 border dark:border-slate-600" />
                                        </td>
                                        <td className="p-4 font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                                        <td className="p-4 font-mono">
                                            {p.salePrice ? (
                                                <div className="flex flex-col">
                                                    <span className="text-gray-400 dark:text-gray-600 line-through text-xs">{currency}{p.price}</span>
                                                    <span className="text-red-600 dark:text-red-400 font-bold">{currency}{p.salePrice}</span>
                                                </div>
                                            ) : (
                                                <span className="dark:text-gray-300">{currency}{p.price}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <Badge color={p.stock > 10 ? 'green' : p.stock > 0 ? 'yellow' : 'red'}>
                                                {p.stock}
                                            </Badge>
                                        </td>
                                        <td className="p-4 space-x-1">
                                            {p.variants && p.variants.length > 0 && (
                                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mb-1">{p.variants.length} Options</span>
                                            )}
                                            {p.isNewArrival && (
                                                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded flex items-center gap-1 w-fit"><Sparkles size={10} /> New</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button onClick={() => { setForm(p); setInitialStock(p.stock); setIsEditing(true); setShowLogs(false); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredProducts.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">No products found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    };

    const renderCoupons = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Coupon Management</h2>
                <Button onClick={() => {
                    setCouponForm({ id: '', code: '', branchID: user!.branchID!, discountType: 'percentage', value: 0, minOrderAmount: 0, expiryDate: '', isActive: true, usageCount: 0, usageLimit: 0 });
                    setIsEditingCoupon(true);
                }} size="sm">
                    <Plus size={16} className="mr-2" /> Add Coupon
                </Button>
            </div>

            {isEditingCoupon && (
                <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-purple-900 dark:text-purple-400">{couponForm.id ? 'Edit Coupon' : 'New Coupon'}</h3>
                        <Button size="sm" variant="secondary" onClick={() => setIsEditingCoupon(false)}><X size={16} /></Button>
                    </div>
                    <form onSubmit={handleSaveCoupon} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="Coupon Code" value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="e.g. SUMMER10" required />
                            <Select
                                label="Discount Type"
                                value={couponForm.discountType}
                                onChange={e => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount ({currency})</option>
                            </Select>
                            <Input label="Discount Value" type="number" value={couponForm.value} onChange={e => setCouponForm({ ...couponForm, value: parseFloat(e.target.value) })} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="Min Order Amount" type="number" value={couponForm.minOrderAmount} onChange={e => setCouponForm({ ...couponForm, minOrderAmount: parseFloat(e.target.value) })} />
                            <Input label="Expiry Date" type="date" value={couponForm.expiryDate} onChange={e => setCouponForm({ ...couponForm, expiryDate: e.target.value })} required />
                            <Input label="Usage Limit" type="number" value={couponForm.usageLimit || 0} onChange={e => setCouponForm({ ...couponForm, usageLimit: parseInt(e.target.value) })} placeholder="0 for unlimited" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="secondary" onClick={() => setIsEditingCoupon(false)}>Cancel</Button>
                            <Button type="submit" isLoading={loading}>Save Coupon</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.map(coupon => (
                    <Card key={coupon.id} className="relative group border-l-4 border-l-purple-500">
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setCouponForm(coupon); setIsEditingCoupon(true); }} className="p-1.5 bg-blue-50 text-blue-600 rounded"><Edit2 size={14} /></button>
                            <button onClick={() => handleDeleteCoupon(coupon.id)} className="p-1.5 bg-red-50 text-red-600 rounded"><Trash2 size={14} /></button>
                        </div>
                        <div className="flex justify-between items-start mb-2">
                            <Badge color="purple" className="text-lg font-mono px-3 py-1">{coupon.code}</Badge>
                            <span className={`text-xs px-2 py-1 rounded-full ${new Date(coupon.expiryDate) < new Date() ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                                {new Date(coupon.expiryDate) < new Date() ? 'Expired' : 'Active'}
                            </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                                {coupon.discountType === 'percentage' ? `${coupon.value}% OFF` : `${currency}${coupon.value} OFF`}
                            </p>
                            <p>Min Order: {currency}{coupon.minOrderAmount}</p>
                            <p>Used: {coupon.usageCount} times</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">Expires: {new Date(coupon.expiryDate).toLocaleDateString()}</p>
                        </div>
                    </Card>
                ))}
                {coupons.length === 0 && <div className="col-span-full text-center py-10 text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-900/50">No coupons created yet.</div>}
            </div>
        </div>
    );

    const renderMessages = () => (
        <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm h-[70vh] overflow-hidden animate-in fade-in">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-gray-100 dark:border-slate-700 flex flex-col">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <MessageSquare size={18} className="text-blue-600 dark:text-blue-400" /> Messages
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto dark:bg-slate-900/20">
                    {chats
                        .filter(chat => {
                            if (!isSuspended) return true;
                            return chat.userName?.toLowerCase().includes('admin');
                        })
                        .map(chat => (
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
                                        {chat.userID === user?.uid ? chat.branchName : chat.userName || 'Customer'}
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
                        <div className="p-8 text-center text-gray-400 text-sm">No conversations yet.</div>
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
                                    {selectedChat.userID === user?.uid ? selectedChat.branchName : selectedChat.userName || 'Customer'}
                                </h3>
                                <p className="text-[10px] text-green-500 font-medium">Online</p>
                            </div>
                            <Button size="sm" variant="secondary" onClick={() => setSelectedChat(null)}>
                                <X size={16} />
                            </Button>
                        </div>
                        <div id="message-container" className="flex-1 overflow-y-auto p-4 space-y-4">
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
                            if (isSuspended && !selectedChat.userName?.toLowerCase().includes('admin')) {
                                addToast("Access Restricted: You can only communicate with Platform Support while suspended.", "error");
                                return;
                            }
                            const msg: Omit<ChatMessage, 'id'> = {
                                senderID: user!.uid,
                                senderName: user!.name || 'Branch Admin',
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
                        <p className="font-medium">Select a conversation to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderOverview = () => (
        <div className="space-y-8 animate-in fade-in">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-blue-600 shadow-md">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Total Revenue</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{currency}{revenue.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <DollarSign size={20} />
                        </div>
                    </div>
                </Card>
                <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-purple-600 shadow-md">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Orders</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{orders.length}</h3>
                        </div>
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                            <ClipboardList size={20} />
                        </div>
                    </div>
                </Card>
                <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-green-600 shadow-md">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Products</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{products.length}</h3>
                        </div>
                        <div className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                            <Package size={20} />
                        </div>
                    </div>
                </Card>
                <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-orange-600 shadow-md">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Total Tax Due</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{currency}{totalTaxDue.toLocaleString()}</h3>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 text-[10px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">Rate: {user?.taxRate || 0}%</span>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Balance Due</p>
                            </div>
                        </div>
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                            <Banknote size={20} />
                        </div>
                    </div>
                </Card>
                <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-red-600 shadow-md">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Today's Tax</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{currency}{dailyTax.toLocaleString()}</h3>
                        </div>
                        <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                            <Calendar size={20} />
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg">
                    <div className="flex flex-col justify-between h-full">
                        <div>
                            <h4 className="font-bold flex items-center gap-2"><Share2 size={16} /> Share Shop</h4>
                            <p className="text-xs text-blue-100 mt-1 mb-3">Get more customers by sharing.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" onClick={copyShopLink} className="bg-white text-blue-600 hover:bg-blue-50 border-none w-full text-xs">
                                Copy Link
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );

    const renderCategories = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Shop Categories</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Organize your products with custom sub-categories.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Plan: <Badge color={user?.plan === 'pro' ? 'purple' : 'gray'}>{user?.plan === 'pro' ? 'PRO' : 'FREE'}</Badge></span>
                    {user?.plan !== 'pro' && (
                        <Button size="sm" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-none" onClick={handleUpgradePlan}>
                            <Crown size={14} className="mr-1" /> Upgrade
                        </Button>
                    )}
                </div>
            </div>

            <Card className="p-6">
                <form onSubmit={handleAddCategory} className="flex gap-4 items-end mb-6">
                    <div className="flex-1">
                        <Input
                            label="New Category Name"
                            placeholder="e.g. Summer Collection"
                            value={subCatInput}
                            onChange={e => setSubCatInput(e.target.value)}
                            containerClassName="mb-0"
                        />
                    </div>
                    <Button type="submit" isLoading={catLoading} disabled={!subCatInput.trim()}>
                        <Plus size={18} className="mr-2" /> Add
                    </Button>
                </form>

                <div className="space-y-2">
                    <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2">Active Categories</h4>
                    <div className="flex flex-wrap gap-3">
                        {user?.subCategories?.map(cat => (
                            <div key={cat} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-lg group">
                                <span className="font-medium text-gray-700 dark:text-gray-300">{cat}</span>
                                <button onClick={() => handleRemoveCategory(cat)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {(!user?.subCategories || user.subCategories.length === 0) && (
                            <p className="text-gray-400 text-sm italic">No custom categories added yet.</p>
                        )}
                    </div>
                    {user?.plan !== 'pro' && (
                        <p className="text-xs text-orange-500 mt-4 flex items-center gap-1">
                            <AlertTriangle size={12} /> Free plan limited to 3 categories.
                        </p>
                    )}
                </div>
            </Card>
        </div>
    );

    const renderOrders = () => {
        const filteredOrders = orders.filter(o => {
            if (orderFilter !== 'all' && o.status !== orderFilter) return false;
            return true;
        });

        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Order Management</h2>
                    <div className="flex gap-2">
                        <Select
                            value={orderFilter}
                            onChange={(e) => setOrderFilter(e.target.value)}
                            containerClassName="mb-0 !w-40"
                            className="!py-2 text-sm"
                        >
                            <option value="all">All Orders</option>
                            <option value={OrderStatus.PENDING}>Pending</option>
                            <option value={OrderStatus.COMPLETED}>Completed</option>
                            <option value={OrderStatus.CANCELLED}>Cancelled</option>
                        </Select>
                    </div>
                </div>

                <Card className="!p-0 overflow-hidden border dark:border-slate-800">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700">
                                <tr>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Order ID</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Items</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Total</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Tax</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                                    <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.map(order => (
                                    <tr key={order.id} className="border-b dark:border-slate-700 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">#{order.id.slice(0, 8).toUpperCase()}</td>
                                        <td className="p-4 text-gray-600 dark:text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{order.shippingInfo?.fullName || 'Guest'}</div>
                                            <div className="text-xs text-blue-600 dark:text-blue-400 font-bold">{order.shippingInfo?.phone}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{order.shippingInfo?.city}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                {order.products.slice(0, 2).map((p, i) => (
                                                    <div key={i} className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                                                        {p.quantity}x {p.name} {p.variantName ? `(${p.variantName})` : ''}
                                                    </div>
                                                ))}
                                                {order.products.length > 2 && <span className="text-xs text-gray-400 dark:text-gray-500">+{order.products.length - 2} more</span>}
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold dark:text-gray-100">{currency}{order.totalAmount}</td>
                                        <td className="p-4 text-orange-600 dark:text-orange-400 font-medium">{currency}{calculateOrderTax(order).toFixed(2)}</td>
                                        <td className="p-4">
                                            <select
                                                className={`text-xs font-bold px-2 py-1 rounded border-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer ${order.status === OrderStatus.COMPLETED ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                                    order.status === OrderStatus.CANCELLED ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                    }`}
                                                value={order.status}
                                                onChange={(e) => handleStatusUpdate(order.id, e.target.value as OrderStatus, order.userID)}
                                            >
                                                <option value={OrderStatus.PENDING}>Pending</option>
                                                <option value={OrderStatus.COMPLETED}>Completed</option>
                                                <option value={OrderStatus.CANCELLED}>Cancelled</option>
                                            </select>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setViewingOrder(order)}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handlePrintPackingSlip(order)}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                                    title="Print Packing Slip"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredOrders.length === 0 && (
                                    <tr><td colSpan={8} className="p-8 text-center text-gray-400">No orders found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    };

    const renderFinance = () => (
        <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 border-l-4 border-l-red-600">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <DollarSign className="text-red-600" /> Pending Dues
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                            <span className="text-sm font-medium">Accumulated Tax</span>
                            <span className="font-bold text-gray-700 dark:text-gray-300">{currency}{accumulatedTax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/30">
                            <span className="text-sm font-bold text-green-700 dark:text-green-400">Total Paid (Approved)</span>
                            <span className="font-bold text-green-600 dark:text-green-500">{currency}{totalPaidTax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                            <span className="text-sm font-bold text-red-700 dark:text-red-400">Balance Tax Due</span>
                            <div className="text-right">
                                <div className="font-bold text-red-600 leading-none">{currency}{totalTaxDue.toLocaleString()}</div>
                                <div className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Platform Rate: {user?.taxRate || 0}%</div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                            <span className="text-sm font-medium">Today's Total Tax</span>
                            <span className="font-bold text-orange-600">{currency}{dailyTax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                            <span className="text-sm font-medium">Monthly Subscription</span>
                            <span className="font-bold text-blue-600">{currency}{(user?.monthlySubscriptionFee || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                        <CreditCard /> Platform Payment Accounts
                    </h3>
                    <div className="space-y-4">
                        {platformAccounts.map(m => (
                            <div key={m.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-blue-900/30 shadow-sm transition-all hover:shadow-md">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge color="blue">{m.type}</Badge>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Account Title</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{m.title}</p>
                                    <p className="text-xs text-gray-500 uppercase font-bold mt-2">Account Number / ID</p>
                                    <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 p-2 rounded-lg group">
                                        <code className="text-sm font-black text-blue-600 dark:text-blue-400">{m.accountNumber}</code>
                                        <button onClick={() => { navigator.clipboard.writeText(m.accountNumber); addToast("Number copied!", "success"); }} className="p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Copy size={14} className="text-gray-400 hover:text-blue-600" />
                                        </button>
                                    </div>
                                    {m.instructions && (
                                        <p className="text-xs text-gray-500 italic mt-2 text-wrap break-words">"{m.instructions}"</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {platformAccounts.length === 0 && (
                            <p className="text-sm text-gray-500 italic">No platform payment accounts configured for your country.</p>
                        )}
                    </div>
                </Card>

                <Card className="p-6 md:col-span-2">
                    <h3 className="text-xl font-bold mb-4">Submit Payment Proof</h3>
                    <form onSubmit={handleSubmitFinance} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Payment Type"
                                value={finForm.type}
                                onChange={e => setFinForm({ ...finForm, type: e.target.value as any })}
                            >
                                <option value="tax">Tax Settlement</option>
                                <option value="subscription">Subscription Fee</option>
                            </Select>
                            <Input
                                label="Amount Paid"
                                type="number"
                                value={finForm.amount}
                                onChange={e => setFinForm({ ...finForm, amount: parseFloat(e.target.value) || 0 })}
                                required
                            />
                        </div>
                        <Input
                            label="Transaction ID"
                            placeholder="Paste your JazzCash/EasyPaisa Trx ID"
                            value={finForm.trxID}
                            onChange={e => setFinForm({ ...finForm, trxID: e.target.value })}
                            required
                        />
                        <Textarea
                            label="Message / Detail"
                            placeholder="Additional details about your payment..."
                            value={finForm.message}
                            onChange={e => setFinForm({ ...finForm, message: e.target.value })}
                        />
                        <Button type="submit" className="w-full" isLoading={finSubmitting}>Submit Payment Proof</Button>
                    </form>
                </Card>
            </div>

            <Card className="!p-0 overflow-hidden">
                <div className="p-4 border-b dark:border-slate-800">
                    <h3 className="font-bold">Payment History</h3>
                </div>
                <div className="overflow-x-auto rounded-xl border dark:border-slate-800">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-700">
                            <tr>
                                <th className="p-4 font-medium text-gray-500">Date</th>
                                <th className="p-4 font-medium text-gray-500">Type</th>
                                <th className="p-4 font-medium text-gray-500">Amount</th>
                                <th className="p-4 font-medium text-gray-500">Trx ID</th>
                                <th className="p-4 font-medium text-gray-500">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {financePayments.map(p => (
                                <tr key={p.id} className="border-b dark:border-slate-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-slate-700/50">
                                    <td className="p-4">{new Date(p.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4 capitalize"><Badge color={p.type === 'tax' ? 'orange' : 'purple'}>{p.type}</Badge></td>
                                    <td className="p-4 font-bold">{currency}{p.amount}</td>
                                    <td className="p-4 text-xs font-mono">{p.trxID}</td>
                                    <td className="p-4">
                                        <Badge color={p.status === 'approved' ? 'green' : p.status === 'rejected' ? 'red' : 'yellow'}>
                                            {p.status.toUpperCase()}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                            {financePayments.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">No payment history found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div >
    );

    const renderAnalytics = () => {
        // Prepare chart data from orders
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toLocaleDateString();
        }).reverse();

        const chartData = last7Days.map(date => {
            const dayOrders = orders.filter(o => new Date(o.createdAt).toLocaleDateString() === date);
            return {
                date: date.split('/')[1] + '/' + date.split('/')[0], // MM/DD
                sales: dayOrders.reduce((acc, curr) => acc + curr.totalAmount, 0),
                count: dayOrders.length
            };
        });

        return (
            <div className="space-y-6 animate-in fade-in">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Branch Analytics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-4">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100"><DollarSign size={18} className="text-green-600" /> Sales Trend (7D)</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                    />
                                    <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                    <Card className="p-4">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100"><Package size={18} className="text-blue-600" /> Order Volume</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                    />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            </div>
        );
    };

    const renderReports = () => (
        <div className="space-y-6 animate-in fade-in">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Customer Reports</h2>
            <div className="space-y-4">
                {disputes.length === 0 ? (
                    <Card className="p-8 text-center text-gray-400">No reports received yet.</Card>
                ) : (
                    disputes.map(report => (
                        <Card key={report.id} className="border-l-4 border-l-red-500">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <Badge color={report.status === DisputeStatus.OPEN ? 'red' : 'green'}>
                                        {report.status.toUpperCase()}
                                    </Badge>
                                    <h3 className="font-bold text-lg mt-2 text-gray-900 dark:text-gray-100">{report.reason}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">Order ID: #{report.orderID.slice(0, 8).toUpperCase()}</p>
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(report.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-100 dark:border-slate-700 mb-4 italic">
                                "{report.description}"
                            </p>

                            {report.resolution ? (
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                                    <p className="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1 mb-1">
                                        <CheckCircle size={12} /> Your Response:
                                    </p>
                                    <p className="text-sm text-green-800 dark:text-green-300">{report.resolution}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Textarea
                                        id={`reply-${report.id}`}
                                        placeholder="Type your response to the customer..."
                                        rows={3}
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            const el = document.getElementById(`reply-${report.id}`) as HTMLTextAreaElement;
                                            handleReplyToReport(report.id, el.value, report.userID);
                                        }}
                                    >
                                        Send Response
                                    </Button>
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    );

    const renderOrderDetailsModal = () => {
        if (!viewingOrder) return null;

        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewingOrder(null)}></div>
                <Card className="relative w-full max-w-2xl z-10 p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="bg-gray-50 dark:bg-slate-900 p-6 border-b dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Package className="text-blue-600" /> Order Details
                            </h2>
                            <p className="text-xs text-gray-500 font-mono mt-1">ID: #{viewingOrder.id.toUpperCase()}</p>
                        </div>
                        <button onClick={() => setViewingOrder(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500"><X size={20} /></button>
                    </div>

                    <div className="p-6 overflow-y-auto max-h-[80vh] space-y-8">
                        {/* Customer & Payment Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <UserIcon size={14} /> Customer Info
                                </h3>
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2">
                                    <p className="font-bold text-gray-900 dark:text-gray-100">{viewingOrder.shippingInfo?.fullName || 'Guest'}</p>
                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-bold">{viewingOrder.shippingInfo?.phone}</p>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                        <MapPin size={14} className="mt-0.5 shrink-0" />
                                        <span>{viewingOrder.shippingInfo?.address}, {viewingOrder.shippingInfo?.city}, {viewingOrder.shippingInfo?.zip}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <CreditCard size={14} /> Payment Details
                                </h3>
                                <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Method:</span>
                                        <Badge color="blue">{viewingOrder.paymentMethod}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/30 p-2 rounded border border-blue-100 dark:border-blue-900/30">
                                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">TRX ID:</span>
                                        <span className="text-sm font-mono font-black text-blue-600 dark:text-blue-400">{viewingOrder.paymentDetails?.trxID || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <ShoppingBag size={14} /> Ordered Products
                            </h3>
                            <div className="border dark:border-slate-800 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-800">
                                        <tr>
                                            <th className="p-3 text-left font-medium text-gray-500">Item</th>
                                            <th className="p-3 text-center font-medium text-gray-500">Qty</th>
                                            <th className="p-3 text-right font-medium text-gray-500">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-slate-800">
                                        {viewingOrder.products.map((p, i) => (
                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                                <td className="p-3">
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">{p.name}</div>
                                                    {p.variantName && <div className="text-[10px] text-gray-500">{p.variantName}</div>}
                                                </td>
                                                <td className="p-3 text-center">{p.quantity}</td>
                                                <td className="p-3 text-right font-bold">{currency}{p.price * p.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals Summary */}
                        <div className="flex justify-end pt-4 border-t dark:border-slate-800">
                            <div className="w-full md:w-64 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Order Tax Due:</span>
                                    <span className="font-bold text-orange-600">{currency}{calculateOrderTax(viewingOrder).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-black border-t dark:border-slate-800 pt-2">
                                    <span>Total Amount:</span>
                                    <span className="text-blue-600 dark:text-blue-400">{currency}{viewingOrder.totalAmount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t dark:border-slate-800 flex justify-end">
                        <Button onClick={() => setViewingOrder(null)}>Close Details</Button>
                    </div>
                </Card>
            </div>
        );
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 min-h-[80vh]">

            {/* Sidebar / Top Tabs for Mobile */}
            <div className="w-full md:w-64 flex-shrink-0">
                <Card className="sticky top-20 md:top-24 p-2 md:p-3 flex md:flex-col gap-1 overflow-x-auto no-scrollbar md:overflow-visible shadow-sm md:shadow-md border-gray-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                    {!isSuspended ? (
                        <>
                            <button
                                onClick={() => setActiveView('overview')}
                                className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeView === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <LayoutDashboard size={18} /> <span className="md:inline">Overview</span>
                            </button>
                            <button
                                onClick={() => setActiveView('products')}
                                className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeView === 'products' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <ShoppingBag size={18} /> <span className="md:inline">Products</span>
                            </button>
                            <button
                                onClick={() => setActiveView('categories')}
                                className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeView === 'categories' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <Layers size={18} /> <span className="md:inline">Categories</span>
                            </button>
                            <button
                                onClick={() => setActiveView('orders')}
                                className={`flex-shrink-0 md:w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeView === 'orders' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <ClipboardList size={18} /> <span className="md:inline">Orders</span>
                                </div>
                                {orders.filter(o => o.status === OrderStatus.PENDING).length > 0 && (
                                    <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                        {orders.filter(o => o.status === OrderStatus.PENDING).length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveView('coupons')}
                                className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeView === 'coupons' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <Ticket size={18} /> <span className="md:inline">Coupons</span>
                            </button>
                            <button
                                onClick={() => setActiveView('messages')}
                                className={`flex-shrink-0 md:w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeView === 'messages' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <MessageSquare size={18} /> <span className="md:inline">Messages</span>
                                </div>
                                {chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0) > 0 && (
                                    <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                        {chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0)}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveView('finance')}
                                className={`flex-shrink-0 md:w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeView === 'finance' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Wallet size={18} /> <span className="md:inline">Finances</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveView('analytics')}
                                className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeView === 'analytics' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <BarChart2 size={18} /> <span className="md:inline">Analytics</span>
                            </button>
                            <button
                                onClick={() => setActiveView('reports')}
                                className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeView === 'reports' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <AlertTriangle size={18} /> <span className="md:inline">Reports</span>
                            </button>
                            <div className="my-2 border-t border-gray-100 dark:border-slate-800"></div>
                            <Link to="/dashboard/branch/staff">
                                <button className="flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <Users size={18} /> <span className="md:inline">Staff</span>
                                </button>
                            </Link>
                            <Link to="/dashboard/branch/settings">
                                <button className="flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <Settings size={18} /> <span className="md:inline">Settings</span>
                                </button>
                            </Link>
                        </>
                    ) : (
                        <div className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar md:overflow-visible">
                            <button
                                onClick={handleContactSupport}
                                className={`flex-shrink-0 md:w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeView === 'messages' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <MessageSquare size={18} /> Support Chat
                            </button>
                            <button
                                onClick={() => setActiveView('finance')}
                                className={`flex-shrink-0 md:w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeView === 'finance' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                            >
                                <Wallet size={18} /> Pay Dues
                            </button>
                        </div>
                    )}
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
                {(isSuspended && activeView !== 'messages' && activeView !== 'finance') ? (
                    <Card className="h-full min-h-[60vh] bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 p-4 md:p-12 flex flex-col items-center justify-center text-center gap-6 animate-in fade-in zoom-in-95">
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-500 mb-2">
                            <ShieldOff size={44} />
                        </div>
                        <div className="max-w-md">
                            <h3 className="font-bold text-red-900 dark:text-red-400 text-2xl md:text-3xl mb-2">Access Restricted</h3>
                            <p className="text-red-800 dark:text-red-300 text-sm md:text-lg mb-8">This branch account has been suspended by the administrator. Settle dues or contact support to reactivate.</p>

                            <div className="p-4 md:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-xl text-left">
                                <div className="flex items-center gap-2 mb-4 text-red-600 dark:text-red-400">
                                    <AlertTriangle size={18} />
                                    <span className="text-xs font-bold uppercase tracking-widest">Suspension Details</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-2 border-b dark:border-slate-800">
                                        <span className="text-xs font-bold text-gray-400">Total Tax Due:</span>
                                        <span className="text-lg font-black text-red-600">{currency}{totalTaxDue.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b dark:border-slate-800">
                                        <span className="text-xs font-bold text-gray-400">Subscription:</span>
                                        <span className="text-lg font-black text-blue-600">{currency}{(user?.monthlySubscriptionFee || 0).toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Reason Provided</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{user?.suspensionReason || 'Violation of platform terms.'}"</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                                <Button onClick={() => setActiveView('finance')} variant="primary" className="shadow-lg shadow-blue-500/20">Pay Outstanding Dues</Button>
                                <Button onClick={handleContactSupport} variant="secondary">Contact Support</Button>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <>
                        {activeView === 'overview' && renderOverview()}
                        {activeView === 'products' && renderProducts()}
                        {activeView === 'categories' && renderCategories()}
                        {activeView === 'orders' && renderOrders()}
                        {activeView === 'coupons' && renderCoupons()}
                        {activeView === 'messages' && renderMessages()}
                        {activeView === 'finance' && renderFinance()}
                        {activeView === 'analytics' && renderAnalytics()}
                        {activeView === 'reports' && renderReports()}
                        {renderOrderDetailsModal()}
                    </>
                )}
            </div>
        </div>
    );
};
