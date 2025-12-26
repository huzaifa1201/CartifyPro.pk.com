import React, { useEffect, useState } from 'react';
import { apiGetCategories, apiSaveCategory, apiDeleteCategory } from '../services/api';
import { Category } from '../types';
import { Card, Button, Input } from '../components/UI';
import { Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', imageURL: '' });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
     loadCategories();
  }, []);

  const loadCategories = async () => {
      const data = await apiGetCategories();
      setCategories(data);
  }

  const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
        await apiSaveCategory(form);
        addToast("Category created successfully", 'success');
        setShowForm(false);
        setForm({ name: '', imageURL: '' });
        loadCategories();
      } catch (e) {
        addToast("Failed to create category", 'error');
      } finally {
        setLoading(false);
      }
  };

  const handleDelete = async (id: string) => {
      if(confirm("Delete this category?")) {
          try {
              await apiDeleteCategory(id);
              addToast("Category deleted", 'success');
              loadCategories();
          } catch (e) {
              addToast("Failed to delete category", 'error');
          }
      }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
       <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
          <Button onClick={() => setShowForm(!showForm)}>
             <Plus size={18} className="mr-2" /> Add Category
          </Button>
       </div>

       {showForm && (
           <Card className="bg-gray-50 border-gray-200 animate-in slide-in-from-top-2">
               <h3 className="font-bold mb-4">New Category</h3>
               <form onSubmit={handleAdd} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Input label="Category Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                     <Input label="Image URL" value={form.imageURL} onChange={e => setForm({...form, imageURL: e.target.value})} required />
                  </div>
                  <div className="flex justify-end gap-2">
                      <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                      <Button type="submit" isLoading={loading}>Create Category</Button>
                  </div>
               </form>
           </Card>
       )}

       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           {categories.map(cat => (
               <Card key={cat.id} className="flex items-center gap-4 hover:shadow-md transition-shadow group relative">
                   <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                       <img src={cat.imageURL} alt={cat.name} className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-1">
                       <h3 className="font-bold text-lg text-gray-900">{cat.name}</h3>
                       <p className="text-sm text-gray-500">{cat.productCount} Products</p>
                   </div>
                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => handleDelete(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full bg-white shadow-sm border border-gray-100"><Trash2 size={18} /></button>
                   </div>
               </Card>
           ))}
           {categories.length === 0 && <div className="col-span-2 text-center text-gray-400 py-10">No categories found.</div>}
       </div>
    </div>
  );
};
