
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCurrency } from '../constants';
import { apiGetOrderById, apiCreateDispute, apiGetUser } from '../services/api';
import { Order, OrderStatus } from '../types';
import { Card, Badge, Button, Input } from '../components/UI';
import { ArrowLeft, Printer, MapPin, Calendar, CreditCard, AlertTriangle, MessageSquare, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const OrderDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState(getCurrency(user?.country));

  // Dispute Modal State
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('Item not received');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (id) {
        setLoading(true);
        const data = await apiGetOrderById(id);
        setOrder(data);
        if (data) {
          const branchID = data.branchID;
          const uid = branchID.replace('branch-', '');
          const branchUser = await apiGetUser(uid);
          if (branchUser) {
            setCurrency(getCurrency(branchUser.country));
          }
        }
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleCreateDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !user) return;

    setDisputeLoading(true);
    try {
      await apiCreateDispute({
        orderID: order.id,
        userID: user.uid,
        branchID: order.branchID,
        reason: disputeReason,
        description: disputeDescription
      });
      addToast("Dispute reported successfully. Admin will review it.", 'success');
      setShowDisputeModal(false);
      setDisputeDescription('');
    } catch (e) {
      addToast("Failed to report issue", 'error');
    } finally {
      setDisputeLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading order details...</div>;
  if (!order) return <div className="p-10 text-center">Order not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/dashboard/user" className="flex items-center text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="mr-2" size={20} /> Back to Orders
        </Link>
        <div className="flex gap-2">
          {order.status !== OrderStatus.PENDING && (
            <Button variant="danger" size="sm" onClick={() => setShowDisputeModal(true)}>
              <AlertTriangle size={16} className="mr-2" /> Report Issue
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2" size={16} /> Print
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden print:shadow-none print:border-none">
        {/* Header */}
        <div className="bg-gray-50 p-6 border-b flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
            <div className="flex items-center gap-2 mt-1 text-gray-500 text-sm">
              <Calendar size={14} /> {new Date(order.createdAt).toLocaleString()}
            </div>
          </div>
          <div>
            <Badge
              color={order.status === OrderStatus.COMPLETED ? 'green' : order.status === OrderStatus.CANCELLED ? 'red' : 'yellow'}
              className="text-lg px-4 py-1"
            >
              {order.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-10 space-y-8">
          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" /> Shipping Address
              </h3>
              <div className="text-gray-600 text-sm leading-relaxed">
                <p className="font-medium text-gray-900">{order.shippingInfo?.fullName || user?.name || 'Customer'}</p>
                <p>{order.shippingInfo?.address || 'N/A'}</p>
                <p>{order.shippingInfo?.city || ''} {order.shippingInfo?.zip || ''}</p>
                <p className="mt-1 font-medium text-blue-600 italic">PH: {order.shippingInfo?.phone || 'N/A'}</p>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard size={18} className="text-blue-600" /> Payment Method
              </h3>
              <div className="text-gray-600 text-sm leading-relaxed">
                <p><strong>Method:</strong> {order.paymentMethod || 'N/A'}</p>
                {order.paymentDetails?.trxID && <p><strong>Trx ID:</strong> {order.paymentDetails.trxID}</p>}
                <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <h3 className="font-bold text-gray-900 mb-4">Order Items</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 font-medium">Product</th>
                    <th className="p-3 font-medium text-center">Quantity</th>
                    <th className="p-3 font-medium text-right">Price</th>
                    <th className="p-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.products.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="p-3 font-medium text-gray-900">{item.name}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right">{currency}{item.price}</td>
                      <td className="p-3 text-right font-bold">{currency}{item.price * item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-full md:w-64 space-y-3">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>{currency}{order.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-3 border-t">
                <span>Total</span>
                <span>{currency}{order.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Dispute Modal */}
      {showDisputeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDisputeModal(false)}></div>
          <Card className="relative w-full max-w-md z-10 p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-red-600 flex items-center gap-2">
                <AlertTriangle size={20} /> Report Issue
              </h3>
              <button onClick={() => setShowDisputeModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateDispute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <select
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-200 outline-none"
                  value={disputeReason}
                  onChange={e => setDisputeReason(e.target.value)}
                >
                  <option>Item not received</option>
                  <option>Item broken / damaged</option>
                  <option>Wrong item sent</option>
                  <option>Item not as described</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-200 outline-none h-24"
                  placeholder="Please describe the issue in detail..."
                  value={disputeDescription}
                  onChange={e => setDisputeDescription(e.target.value)}
                  required
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowDisputeModal(false)}>Cancel</Button>
                <Button type="submit" variant="danger" isLoading={disputeLoading}>Submit Report</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};