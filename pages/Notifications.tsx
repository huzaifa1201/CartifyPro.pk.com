import React, { useEffect, useState } from 'react';
import { apiGetNotifications, apiMarkAllNotificationsRead } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Notification } from '../types';
import { Card, Button } from '../components/UI';
import { Bell, Package, Tag, Info, Check, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user]);

  const load = async () => {
    if (user) {
      try {
        const data = await apiGetNotifications(user.uid);
        setNotifications(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    try {
        await apiMarkAllNotificationsRead(user.uid);
        setNotifications(prev => prev.map(n => ({...n, read: true})));
        addToast("All marked as read", 'success');
    } catch(e) {
        addToast("Failed to update notifications", 'error');
    }
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
           <Bell className="text-blue-600" /> Notifications
        </h1>
        {notifications.some(n => !n.read) && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check size={16} className="mr-1" /> Mark all as read
            </Button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
           <Card className="text-center py-12 text-gray-400">
               <Bell size={40} className="mx-auto mb-4 text-gray-300" />
               <p>No notifications yet.</p>
           </Card>
        ) : (
           notifications.map(n => (
             <div 
               key={n.id} 
               className={`p-4 rounded-xl border flex gap-4 transition-all ${n.read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100 shadow-sm'}`}
             >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                   n.type === 'order' ? 'bg-green-100 text-green-600' :
                   n.type === 'promo' ? 'bg-purple-100 text-purple-600' :
                   'bg-gray-100 text-gray-600'
                }`}>
                   {n.type === 'order' && <Package size={20} />}
                   {n.type === 'promo' && <Tag size={20} />}
                   {n.type === 'system' && <Info size={20} />}
                </div>
                <div className="flex-1">
                   <div className="flex justify-between items-start">
                      <h3 className={`font-bold ${n.read ? 'text-gray-800' : 'text-blue-900'}`}>{n.title}</h3>
                      <span className="text-xs text-gray-400">{new Date(n.date).toLocaleDateString()}</span>
                   </div>
                   <p className="text-gray-600 text-sm mt-1">{n.message}</p>
                </div>
                {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                )}
             </div>
           ))
        )}
      </div>
    </div>
  );
};
