import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/UI';
import { FileQuestion, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="bg-blue-50 p-8 rounded-full mb-6">
        <FileQuestion size={64} className="text-blue-600" />
      </div>
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Page Not Found</h1>
      <p className="text-gray-500 mb-8 max-w-md">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link to="/">
        <Button size="lg">
          <Home className="mr-2" size={20} /> Back to Home
        </Button>
      </Link>
    </div>
  );
};