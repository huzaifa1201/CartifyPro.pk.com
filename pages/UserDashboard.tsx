
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiGetOrders, apiCreateBranchRequest, apiGetBranchRequests, apiGetSystemSettings, apiGetPaymentMethods, apiGetChats, apiGetMessages, apiSendMessage, apiGetCategories } from '../services/api';
import { Order, OrderStatus, BranchRequest, RequestStatus, PaymentMethod, Chat, ChatMessage, UserRole, Category } from '../types';
import { Card, Button, Input, Badge } from '../components/UI';
import { getCurrency } from '../constants';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Store, CreditCard, ImageIcon, Settings, User as UserIcon, Phone, MapPin, Copy, Building, ClipboardList, LayoutDashboard, MessageSquare, Tag } from 'lucide-react';
import { BranchRegistrationForm } from '../components/BranchRegistrationForm';

export const UserDashboard: React.FC = () => {
    const { user, refreshProfile } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const currency = getCurrency(user?.country);
    const [orders, setOrders] = useState<Order[]>([]);
    const [activeTab, setActiveTab] = useState<'orders' | 'branch-request' | 'requests' | 'messages'>('orders');
    const [loading, setLoading] = useState(false);

    // Request Form State
    const [reqAmount, setReqAmount] = useState(500);
    const [trxID, setTrxID] = useState('');
    const [screenshotURL, setScreenshotURL] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

    // Category Selection State
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryMode, setCategoryMode] = useState<'select' | 'custom'>('select');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [customCategory, setCustomCategory] = useState('');

    const [existingRequest, setExistingRequest] = useState<BranchRequest | null>(null);
    const [myRequests, setMyRequests] = useState<BranchRequest[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

    // Chat State
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    // Load Chats when activeTab changes
    useEffect(() => {
        if (activeTab === 'messages' && user) {
            apiGetChats(user.uid, UserRole.USER).then(setChats);
        }
    }, [activeTab]);

    // Load Messages when chat selected
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
        if (!user) return;
        try {
            const [myOrders, reqs, settings, methods, cats] = await Promise.all([
                apiGetOrders(user.role, user.uid),
                apiGetBranchRequests(user.uid), // Secure: Fetch only my requests
                apiGetSystemSettings(),
                apiGetPaymentMethods(),
                apiGetCategories()
            ]);

            setOrders(myOrders);
            const userReqs = reqs.sort((a, b) => b.createdAt - a.createdAt); // Already filtered by API
            setMyRequests(userReqs);
            setCategories(cats);

            if (userReqs.length > 0) setExistingRequest(userReqs[0]);
            setReqAmount(settings.branchSetupFee);
            setPaymentMethods(methods.filter(m => m.enabled));

        } catch (e) {
            console.error("Failed to load user data", e);
        }
    };



    const handleSwitchToBranch = async () => {
        setLoading(true);
        try {
            await refreshProfile();
            addToast("Profile updated! Redirecting...", 'success');
            setTimeout(() => {
                navigate('/dashboard/branch');
            }, 500);
        } catch (e) {
            addToast("Failed to refresh profile. Please re-login.", 'error');
        } finally {
            setLoading(false);
        }
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChat || !newMessage.trim() || !user) return;

        try {
            await apiSendMessage(selectedChat.id, {
                senderID: user.uid,
                senderName: user.name,
                text: newMessage,
                timestamp: Date.now(),
                read: false
            });
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                senderID: user.uid,
                text: newMessage,
                timestamp: Date.now(),
                read: false
            }]);
            setNewMessage('');
        } catch (e) {
            addToast("Failed to send message", 'error');
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            addToast("Copied to clipboard", 'success');
        } catch (err) {
            // Fallback
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                addToast("Copied to clipboard", 'success');
            } catch (e) {
                console.error('Failed to copy', e);
                addToast("Failed to copy to clipboard", 'error');
            }
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case OrderStatus.COMPLETED: return <Badge color="green">Completed</Badge>;
            case OrderStatus.PENDING: return <Badge color="yellow">Pending</Badge>;
            case OrderStatus.CANCELLED: return <Badge color="red">Cancelled</Badge>;
            case RequestStatus.APPROVED: return <Badge color="green">Approved</Badge>;
            case RequestStatus.REJECTED: return <Badge color="red">Rejected</Badge>;
            default: return <Badge color="gray">{status}</Badge>;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                            {user?.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold">{user?.name}</h3>
                            <p className="text-xs text-gray-500">{user?.role}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'orders' ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                            <CreditCard size={16} /> My Orders
                        </button>
                        <button
                            onClick={() => setActiveTab('messages')}
                            className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'messages' ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                            <MessageSquare size={16} /> Messages
                        </button>
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'requests' ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                            <ClipboardList size={16} /> Branch Requests
                        </button>
                        <button
                            onClick={() => setActiveTab('branch-request')}
                            className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'branch-request' ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                            <Store size={16} /> Become a Seller
                        </button>
                        <Link to="/profile">
                            <button className="w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800">
                                <Settings size={16} /> Profile Settings
                            </button>
                        </Link>
                    </div>
                </Card>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
                {activeTab === 'orders' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold mb-4">Order History</h2>
                        <Card className="!p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 dark:bg-slate-900 border-b dark:border-slate-800">
                                        <tr>
                                            <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Order ID</th>
                                            <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                                            <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                                            <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Items</th>
                                            <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Total Price</th>
                                            <th className="p-4 font-medium text-gray-500 dark:text-gray-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-400">No orders placed yet.</td>
                                            </tr>
                                        ) : (
                                            orders.map(order => (
                                                <tr key={order.id} className="border-b dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                    <td className="p-4 font-mono text-gray-500 dark:text-gray-400">#{order.id.slice(0, 8).toUpperCase()}</td>
                                                    <td className="p-4 text-gray-600 dark:text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                                                    <td className="p-4">{getStatusBadge(order.status)}</td>
                                                    <td className="p-4">
                                                        <div className="flex flex-col gap-1">
                                                            {order.products.slice(0, 2).map((p, i) => (
                                                                <div key={i} className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                                                                    {p.quantity}x {p.name}
                                                                </div>
                                                            ))}
                                                            {order.products.length > 2 && (
                                                                <span className="text-xs text-gray-400 dark:text-gray-500">+{order.products.length - 2} more</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-bold text-gray-900 dark:text-gray-100">{currency}{order.totalAmount.toFixed(2)}</td>
                                                    <td className="p-4 text-right space-x-2">
                                                        <Link to={`/order/${order.id}`}>
                                                            <Button variant="outline" size="sm" className="text-xs hover:border-gray-300 dark:hover:border-gray-600">View</Button>
                                                        </Link>
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            className="text-xs"
                                                            onClick={async () => {
                                                                if (confirm("Are you sure you want to delete this order from your history?")) {
                                                                    const { apiDeleteOrder } = await import('../services/api');
                                                                    await apiDeleteOrder(order.id);
                                                                    addToast("Order removed from history", 'success');
                                                                    loadData();
                                                                }
                                                            }}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'messages' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Messages</h2>
                        <div className="h-[600px] flex gap-4 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            {/* Chat List */}
                            <div className="w-1/3 border-r dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex flex-col">
                                <div className="p-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 font-bold text-gray-800 dark:text-gray-100">Your Conversations</div>
                                <div className="flex-1 overflow-y-auto">
                                    {chats.map(chat => (
                                        <div
                                            key={chat.id}
                                            onClick={() => setSelectedChat(chat)}
                                            className={`p-4 border-b dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${selectedChat?.id === chat.id ? 'bg-blue-50 dark:bg-blue-500/10 border-l-4 border-l-blue-500' : ''}`}
                                        >
                                            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{chat.branchName}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{chat.lastMessage}</p>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 block text-right">{new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    ))}
                                    {chats.length === 0 && <p className="text-center text-gray-400 dark:text-gray-600 p-8 text-sm">No messages yet.</p>}
                                </div>
                            </div>

                            {/* Chat Window */}
                            <div className="flex-1 flex flex-col bg-gray-100 dark:bg-slate-950">
                                {selectedChat ? (
                                    <>
                                        <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                                            <h3 className="font-bold text-gray-800 dark:text-gray-100">{selectedChat.branchName}</h3>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {messages.map(msg => (
                                                <div key={msg.id} className={`flex ${msg.senderID === user?.uid ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[70%] p-3 rounded-lg text-sm shadow-sm ${msg.senderID === user?.uid ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-slate-700'}`}>
                                                        <p>{msg.text}</p>
                                                        <p className={`text-[10px] mt-1 text-right ${msg.senderID === user?.uid ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <form onSubmit={handleSendMessage} className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2">
                                            <input
                                                className="flex-1 border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 rounded-lg px-4 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                placeholder="Type a message..."
                                                value={newMessage}
                                                onChange={e => setNewMessage(e.target.value)}
                                            />
                                            <Button type="submit" size="sm">Send</Button>
                                        </form>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                                        <MessageSquare size={48} className="mb-4 text-gray-300 dark:text-gray-700" />
                                        <p>Select a shop to chat with</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ... (requests and branch-request tabs remain same) ... */}
                {activeTab === 'requests' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Branch Application History</h2>
                        <Card className="!p-0 overflow-hidden border dark:border-slate-800">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
                                        <tr>
                                            <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                                            <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Transaction ID</th>
                                            <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                                            <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Method</th>
                                            <th className="p-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {myRequests.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-400 dark:text-gray-600">No branch applications found.</td>
                                            </tr>
                                        ) : (
                                            myRequests.map(req => (
                                                <tr key={req.id} className="border-b dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="p-4 text-gray-600 dark:text-gray-400">{new Date(req.createdAt).toLocaleDateString()}</td>
                                                    <td className="p-4 font-mono text-gray-500 dark:text-gray-400">{req.trxID}</td>
                                                    <td className="p-4 font-bold text-gray-900">{currency}{req.paymentAmount}</td>
                                                    <td className="p-4 text-gray-600">{req.paymentMethod}</td>
                                                    <td className="p-4">{getStatusBadge(req.status)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'branch-request' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Store className="text-blue-600" /> Branch Partnership
                        </h2>

                        {existingRequest && existingRequest.status === RequestStatus.PENDING ? (
                            <Card className="text-center py-12">
                                <div className="flex flex-col items-center gap-4">
                                    <Clock className="text-yellow-500 w-12 h-12" />
                                    <h3 className="text-xl font-bold">Request Pending</h3>
                                    <p className="text-gray-500 max-w-md">
                                        Your application to become a branch admin is currently under review by our team. You can check the history tab for details.
                                    </p>
                                </div>
                            </Card>
                        ) : existingRequest && existingRequest.status === RequestStatus.APPROVED ? (
                            <Card className="text-center py-12">
                                <div className="flex flex-col items-center gap-4">
                                    <CheckCircle className="text-green-500 w-12 h-12" />
                                    <h3 className="text-xl font-bold">Application Approved</h3>
                                    <p className="text-gray-500 max-w-md">
                                        Congratulations! Your branch request has been approved. You now have access to the Branch Admin Console.
                                    </p>
                                    <Button onClick={handleSwitchToBranch} isLoading={loading} className="mt-4 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200">
                                        <LayoutDashboard size={18} className="mr-2" /> Switch to Branch Console
                                    </Button>
                                </div>
                            </Card>
                        ) : (
                            <BranchRegistrationForm onSuccess={loadData} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
