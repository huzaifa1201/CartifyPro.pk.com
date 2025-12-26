import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { Button, Card } from '../components/UI';

export const OrderSuccessPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center p-12 space-y-6 animate-in zoom-in duration-300">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <CheckCircle size={48} />
          </div>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-500">
            Thank you for your purchase. We have received your order and are getting it ready for shipment.
          </p>
        </div>

        <div className="space-y-3 pt-6">
          <Link to="/dashboard/user">
            <Button className="w-full bg-blue-600">
              <Package className="mr-2" size={18} /> View My Orders
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="w-full">
              Continue Shopping <ArrowRight className="ml-2" size={18} />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
