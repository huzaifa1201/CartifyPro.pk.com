import React from 'react';
import { Card, Button } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { Calendar, Download } from 'lucide-react';
import { getCurrency } from '../constants';
import { useAuth } from '../context/AuthContext';

const SALES_DATA = [
    { name: 'Mon', sales: 4000, orders: 24 },
    { name: 'Tue', sales: 3000, orders: 18 },
    { name: 'Wed', sales: 2000, orders: 12 },
    { name: 'Thu', sales: 2780, orders: 30 },
    { name: 'Fri', sales: 1890, orders: 15 },
    { name: 'Sat', sales: 2390, orders: 20 },
    { name: 'Sun', sales: 3490, orders: 28 },
];

export const AdminReportsPage: React.FC = () => {
    const { user } = useAuth();
    const currency = getCurrency(user?.country);
    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
                    <p className="text-gray-500">Platform performance overview.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="bg-white">
                        <Calendar size={16} className="mr-2" /> Last 7 Days
                    </Button>
                    <Button>
                        <Download size={16} className="mr-2" /> Export CSV
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="h-96 p-6">
                    <h3 className="font-bold text-lg mb-6">Revenue Trend</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={SALES_DATA} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `${currency}${value}`} />
                            <Legend />
                            <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>

                <Card className="h-96 p-6">
                    <h3 className="font-bold text-lg mb-6">Orders Volume</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={SALES_DATA} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="p-6 border-b">
                    <h3 className="font-bold text-lg">Recent Transactions</h3>
                </div>
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 font-medium text-gray-500">Date</th>
                            <th className="p-4 font-medium text-gray-500">Branch</th>
                            <th className="p-4 font-medium text-gray-500">Amount</th>
                            <th className="p-4 font-medium text-gray-500">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="p-4">2023-10-24</td>
                            <td className="p-4">TechHub Branch</td>
                            <td className="p-4 font-bold">{currency}1,200</td>
                            <td className="p-4"><span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold">Completed</span></td>
                        </tr>
                        <tr className="border-b">
                            <td className="p-4">2023-10-24</td>
                            <td className="p-4">Fashionista</td>
                            <td className="p-4 font-bold">{currency}85</td>
                            <td className="p-4"><span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs font-bold">Pending</span></td>
                        </tr>
                    </tbody>
                </table>
            </Card>
        </div>
    );
};
