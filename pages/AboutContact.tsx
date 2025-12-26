
import React, { useEffect, useState } from 'react';
import { Card, Button, Input } from '../components/UI';
import { Mail, Phone, MapPin, Send, Globe, Award, Users } from 'lucide-react';
import { apiGetContentPage } from '../services/api';

export const AboutContactPage: React.FC = () => {
  const [aboutData, setAboutData] = useState({ title: "Empowering Commerce", content: "We bridge the gap between premium global brands and your doorstep. NexusCart is more than a store; it's a community." });
  const [contactData, setContactData] = useState({ title: "Get in Touch", content: "Have questions about your order, interested in becoming a partner, or just want to say hello? We'd love to hear from you." });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const [about, contact] = await Promise.all([
          apiGetContentPage('about'),
          apiGetContentPage('contact')
        ]);
        setAboutData({ title: about.title, content: about.content });
        setContactData({ title: contact.title, content: contact.content });
      } catch (e) {
        console.error("Failed to load content", e);
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, []);

  return (
    <div className="space-y-12 animate-in fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-100">{aboutData.title}</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto whitespace-pre-wrap">
          {aboutData.content}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center p-8 border-t-4 border-t-blue-500 hover:shadow-lg transition-shadow dark:bg-slate-800 dark:border-slate-700">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe size={24} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Global Reach</h3>
          <p className="text-gray-500 dark:text-gray-400">Connecting sellers from 50+ countries.</p>
        </Card>
        <Card className="text-center p-8 border-t-4 border-t-purple-500 hover:shadow-lg transition-shadow dark:bg-slate-800 dark:border-slate-700">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={24} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">10k+ Users</h3>
          <p className="text-gray-500 dark:text-gray-400">Trusted by thousands of happy customers.</p>
        </Card>
        <Card className="text-center p-8 border-t-4 border-t-green-500 hover:shadow-lg transition-shadow dark:bg-slate-800 dark:border-slate-700">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award size={24} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Premium Quality</h3>
          <p className="text-gray-500 dark:text-gray-400">Only verified authentic products.</p>
        </Card>
      </div>

      {/* Contact Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{contactData.title}</h2>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
            {contactData.content}
          </p>

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-lg text-gray-600 dark:text-gray-400">
                <Mail size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100">Email Us</p>
                <p className="text-gray-500 dark:text-gray-400">support@nexuscart.com</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-lg text-gray-600 dark:text-gray-400">
                <Phone size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100">Call Us</p>
                <p className="text-gray-500 dark:text-gray-400">+1 (555) 123-4567</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 dark:bg-slate-800 rounded-lg text-gray-600 dark:text-gray-400">
                <MapPin size={20} />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-100">Visit Us</p>
                <p className="text-gray-500 dark:text-gray-400">123 Commerce Blvd, Tech City, USA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <Card className="p-8 shadow-xl shadow-blue-50/50 dark:shadow-none dark:bg-slate-800 dark:border-slate-700">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Message Sent (Demo)"); }}>
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" placeholder="John" required containerClassName="mb-0" className="dark:bg-slate-900" />
              <Input label="Last Name" placeholder="Doe" required containerClassName="mb-0" className="dark:bg-slate-900" />
            </div>
            <Input label="Email Address" type="email" placeholder="john@example.com" required containerClassName="mb-0" className="dark:bg-slate-900" />
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
              <textarea
                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                rows={4}
                placeholder="How can we help you?"
                required
              ></textarea>
            </div>
            <Button type="submit" className="w-full text-lg shadow-lg shadow-blue-200 dark:shadow-none">
              <Send size={18} className="mr-2" /> Send Message
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
