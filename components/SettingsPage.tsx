import * as React from 'react';
import { useState, useEffect } from 'react';
import { Save, Sparkles, Plus, Trash2, Database, Loader2, Edit2, GripVertical, Check } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppSettings, Product, StatusConfig } from '../types';
import { generateProductDescription } from '../services/geminiService';
import { useCRM } from '../contexts/CRMContext';
import { useAuth } from '../contexts/AuthContext';

export interface SettingsPageProps {
    settings: AppSettings;
    products: Product[];
}

const COLORS = [
    { name: 'blue', text: 'text-blue-400', bg: 'bg-blue-500', dot: 'bg-blue-500' },
    { name: 'green', text: 'text-green-400', bg: 'bg-green-500', dot: 'bg-green-500' },
    { name: 'yellow', text: 'text-yellow-400', bg: 'bg-yellow-500', dot: 'bg-yellow-500' },
    { name: 'red', text: 'text-red-400', bg: 'bg-red-500', dot: 'bg-red-500' },
    { name: 'purple', text: 'text-purple-400', bg: 'bg-purple-500', dot: 'bg-purple-500' },
    { name: 'orange', text: 'text-orange-400', bg: 'bg-orange-500', dot: 'bg-orange-500' },
    { name: 'pink', text: 'text-pink-400', bg: 'bg-pink-500', dot: 'bg-pink-500' },
    { name: 'gray', text: 'text-slate-400', bg: 'bg-slate-500', dot: 'bg-slate-500' },
];

const getStatusColorClass = (colorName: string) => {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        red: 'bg-red-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500',
        pink: 'bg-pink-500',
        gray: 'bg-slate-500',
    };
    return colorMap[colorName] || 'bg-slate-500';
};

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, products }) => {
    const { updateSettings, saveProduct, deleteProduct } = useCRM();
    const { user } = useAuth();
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'products' | 'statuses'>('general');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Sync local state when external settings change
    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    // Product State
    const [newProduct, setNewProduct] = useState<Partial<Product>>({});
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Status State
    const [newStatusLabel, setNewStatusLabel] = useState('');
    const [newStatusColor, setNewStatusColor] = useState('blue');

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await updateSettings(localSettings);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveProduct = async () => {
        if (!newProduct.name || !user) return;
        const product: Product = {
            id: editingId || Math.random().toString(36).substr(2, 9),
            user_id: user.id,
            name: newProduct.name,
            description: newProduct.description || ''
        };
        await saveProduct(product);
        setNewProduct({});
        setEditingId(null);
    };

    const handleEditProduct = (product: Product) => {
        setNewProduct({ name: product.name, description: product.description });
        setEditingId(product.id);
        const form = document.getElementById('product-form');
        if (form) form.scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setNewProduct({});
        setEditingId(null);
    };

    const handleDeleteProduct = async (id: string) => {
        await deleteProduct(id);
        if (editingId === id) handleCancelEdit();
    };

    const handleGenerateProductDesc = async () => {
        if (!newProduct.name) return;
        setIsGeneratingDesc(true);
        try {
            const desc = await generateProductDescription(newProduct.name, localSettings.companyDescription);
            setNewProduct(prev => ({ ...prev, description: desc }));
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const handleAddStatus = () => {
        if (!newStatusLabel) return;
        const newStatus: StatusConfig = {
            id: newStatusLabel.toUpperCase().replace(/\s+/g, '_'),
            label: newStatusLabel,
            color: newStatusColor,
            order: localSettings.statuses.length
        };
        setLocalSettings(prev => ({
            ...prev,
            statuses: [...prev.statuses, newStatus]
        }));
        setNewStatusLabel('');
    };

    const handleDeleteStatus = (id: string) => {
        setLocalSettings(prev => ({
            ...prev,
            statuses: prev.statuses.filter(s => s.id !== id)
        }));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = localSettings.statuses.findIndex(s => s.id === active.id);
            const newIndex = localSettings.statuses.findIndex(s => s.id === over.id);
            const reordered = arrayMove(localSettings.statuses, oldIndex, newIndex);

            // Update order property
            const withNewOrder = reordered.map((s, i) => ({ ...s, order: i }));
            setLocalSettings(prev => ({ ...prev, statuses: withNewOrder }));
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
                        onClick={() => setActiveTab('statuses')}
                        className={`pb-2 border-b-2 transition-colors ${activeTab === 'statuses' ? 'text-brand-400 border-brand-400' : 'border-transparent hover:text-slate-200'}`}
                    >
                        Pipeline Statuses
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`pb-2 border-b-2 transition-colors ${activeTab === 'products' ? 'text-brand-400 border-brand-400' : 'border-transparent hover:text-slate-200'}`}
                    >
                        Products & Services
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 max-w-4xl custom-scrollbar">
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
                                    onChange={(e) => setLocalSettings(prev => ({ ...prev, sheetUrl: e.target.value }))}
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
                                        onChange={(e) => setLocalSettings(prev => ({ ...prev, companyName: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Company Description</label>
                                    <textarea
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:border-brand-500 outline-none h-24"
                                        placeholder="What do you do? This helps AI write better scripts."
                                        value={localSettings.companyDescription}
                                        onChange={(e) => setLocalSettings(prev => ({ ...prev, companyDescription: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">About Me / Sales Style</label>
                                    <textarea
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:border-brand-500 outline-none h-20"
                                        placeholder="e.g. Friendly, aggressive, consultative..."
                                        value={localSettings.aboutMe}
                                        onChange={(e) => setLocalSettings(prev => ({ ...prev, aboutMe: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end sticky bottom-0 bg-slate-950 p-4 border-t border-slate-800">
                            <button
                                onClick={handleSaveSettings}
                                disabled={isSaving}
                                className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                Save All Changes
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'statuses' && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Pipeline Statuses</h3>
                            <div className="space-y-2 mb-6">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={localSettings.statuses.map(s => s.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {localSettings.statuses.map((status, index) => (
                                            <SortableStatusItem
                                                key={status.id}
                                                status={status}
                                                onDelete={handleDeleteStatus}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>
                            </div>

                            <div className="border-t border-slate-800 pt-4">
                                <h4 className="text-sm font-medium text-slate-400 mb-3">Add New Status</h4>
                                <div className="flex gap-3 items-center">
                                    <input
                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-brand-500"
                                        placeholder="Status Name (e.g. Negotiating)"
                                        value={newStatusLabel}
                                        onChange={(e) => setNewStatusLabel(e.target.value)}
                                    />
                                    <div className="flex gap-1">
                                        {COLORS.map(c => (
                                            <button
                                                key={c.name}
                                                onClick={() => setNewStatusColor(c.name)}
                                                className={`w-8 h-8 rounded-full ${c.dot} transition-transform hover:scale-110 ${newStatusColor === c.name ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleAddStatus}
                                        disabled={!newStatusLabel}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium ml-auto"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end sticky bottom-0 bg-slate-950 p-4 border-t border-slate-800">
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
                                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                                />
                                <div className="relative">
                                    <input
                                        placeholder="Description (or use AI)"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-brand-500 pr-10"
                                        value={newProduct.description || ''}
                                        onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
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

interface SortableStatusItemProps {
    status: StatusConfig;
    onDelete: (id: string) => void;
}

const SortableStatusItem: React.FC<SortableStatusItemProps> = ({ status, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: status.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-3 bg-slate-800 p-3 rounded-lg border border-slate-700 group ${isDragging ? 'ring-2 ring-brand-500 bg-slate-700 shadow-xl opacity-90' : ''}`}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-1"
            >
                <GripVertical size={16} />
            </div>
            <div className={`w-4 h-4 rounded-full ${getStatusColorClass(status.color)} shadow flex-shrink-0`}></div>
            <span className="font-medium text-slate-200 flex-1 truncate">{status.label}</span>
            <span className="text-xs text-slate-500 font-mono hidden md:inline">{status.id}</span>
            <button
                onClick={() => onDelete(status.id)}
                className="text-slate-500 hover:text-red-400 p-1 md:opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
};