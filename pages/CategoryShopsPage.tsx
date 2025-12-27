
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGetProducts, apiGetUsers, apiGetBranches, apiGetProductsByCategory } from '../services/api';
import { Product, User, UserRole, Branch } from '../types';
import { Card, Button, Badge } from '../components/UI';
import { Store, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ShopData {
  id: string;
  name: string;
  email: string;
  productCount: number;
  logoURL?: string;
  shopCategory?: string;
  description?: string;
}

export const CategoryShopsPage: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const { categoryName } = useParams<{ categoryName: string }>();
  const [shops, setShops] = useState<ShopData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // STRICT: If logged in, must have country. If visitor, allow.
        if (user && !user.country && !isSuperAdmin) {
          setShops([]);
          setLoading(false);
          return;
        }

        // 1. Fetch products in this category (Optimized)
        // We limit to 500 just to be safe, or higher if needed for counting. 
        // Ideally, we shouldn't rely on client-side counting for large datasets.
        const catProducts = await apiGetProductsByCategory(categoryName, user?.country, 200);
        const branchIdsWithProducts = new Set(catProducts.map(p => p.branchID));

        // 2. Fetch branches filtered by country from Firestore
        // apiGetBranches already filters by country and 'approved' status
        const userCountry = user?.country || '';
        const branches = await apiGetBranches(userCountry, isSuperAdmin);

        // 3. Filter branches that have this category OR products in this category
        const matchedBranches = branches.filter(branch => {
          const isCategoryMatch = branch.shopCategory === categoryName;
          const hasProductsInCat = branchIdsWithProducts.has(branch.id);
          return isCategoryMatch || hasProductsInCat;
        });

        // 4. Map to Display Data
        const shopDetails = matchedBranches.map(branch => ({
          id: branch.id,
          name: branch.name,
          email: '', // Branch doesn't have email, but not critical for display
          productCount: catProducts.filter(p => p.branchID === branch.id).length,
          logoURL: branch.logoURL,
          shopCategory: branch.shopCategory,
          description: branch.description
        }));

        setShops(shopDetails);
      } catch (e) {
        console.error("Error loading shops", e);
      } finally {
        setLoading(false);
      }
    };

    if (categoryName) load();
  }, [categoryName, user, isSuperAdmin]);

  if (loading) return <div className="h-[50vh] flex items-center justify-center">Loading shops...</div>;

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex items-center gap-2 text-gray-500 mb-4">
        <Link to="/" className="hover:text-blue-600 flex items-center gap-1"><ArrowLeft size={16} /> Home</Link>
        <span>/</span>
        <span className="font-bold text-gray-900">{categoryName}</span>
      </div>

      <div className="text-center space-y-2 mb-10">
        <h1 className="text-4xl font-bold text-gray-900">Shops in "{categoryName}"</h1>
        <p className="text-gray-500">Select a shop to view their specific products.</p>
      </div>

      {shops.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-slate-800 rounded-xl">
          <Store size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">No Shops Found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {user
              ? (user.country ? `There are currently no shops in "${categoryName}" available in ${user.country}.` : `Please select a country to view shops.`)
              : `There are currently no shops listed in this category.`}
          </p>
          <Link to="/"><Button variant="outline" className="mt-4">Back to Home</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {shops.map(shop => (
            <Link key={shop.id} to={`/shop/${shop.id}`}>
              <Card className="hover:shadow-xl transition-all duration-300 group border-l-4 border-l-blue-500 cursor-pointer h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors overflow-hidden border border-blue-50 shrink-0">
                      {shop.logoURL ? (
                        <img src={shop.logoURL} alt={shop.name} className="w-full h-full object-cover" />
                      ) : (
                        shop.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xl text-gray-900 truncate">{shop.name}</h3>
                      <p className="text-sm text-gray-500">Verified Seller</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 mb-4 space-y-1">
                    <p className="flex justify-between items-center">
                      <span>Category:</span>
                      <Badge color="blue">{shop.shopCategory || 'General'}</Badge>
                    </p>
                    <p className="flex justify-between">
                      <span>Products in {categoryName}:</span>
                      <span className="font-bold">{shop.productCount}</span>
                    </p>
                  </div>
                  {shop.description && <p className="text-sm text-gray-500 line-clamp-2 mb-2">{shop.description}</p>}
                </div>
                <div className="flex items-center text-blue-600 font-bold group-hover:translate-x-2 transition-transform mt-2">
                  View Shop <ArrowRight size={18} className="ml-2" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
