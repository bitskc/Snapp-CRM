import React, { useState } from 'react';
import { Save, Sparkles, Plus, Trash2, Database, Loader2, Edit2 } from 'lucide-react';
import { AppSettings, Product } from '../types';
import { saveSettings, saveProduct, deleteProduct } from '../services/crmService';
import { generateProductDescription } from '../services/geminiService';

interface SettingsPageProps {
  settings: AppSettings;
  products: Product[];
  onSettingsUpdate: (s: AppSettings) => void;
  onProductsUpdate: (p: Product[]) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, products, onSettingsUpdate, onProductsUpdate }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'products'>('general');
  
  // Product State
  const [newProduct, setNewProduct] = useState<Partial<Product>>({});
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
        await saveSettings(localSettings);
        onSettingsUpdate(localSettings);
    } finally {
        setIsSaving(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name) return;
    const product: Product = {
        id: editingId || Math.random().toString(36).substr(2, 9),
        name: newProduct.name,
        description: newProduct.description || ''
    };
    const updated = await saveProduct(product);
    
    // Update local list
    if (editingId) {
        onProductsUpdate(products.map(p => p.id === editingId ? updated : p));
        setEditingId(null);
    } else {
        onProductsUpdate([...products, updated]);
    }
    setNewProduct({});
  };

  const handleEditProduct = (product: Product) => {
      setNewProduct({ name: product.name, description: product.description });
      setEditingId(product.id);
      // Scroll to top of form
      const form = document.getElementById('product-form');
      if (form) form.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setNewProduct({});
      setEditingId(null);
  };

  const handleDeleteProduct = async (id: string) => {
      await deleteProduct(id);
      onProductsUpdate(products.filter(p => p.id !== id));
      if (editingId === id) handleCancelEdit();
  };

  const handleGenerateProductDesc = async () => {
      if (!newProduct.name) return;
      setIsGeneratingDesc(true);
      try {
          const desc = await generateProductDescription(newProduct.name, localSettings.companyDescription);
          setNewProduct(prev => ({...prev, description: desc}));
      } finally {
          setIsGeneratingDesc(false);
      }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
            <h2 className="text-2xl font-bold text-white">Settings</h2>
            <div className="flex gap-4 mt-4 text-sm font-medium text-slate-400">
                <button 
                  onClick={() => setActiveTab('general')}
                  className={`pb-2 border-b-2 transition-colors ${activeTab === 'general' ? 'text-brand-400 border-brand-400' : 'border-transparent hover:text-slate-200'}`}
                >
                    General & Connection
                </button>
                <button 
                  onClick={() => setActiveTab('products')}
                  className={`pb-2 border-b-2 transition-colors ${activeTab === 'products' ? 'text-brand-400 border-brand-400' : 'border-transparent hover:text-slate-200'}`}
                >
                    Products & Services
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
            {activeTab === 'general' && (
                <div className="space-y-8">
                    {/* Google Sheet Connection */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Database size={18} className="text-green-400" /> Google Sheets Backend
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                            Connect a Google Sheet to use as your database. This allows you to bulk paste leads directly into the sheet.
                        </p>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                placeholder="Paste Google Sheet URL..."
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                                value={localSettings.sheetUrl || ''}
                                onChange={(e) => setLocalSettings(prev => ({...prev, sheetUrl: e.target.value}))}
                            />
                            <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium border border-slate-700">
                                Test Connection
                            </button>
                        </div>
                    </div>

                    {/* AI Training Info */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Sparkles size={18} className="text-purple-400" /> AI Context & Training
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Company Name</label>
                                <input 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:border-brand-500 outline-none"
                                    value={localSettings.companyName}
                                    onChange={(e) => setLocalSettings(prev => ({...prev, companyName: e.target.value}))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Company Description</label>
                                <textarea 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:border-brand-500 outline-none h-24"
                                    placeholder="What do you do? This helps AI write better scripts."
                                    value={localSettings.companyDescription}
                                    onChange={(e) => setLocalSettings(prev => ({...prev, companyDescription: e.target.value}))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">About Me / Sales Style</label>
                                <textarea 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:border-brand-500 outline-none h-20"
                                    placeholder="e.g. Friendly, aggressive, consultative..."
                                    value={localSettings.aboutMe}
                                    onChange={(e) => setLocalSettings(prev => ({...prev, aboutMe: e.target.value}))}
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={handleSaveSettings}
                                disabled={isSaving}
                                className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'products' && (
                <div className="space-y-6">
                    <div id="product-form" className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            {editingId ? 'Edit Product' : 'Add New Product'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input 
                                placeholder="Product Name"
                                className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-brand-500"
                                value={newProduct.name || ''}
                                onChange={(e) => setNewProduct(prev => ({...prev, name: e.target.value}))}
                            />
                            <div className="relative">
                                <input 
                                    placeholder="Description (or use AI)"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-brand-500 pr-10"
                                    value={newProduct.description || ''}
                                    onChange={(e) => setNewProduct(prev => ({...prev, description: e.target.value}))}
                                />
                                <button 
                                    onClick={handleGenerateProductDesc}
                                    disabled={!newProduct.name || isGeneratingDesc}
                                    title="Generate with AI"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 disabled:opacity-50"
                                >
                                    {isGeneratingDesc ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSaveProduct}
                                disabled={!newProduct.name}
                                className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={16} /> {editingId ? 'Update Product' : 'Add Product'}
                            </button>
                            {editingId && (
                                <button 
                                    onClick={handleCancelEdit}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800 text-slate-400 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Product Name</th>
                                    <th className="px-6 py-3">Description</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {products.map(product => (
                                    <tr key={product.id} className="hover:bg-slate-800/50 group">
                                        <td className="px-6 py-4 font-medium text-slate-200">{product.name}</td>
                                        <td className="px-6 py-4 text-slate-400">{product.description}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleEditProduct(product)}
                                                    className="text-slate-500 hover:text-brand-400 transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteProduct(product.id)}
                                                    className="text-slate-500 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {products.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                                            No products added yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};