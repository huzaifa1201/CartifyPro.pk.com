import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/UI';
import { ShieldAlert, Home } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="bg-red-50 p-8 rounded-full mb-6">
        <ShieldAlert size={64} className="text-red-600" />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-500 mb-8 max-w-md">
        You do not have the necessary permissions to view this page. If you believe this is an error, please contact support.
      </p>
      <Link to="/">
        <Button size="lg" variant="secondary">
          <Home className="mr-2" size={20} /> Back to Home
        </Button>
      </Link>
    </div>
  );
};