
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Badge } from '../components/UI';
import { User, Plus, Trash2, Mail, Shield, Loader2 } from 'lucide-react';
import { BranchStaff } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiGetBranchStaff, apiAddBranchStaff, apiDeleteBranchStaff } from '../services/api';

export const BranchStaffPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [staff, setStaff] = useState<BranchStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'Editor' as const });

  useEffect(() => {
      if (user?.branchID) {
          loadStaff();
      }
  }, [user]);

  const loadStaff = async () => {
      if (!user?.branchID) return;
      try {
          const data = await apiGetBranchStaff(user.branchID);
          setStaff(data);
      } catch (e) {
          addToast("Failed to load staff members", 'error');
      } finally {
          setLoading(false);
      }
  };

  const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user?.branchID) return;
      setSubmitting(true);
      try {
          await apiAddBranchStaff({
              branchID: user.branchID,
              name: newStaff.name,
              email: newStaff.email,
              role: newStaff.role,
              addedAt: new Date().toISOString().split('T')[0]
          });
          addToast("Staff member added successfully", 'success');
          setNewStaff({ name: '', email: '', role: 'Editor' });
          setShowForm(false);
          loadStaff();
      } catch (e) {
          addToast("Failed to add staff member", 'error');
      } finally {
          setSubmitting(false);
      }
  };

  const handleDelete = async (staffId: string) => {
      if (!confirm("Are you sure you want to remove this staff member?")) return;
      try {
          await apiDeleteBranchStaff(staffId);
          addToast("Staff member removed", 'success');
          loadStaff();
      } catch (e) {
          addToast("Failed to remove staff", 'error');
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
       <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <Button onClick={() => setShowForm(!showForm)}>
             <Plus size={18} className="mr-2" /> Add Staff Member
          </Button>
       </div>

       {showForm && (
           <Card className="bg-gray-50 border-gray-200 animate-in slide-in-from-top-2">
               <h3 className="font-bold mb-4">Invite New User</h3>
               <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
                  <Input label="Name" placeholder="Jane Doe" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} required containerClassName="md:flex-1 mb-0" />
                  <Input label="Email" type="email" placeholder="jane@example.com" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} required containerClassName="md:flex-1 mb-0" />
                  <div className="w-full md:w-48">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                      <select 
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
                        value={newStaff.role}
                        onChange={e => setNewStaff({...newStaff, role: e.target.value as any})}
                      >
                          <option value="Manager">Manager</option>
                          <option value="Editor">Editor</option>
                          <option value="Viewer">Viewer</option>
                      </select>
                  </div>
                  <Button type="submit" isLoading={submitting}>Invite</Button>
               </form>
           </Card>
       )}

       {loading ? (
           <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600" /></div>
       ) : (
           <Card className="!p-0 overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                   <thead className="bg-gray-50 border-b">
                       <tr>
                           <th className="p-4 font-medium text-gray-500">Employee</th>
                           <th className="p-4 font-medium text-gray-500">Role</th>
                           <th className="p-4 font-medium text-gray-500">Added Date</th>
                           <th className="p-4 font-medium text-gray-500 text-right">Actions</th>
                       </tr>
                   </thead>
                   <tbody>
                       {staff.map(s => (
                           <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                               <td className="p-4">
                                   <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                           {s.name.charAt(0).toUpperCase()}
                                       </div>
                                       <div>
                                           <p className="font-bold text-gray-900">{s.name}</p>
                                           <p className="text-xs text-gray-500">{s.email}</p>
                                       </div>
                                   </div>
                               </td>
                               <td className="p-4">
                                   <Badge color="blue">{s.role}</Badge>
                               </td>
                               <td className="p-4 text-gray-500">{s.addedAt}</td>
                               <td className="p-4 text-right">
                                   <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors">
                                       <Trash2 size={16} />
                                   </button>
                               </td>
                           </tr>
                       ))}
                       {staff.length === 0 && (
                           <tr>
                               <td colSpan={4} className="p-8 text-center text-gray-400">No staff members found.</td>
                           </tr>
                       )}
                   </tbody>
                 </table>
               </div>
           </Card>
       )}
    </div>
  );
};
