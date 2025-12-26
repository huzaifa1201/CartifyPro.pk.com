
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { apiCreateOrder, apiGetUser, apiValidateCoupon } from '../services/api';
import { Button, Input, Card, Badge } from '../components/UI';
import { getCurrency } from '../constants';
import { CreditCard, MapPin, Truck, ShieldCheck, ArrowRight, Store, AlertTriangle, Ticket, Check, CheckCircle, ShieldOff } from 'lucide-react';
import { User, BranchPaymentConfig } from '../types';
import { useToast } from '../context/ToastContext';

export const CheckoutPage: React.FC = () => {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const currency = getCurrency(user?.country);

  // State for Branch Data including Delivery Fees
  const [branchData, setBranchData] = useState<Record<string, { name: string, deliveryFee: number, configs: BranchPaymentConfig[] }>>({});
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);

  // Coupon State
  const [coupons, setCoupons] = useState<Record<string, { code: string, discount: number, applied: boolean }>>({});
  const [couponInputs, setCouponInputs] = useState<Record<string, string>>({});

  // Payment State
  const [selectedPayments, setSelectedPayments] = useState<Record<string, string>>({}); // branchID -> providerId
  const [trxIds, setTrxIds] = useState<Record<string, string>>({}); // branchID -> trxID

  const [formData, setFormData] = useState({ fullName: user?.name || '', address: '', city: '', zip: '', phone: '' });

  // Group items by branch
  const itemsByBranch: Record<string, typeof cart> = {};
  cart.forEach(item => {
    if (!itemsByBranch[item.branchID]) itemsByBranch[item.branchID] = [];
    itemsByBranch[item.branchID].push(item);
  });

  useEffect(() => {
    const loadBranchDetails = async () => {
      setIsLoadingBranches(true);
      const branchIds = Object.keys(itemsByBranch);
      const info: Record<string, any> = {};

      // Cache for country methods to avoid redundant fetching
      const countryMethodsCache: Record<string, any[]> = {};

      for (const branchId of branchIds) {
        let uid = branchId.replace('branch-', '');
        let branchUser = await apiGetUser(uid);
        // Fallback
        if (!branchUser || branchUser.branchID !== branchId) {
          const { apiGetUsers } = await import('../services/api');
          const allUsers = await apiGetUsers();
          branchUser = allUsers.find(u => u.branchID === branchId) || null;
        }

        if (branchUser) {
          // New: Enforce Country-Specific Payment Methods
          const country = branchUser.country || 'pakistan'; // Fallback or strict?

          if (!countryMethodsCache[country]) {
            const { apiGetCountryLocalPaymentMethods } = await import('../services/api');
            countryMethodsCache[country] = await apiGetCountryLocalPaymentMethods(country);
          }
          const allowedMethods = countryMethodsCache[country];

          // Filter branch configs to only include those allowed by the country
          const validConfigs = (branchUser.paymentConfig || []).filter(config => {
            if (!config.enabled) return false;
            // Check if providerName exists in allowed list and is enabled there
            const allowed = allowedMethods.find(m => m.name.toLowerCase() === config.providerName.toLowerCase());
            return allowed && allowed.enabled;
          });

          // Also merge global instructions if needed? For now, we use branch instructions but strictly filtered types.

          info[branchId] = {
            name: branchUser.name,
            deliveryFee: branchUser.deliveryFee || 0,
            taxRate: branchUser.taxRate || 0,
            configs: validConfigs,
            isSuspended: branchUser.suspensionUntil && branchUser.suspensionUntil > Date.now()
          };
        } else {
          info[branchId] = { name: 'Unknown Branch', deliveryFee: 0, taxRate: 0, configs: [], isSuspended: false };
        }
      }
      setBranchData(info);
      setIsLoadingBranches(false);
    };

    if (cart.length > 0) {
      loadBranchDetails();
    }
  }, [cart]);

  const handleApplyCoupon = async (branchId: string, orderTotal: number) => {
    const code = couponInputs[branchId];
    if (!code) return;
    const result = await apiValidateCoupon(code.toUpperCase(), branchId, orderTotal);
    if (result.isValid) {
      setCoupons(prev => ({ ...prev, [branchId]: { code: code.toUpperCase(), discount: result.discount, applied: true } }));
      addToast(result.message, 'success');
    } else {
      addToast(result.message, 'error');
      setCoupons(prev => ({ ...prev, [branchId]: { ...prev[branchId], applied: false, discount: 0 } }));
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate Shipping Info
    if (!formData.fullName || !formData.address || !formData.city || !formData.zip || !formData.phone) {
      addToast("Please fill all shipping information including your phone number.", 'error');
      return;
    }

    setLoading(true);

    try {
      await Promise.all(
        Object.entries(itemsByBranch).map(async ([branchID, items]) => {
          const branchSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          const coupon = coupons[branchID];
          const discount = coupon?.applied ? coupon.discount : 0;
          const deliveryFee = branchData[branchID]?.deliveryFee || 0;
          const taxRate = branchData[branchID]?.taxRate || 0;
          const taxableAmount = (branchSubtotal - discount) + deliveryFee;
          const taxAmount = taxableAmount * (taxRate / 100);
          const finalTotal = taxableAmount + taxAmount;

          if (branchData[branchID]?.isSuspended) {
            throw new Error(`The shop "${branchData[branchID]?.name || branchID}" is currently suspended and cannot accept orders.`);
          }

          const selectedProviderId = selectedPayments[branchID];
          const branchConfigs = branchData[branchID]?.configs || [];
          const selectedConfig = branchConfigs.find(c => c.providerId === selectedProviderId);

          if (!selectedProviderId) {
            throw new Error(`Please select a payment method for branch: ${branchData[branchID]?.name || branchID}`);
          }

          const isCOD = selectedConfig?.providerName?.toLowerCase().trim() === 'cash on delivery' || selectedConfig?.providerName?.toUpperCase().trim() === 'COD';

          if (selectedConfig && !isCOD && !trxIds[branchID]) {
            throw new Error(`Please provide Transaction ID for ${selectedConfig.providerName} payment to ${branchData[branchID]?.name}`);
          }

          await apiCreateOrder({
            userID: user.uid,
            branchID: branchID,
            products: items.map(i => ({
              productID: i.id,
              quantity: i.quantity,
              name: i.name,
              price: i.price,
              variantId: i.selectedVariant?.id || null,
              variantName: i.selectedVariant ? `${i.selectedVariant.color} / ${i.selectedVariant.size}` : null
            })),
            totalAmount: finalTotal,
            taxAmount: taxAmount,
            taxRate: taxRate,
            discountAmount: discount,
            shippingCost: deliveryFee,
            finalAmount: finalTotal,
            couponCode: (coupon?.applied ? coupon.code : null) as any,
            shippingInfo: formData,
            paymentMethod: (selectedConfig?.providerName || null) as any,
            paymentDetails: {
              accountTitle: selectedConfig?.accountTitle || null,
              accountNumber: selectedConfig?.accountNumber || null,
              instruction: selectedConfig?.instructions || null,
              trxID: trxIds[branchID] || null
            }
          });
        })
      );
      clearCart();
      addToast("Order placed successfully!", 'success');
      setTimeout(() => { setLoading(false); navigate('/order-success'); }, 1000);
    } catch (error: any) {
      setLoading(false);
      addToast(error?.message || "Failed to place order.", 'error');
    }
  };

  // Calculations
  const grandTotal = Object.entries(itemsByBranch).reduce((acc, [branchId, items]) => {
    const sub = items.reduce((s, i) => s + (i.price * i.quantity), 0);
    const disc = coupons[branchId]?.applied ? coupons[branchId].discount : 0;
    const ship = branchData[branchId]?.deliveryFee || 0;
    const rate = branchData[branchId]?.taxRate || 0;
    const taxableTotal = (sub - disc + ship);
    return acc + taxableTotal + (taxableTotal * (rate / 100));
  }, 0);

  if (cart.length === 0) return <div className="text-center pt-20">Your cart is empty. <Button onClick={() => navigate('/')}>Shop Now</Button></div>;

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12 animate-in slide-in-from-bottom-4">
      <div className="lg:col-span-2 space-y-6">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <Card>
          <h2 className="text-xl font-bold mb-4">Shipping Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Full Name" name="fullName" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required />
            <Input label="Address" name="address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required />
            <Input label="City" name="city" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} required />
            <Input label="Postal Code" name="zip" value={formData.zip} onChange={e => setFormData({ ...formData, zip: e.target.value })} required />
            <Input label="Phone Number" name="phone" placeholder="Enter real phone number" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} required />
          </div>
        </Card>

        <div className="space-y-6">
          {Object.entries(itemsByBranch).map(([branchID, items]) => {
            const branchInfo = branchData[branchID];
            const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const discount = coupons[branchID]?.applied ? coupons[branchID].discount : 0;
            const shipping = branchInfo?.deliveryFee || 0;
            const taxRate = branchInfo?.taxRate || 0;
            const taxableAmount = (subtotal - discount) + shipping;
            const taxAmount = taxableAmount * (taxRate / 100);
            const finalTotal = taxableAmount + taxAmount;

            return (
              <Card key={branchID} className="border-l-4 border-l-blue-600 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex justify-between border-b dark:border-slate-700 pb-2 mb-4">
                  <div className="flex flex-col">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{branchInfo?.name || 'Loading...'}</h3>
                    {branchInfo?.isSuspended && (
                      <span className="text-[10px] text-red-600 font-bold uppercase tracking-tight flex items-center gap-1">
                        <ShieldOff size={10} /> Suspended - Remove items to proceed
                      </span>
                    )}
                  </div>
                  <Badge color={branchInfo?.isSuspended ? 'red' : 'blue'}>{items.length} Items</Badge>
                </div>
                <div className="space-y-3 mb-4">
                  {items.map(item => (
                    <div key={`${item.id}-${item.selectedVariant?.id}`} className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                      <span>{item.quantity}x {item.name} {item.selectedVariant ? `(${item.selectedVariant.color}/${item.selectedVariant.size})` : ''}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-200">{currency}{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Coupon Input */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <input
                    className="flex-1 border dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 rounded-xl px-4 py-3 text-sm uppercase focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
                    placeholder="Enter Coupon Code"
                    value={couponInputs[branchID] || ''}
                    onChange={e => setCouponInputs({ ...couponInputs, [branchID]: e.target.value })}
                  />
                  <Button size="sm" className="h-[46px] sm:w-24 font-bold rounded-xl" onClick={() => handleApplyCoupon(branchID, subtotal)}>Apply</Button>
                </div>

                <div className="border-t dark:border-slate-700 pt-2 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal</span><span>{currency}{subtotal}</span></div>
                  <div className="flex justify-between text-green-600 dark:text-green-500 font-medium"><span>Discount</span><span>-{currency}{discount}</span></div>
                  <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Delivery Fee</span><span>{shipping === 0 ? 'Free' : `${currency}${shipping}`}</span></div>
                  <div className="flex justify-between font-bold text-lg border-t dark:border-slate-700 mt-2 pt-2 text-gray-900 dark:text-gray-100"><span>Total</span><span>{currency}{finalTotal}</span></div>
                </div>

                {/* Payment Selection */}
                <div className="mt-6 border-t pt-4">
                  <h4 className="font-bold mb-3 flex items-center gap-2 text-gray-900 dark:text-gray-100"><CreditCard className="w-4 h-4" /> Payment Method</h4>
                  {branchInfo?.configs && branchInfo.configs.length > 0 ? (
                    <div className="space-y-3">
                      {branchInfo.configs.map(config => (
                        <div key={config.providerId} className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedPayments[branchID] === config.providerId ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'hover:border-gray-400 dark:border-slate-700 dark:hover:border-slate-500'}`} onClick={() => setSelectedPayments({ ...selectedPayments, [branchID]: config.providerId })}>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{config.providerName}</span>
                            {selectedPayments[branchID] === config.providerId && <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                          </div>
                          {selectedPayments[branchID] === config.providerId && (
                            <div className="mt-2 p-3 bg-white dark:bg-slate-900 rounded border dark:border-slate-700 text-xs space-y-2 animate-in fade-in zoom-in-95">
                              {(config.providerName?.toLowerCase().trim() === 'cash on delivery' || config.providerName?.toUpperCase().trim() === 'COD') ? (
                                <div className="py-1">
                                  {config.instructions && <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-900/30 rounded italic">"{config.instructions}"</div>}
                                  <div className="text-blue-600 dark:text-blue-400 font-medium">
                                    <p className="flex items-center gap-2"><CheckCircle size={12} /> No Transaction ID needed for COD.</p>
                                    <p className="flex items-center gap-2 mt-1"><CheckCircle size={12} /> Order will be verified via: <span className="underline font-bold text-gray-900 dark:text-gray-100">{formData.phone || 'Enter above'}</span></p>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px]">Title</p>
                                      <p className="text-gray-900 dark:text-gray-100 font-medium">{config.accountTitle}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px]">Account</p>
                                      <p className="text-gray-900 dark:text-gray-100 font-medium">{config.accountNumber}</p>
                                    </div>
                                  </div>
                                  {config.instructions && <p className="text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-slate-800 p-2 rounded">"{config.instructions}"</p>}
                                  <div className="mt-2 pt-2 border-t dark:border-slate-800">
                                    <label className="block font-bold mb-1 text-gray-700 dark:text-gray-300">Transaction ID:</label>
                                    <input className="w-full border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter Trx ID after payment" value={trxIds[branchID] || ''} onClick={e => e.stopPropagation()} onChange={e => setTrxIds({ ...trxIds, [branchID]: e.target.value })} />
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg flex items-center gap-2 border border-yellow-100 dark:border-yellow-900/30">
                      <AlertTriangle className="w-4 h-4" />
                      No payment methods enabled by this branch.
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-24 border-2 border-blue-600/20 shadow-xl shadow-blue-500/5">
          <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-6 flex items-center justify-between">
            Summary
            <Badge color="blue" className="!px-3 !py-1">Checkout</Badge>
          </h2>
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-gray-600 dark:text-gray-400 font-medium">
              <span>Grand Subtotal</span>
              <span>{currency}{grandTotal.toFixed(2)}</span>
            </div>
            <div className="pt-4 border-t-2 border-dashed dark:border-slate-700 flex justify-between font-black text-3xl text-blue-600 dark:text-blue-400">
              <span>Total</span>
              <span>{currency}{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <Button
            className="w-full !py-6 text-lg font-black tracking-wide shadow-lg shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all"
            onClick={handlePlaceOrder}
            isLoading={loading}
          >
            PLACE SECURE ORDER
          </Button>
          <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-4 font-bold uppercase tracking-widest leading-relaxed">
            Payment handled directly with shops. <br /> Check branch instructions above.
          </p>
        </Card>
      </div>
    </div>
  );
};
