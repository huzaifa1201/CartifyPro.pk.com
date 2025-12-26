import React, { useEffect, useState } from 'react';
import { apiGetContentPage } from '../services/api';
import { Card } from '../components/UI';
import { Loader2 } from 'lucide-react';

import { useParams } from 'react-router-dom';

interface LegalPageProps {
    pageId?: string;
}

export const LegalPage: React.FC<LegalPageProps> = ({ pageId: propPageId }) => {
    const { pageId: paramPageId } = useParams<{ pageId: string }>();
    const pageId = propPageId || paramPageId || 'about';
    const [data, setData] = useState({ title: '', content: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const page = await apiGetContentPage(pageId);
                setData({ title: page.title, content: page.content });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [pageId]);

    if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">{data.title}</h1>
            <Card className="p-8">
                <div className="prose max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {data.content}
                </div>
            </Card>
        </div>
    );
};
