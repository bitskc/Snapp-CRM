import { useState, useEffect, FC } from 'react';
import { Rocket, Sparkles, Hammer, Activity, RefreshCw, Copy, ExternalLink, CheckCircle2, XCircle, ChevronRight, Loader2, Plus, Trash2, Pencil } from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';
import {
    fetchGrowthSettings,
    saveGrowthSettings,
    fetchGrowthConcepts,
    saveGrowthConcept,
    fetchGrowthPosts,
    saveGrowthPost,
    deleteGrowthPost,
    fetchEngagementOpportunities,
    saveEngagementOpportunity
} from '../services/crmService';
import {
    generateWeeklyThemeOptions,
    generateDailySparks,
    expandConceptToPost,
    generateOutreachQueries,
    generateReplyTemplates
} from '../services/geminiService';
import {
    GrowthSettings,
    GrowthConcept,
    GrowthPost,
    EngagementOpportunity
} from '../types';

export const GrowthLab: FC = () => {
    const { settings, addToast } = useCRM();
    const [activeTab, setActiveTab] = useState<'spark' | 'forge' | 'pulse'>('spark');
    const [growthSettings, setGrowthSettings] = useState<GrowthSettings | null>(null);
    const [concepts, setConcepts] = useState<GrowthConcept[]>([]);
    const [loading, setLoading] = useState(true);

    // Spark State
    const [themeOptions, setThemeOptions] = useState<{ theme: string, goal: string, reasoning: string }[]>([]);
    const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
    const [isGeneratingSparks, setIsGeneratingSparks] = useState(false);

    // Forge State
    const [selectedConcept, setSelectedConcept] = useState<GrowthConcept | null>(null);
    const [posts, setPosts] = useState<GrowthPost[]>([]);
    const [isExpanding, setIsExpanding] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');

    // Pulse State
    const [opportunities, setOpportunities] = useState<EngagementOpportunity[]>([]);
    const [isGeneratingPulse, setIsGeneratingPulse] = useState(false);

    useEffect(() => {
        loadGrowthData();
    }, []);

    useEffect(() => {
        if (!selectedConcept) {
            setPosts([]);
            return;
        }
        const loadPosts = async () => {
            try {
                const loaded = await fetchGrowthPosts(selectedConcept.id);
                setPosts(loaded);
            } catch (err) {
                console.error('Error loading posts:', err);
                addToast('Failed to load posts', 'error');
            }
        };
        loadPosts();
    }, [selectedConcept]);

    const loadGrowthData = async () => {
        setLoading(true);
        try {
            const gSettings = await fetchGrowthSettings();
            const gConcepts = await fetchGrowthConcepts();
            const gOpps = await fetchEngagementOpportunities();

            setGrowthSettings(gSettings);
            setConcepts(gConcepts);
            setOpportunities(gOpps);
        } catch (err) {
            console.error('Error loading growth data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePickTheme = async (theme: string, goal: string) => {
        try {
            const newSettings = { current_campaign_theme: theme, theme_goal: goal };
            await saveGrowthSettings(newSettings);

            const freshSettings = await fetchGrowthSettings();
            setGrowthSettings(freshSettings);
            setThemeOptions([]);
            addToast('Theme set! Ready to spark ideas.', 'success');
        } catch (err) {
            console.error('Failed to pick theme:', err);
            addToast('Failed to save theme', 'error');
        }
    };

    const handleGenerateThemes = async () => {
        if (!settings) return;
        setIsGeneratingTheme(true);
        try {
            const options = await generateWeeklyThemeOptions(settings);
            setThemeOptions(options);
        } catch (err) {
            console.error('Error generating themes:', err);
            addToast('Failed to generate theme options', 'error');
        } finally {
            setIsGeneratingTheme(false);
        }
    };

    const handleGenerateSparks = async () => {
        if (!growthSettings?.current_campaign_theme || !settings) return;
        setIsGeneratingSparks(true);
        try {
            const sparks = await generateDailySparks(growthSettings.current_campaign_theme, settings);
            const newConcepts = await Promise.all(sparks.map(spark =>
                saveGrowthConcept({
                    topic: spark,
                    theme_snapshot: growthSettings.current_campaign_theme,
                    status: 'RAW'
                })
            ));
            setConcepts(prev => [...newConcepts.reverse(), ...prev]);
            addToast(`${newConcepts.length} sparks generated`, 'success');
        } catch (err) {
            console.error('Error generating sparks:', err);
            addToast('Failed to generate sparks', 'error');
        } finally {
            setIsGeneratingSparks(false);
        }
    };

    const handleIgniteConcept = async (concept: GrowthConcept) => {
        const updated = await saveGrowthConcept({ ...concept, status: 'IGNITED' });
        setConcepts(prev => prev.map(c => c.id === concept.id ? updated : c));
        setSelectedConcept(updated);
        setActiveTab('forge');
    };

    const handleExpandPost = async (platform: 'LINKEDIN' | 'X') => {
        if (!selectedConcept || !growthSettings?.current_campaign_theme || !settings) return;
        setIsExpanding(true);
        try {
            const content = await expandConceptToPost(
                selectedConcept.topic,
                platform,
                growthSettings.current_campaign_theme,
                settings
            );
            const newPost = await saveGrowthPost({
                concept_id: selectedConcept.id,
                platform,
                content,
                status: 'DRAFT'
            });
            setPosts(prev => [...prev, newPost]);
            addToast(`${platform} post created`, 'success');
        } catch (err) {
            console.error('Error expanding post:', err);
            addToast('Failed to generate post', 'error');
        } finally {
            setIsExpanding(false);
        }
    };

    const handleGeneratePulse = async () => {
        if (!growthSettings?.current_campaign_theme) return;
        const theme = growthSettings.current_campaign_theme;
        setIsGeneratingPulse(true);
        try {
            const queries = await generateOutreachQueries(theme);

            const replyResults = await Promise.all(
                queries.map(q => generateReplyTemplates(q.label, theme))
            );

            const newOpps = await Promise.all(
                queries.map((q, i) => saveEngagementOpportunity({
                    query_url: q.url,
                    theme_focus: theme,
                    suggested_reply: replyResults[i].join('\n---\n'),
                    status: 'NEW'
                }))
            );

            setOpportunities(prev => [...newOpps, ...prev]);
            if (newOpps.length > 0) addToast(`${newOpps.length} pulse opportunities generated`, 'success');
        } catch (err) {
            console.error('Error generating pulse:', err);
            addToast('Failed to generate pulse opportunities', 'error');
        } finally {
            setIsGeneratingPulse(false);
        }
    };

    const handleTogglePostStatus = async (post: GrowthPost) => {
        const newStatus = post.status === 'DRAFT' ? 'POSTED' : 'DRAFT';
        try {
            const updated = await saveGrowthPost({ ...post, status: newStatus });
            setPosts(prev => prev.map(p => p.id === post.id ? updated : p));
            addToast(newStatus === 'POSTED' ? 'Post marked as posted' : 'Post reverted to draft', 'success');
        } catch (err) {
            console.error('Error updating post status:', err);
            addToast('Failed to update post status', 'error');
        }
    };

    const handleDeletePost = async (postId: string) => {
        const originalPosts = [...posts];
        setPosts(prev => prev.filter(p => p.id !== postId));
        try {
            await deleteGrowthPost(postId);
            addToast('Post deleted', 'info');
        } catch (err) {
            console.error('Error deleting post:', err);
            setPosts(originalPosts);
            addToast('Failed to delete post', 'error');
        }
    };

    const handleStartEdit = (post: GrowthPost) => {
        setEditingPostId(post.id);
        setEditingContent(post.content);
    };

    const handleSaveEdit = async (post: GrowthPost) => {
        if (editingContent.trim() === post.content) {
            setEditingPostId(null);
            return;
        }
        try {
            const updated = await saveGrowthPost({ ...post, content: editingContent.trim() });
            setPosts(prev => prev.map(p => p.id === post.id ? updated : p));
            addToast('Post updated', 'success');
        } catch (err) {
            console.error('Error saving post edit:', err);
            addToast('Failed to save post edit', 'error');
        } finally {
            setEditingPostId(null);
        }
    };

    const handleCancelEdit = () => {
        setEditingPostId(null);
        setEditingContent('');
    };

    const handleMarkPulseDone = async (opp: EngagementOpportunity) => {
        const updated = await saveEngagementOpportunity({ ...opp, status: 'DONE' });
        setOpportunities(prev => prev.map(o => o.id === opp.id ? updated : o));
    };

    const handleArchiveConcept = async (concept: GrowthConcept) => {
        const updated = await saveGrowthConcept({ ...concept, status: 'ARCHIVED' });
        setConcepts(prev => prev.map(c => c.id === concept.id ? updated : c));
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-slate-950">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
            {/* Header */}
            <header className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Rocket className="text-brand-500" /> Growth Lab
                        </h1>
                        <p className="text-slate-400 text-sm">Strategic B2B SaaS Marketing Engine</p>
                    </div>
                    <div className="flex gap-2 p-1 bg-slate-800 rounded-lg">
                        {(['spark', 'forge', 'pulse'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab
                                    ? 'bg-brand-500 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Weekly Theme Banner */}
                <div className="p-4 rounded-xl border border-brand-500/20 bg-brand-500/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center">
                            <Sparkles className="text-brand-400 w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-brand-400 uppercase font-bold tracking-widest">Weekly Strategic Theme</p>
                            <h2 className="text-lg font-bold text-white">
                                {growthSettings?.current_campaign_theme || 'No theme selected'}
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={handleGenerateThemes}
                        disabled={isGeneratingTheme}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm transition-all border border-slate-700 disabled:opacity-50"
                    >
                        {isGeneratingTheme ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                        {growthSettings?.current_campaign_theme ? 'Pivot Theme' : 'Get Themes'}
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">

                {/* Stage 1: The Spark */}
                {activeTab === 'spark' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        {/* Theme Selection Modal/View if generating */}
                        {themeOptions.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-8 border-b border-slate-800">
                                {themeOptions.map((opt, i) => (
                                    <div key={i} className="p-4 rounded-xl border border-slate-700 bg-slate-900 flex flex-col h-full hover:border-brand-500/50 transition-all group">
                                        <h3 className="font-bold text-white mb-2 group-hover:text-brand-400 transition-colors">{opt.theme}</h3>
                                        <p className="text-sm text-slate-400 flex-1 italic mb-4">"{opt.reasoning}"</p>
                                        <button
                                            onClick={() => handlePickTheme(opt.theme, opt.goal)}
                                            className="w-full py-2 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500 hover:text-white transition-all text-sm font-bold"
                                        >
                                            Select Theme
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="text-yellow-400" /> Raw Ideation
                            </h3>
                            <button
                                onClick={handleGenerateSparks}
                                disabled={isGeneratingSparks || !growthSettings?.current_campaign_theme}
                                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                            >
                                {isGeneratingSparks ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                Daily Sparks
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {concepts.filter(c => c.status !== 'ARCHIVED').length === 0 ? (
                                <div className="col-span-2 py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                                    Generate some Daily Sparks to see them here.
                                </div>
                            ) : (
                                concepts.filter(c => c.status !== 'ARCHIVED').map(concept => (
                                    <div key={concept.id} className={`p-5 rounded-2xl border transition-all ${concept.status === 'IGNITED' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                        }`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest ${concept.status === 'IGNITED' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'
                                                }`}>
                                                {concept.status}
                                            </span>
                                        </div>
                                        <p className="text-white font-medium mb-6 leading-relaxed">
                                            {concept.topic}
                                        </p>
                                        <div className="flex gap-2">
                                            {concept.status === 'RAW' && (
                                                <>
                                                    <button
                                                        onClick={() => handleIgniteConcept(concept)}
                                                        className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all"
                                                    >
                                                        <Plus className="w-4 h-4" /> Ignite
                                                    </button>
                                                    <button
                                                        onClick={() => handleArchiveConcept(concept)}
                                                        className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition-all"
                                                    >
                                                        <XCircle className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                            {concept.status === 'IGNITED' && (
                                                <button
                                                    onClick={() => { setSelectedConcept(concept); setActiveTab('forge'); }}
                                                    className="w-full py-2 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all text-sm font-bold flex items-center justify-center gap-2"
                                                >
                                                    Forge Toolkit <ChevronRight className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Stage 2: The Forge */}
                {activeTab === 'forge' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="flex-1 p-4 rounded-xl bg-slate-900 border border-slate-700">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Active Concept</p>
                                <h3 className="text-white font-bold">{selectedConcept?.topic || 'Select an ignited concept from the Spark stage'}</h3>
                            </div>
                        </div>

                        {selectedConcept && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Expand Controls */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Hammer className="w-4 h-4" /> Expand Media Kit
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        <button
                                            onClick={() => handleExpandPost('LINKEDIN')}
                                            disabled={isExpanding}
                                            className="p-4 rounded-xl border border-slate-700 bg-slate-900 hover:border-brand-500 hover:bg-slate-800 text-left transition-all group"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">LinkedIn</span>
                                                {isExpanding ? <Loader2 className="animate-spin w-4 h-4" /> : <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                            </div>
                                            <p className="text-slate-300 text-sm">Professional, narrative post with value points.</p>
                                        </button>
                                        <button
                                            onClick={() => handleExpandPost('X')}
                                            disabled={isExpanding}
                                            className="p-4 rounded-xl border border-slate-700 bg-slate-900 hover:border-brand-500 hover:bg-slate-800 text-left transition-all group"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-slate-200 text-xs font-bold uppercase tracking-widest">X / Twitter</span>
                                                {isExpanding ? <Loader2 className="animate-spin w-4 h-4" /> : <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                            </div>
                                            <p className="text-slate-300 text-sm">Punchy, viral-leaning hook and thread starter.</p>
                                        </button>
                                    </div>
                                </div>

                                {/* Media Kit Preview */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Toolkit Assets</h4>
                                    <div className="space-y-4">
                                        {posts.filter(p => p.concept_id === selectedConcept?.id).length === 0 ? (
                                            <div className="h-64 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-2xl">
                                                <Activity className="w-8 h-8 mb-2 opacity-20" />
                                                <p className="text-sm italic">Nothing forged yet for this concept.</p>
                                            </div>
                                        ) : (
                                            posts.filter(p => p.concept_id === selectedConcept?.id).map(post => (
                                                <div key={post.id} className="p-4 rounded-xl bg-slate-800 border border-slate-700 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">{post.platform}</span>
                                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                                                post.status === 'POSTED'
                                                                    ? 'bg-green-500/20 text-green-400'
                                                                    : 'bg-slate-700 text-slate-500'
                                                            }`}>
                                                                {post.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleTogglePostStatus(post)}
                                                                title={post.status === 'DRAFT' ? 'Mark as Posted' : 'Revert to Draft'}
                                                                className={`p-1.5 rounded hover:bg-slate-700 transition-all ${
                                                                    post.status === 'POSTED' ? 'text-green-400' : 'text-slate-400 hover:text-green-400'
                                                                }`}
                                                            >
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleStartEdit(post)}
                                                                title="Edit post"
                                                                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => navigator.clipboard.writeText(post.content)}
                                                                title="Copy to clipboard"
                                                                className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeletePost(post.id)}
                                                                title="Delete post"
                                                                className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {editingPostId === post.id ? (
                                                        <div className="space-y-2">
                                                            <textarea
                                                                value={editingContent}
                                                                onChange={e => setEditingContent(e.target.value)}
                                                                autoFocus
                                                                rows={6}
                                                                className="w-full bg-slate-900 text-slate-200 text-xs font-sans rounded-lg p-2 border border-brand-500 resize-none focus:outline-none leading-relaxed"
                                                            />
                                                            <div className="flex gap-2 justify-end">
                                                                <button
                                                                    onClick={handleCancelEdit}
                                                                    className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition-all"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    onClick={() => handleSaveEdit(post)}
                                                                    className="text-xs text-brand-400 hover:text-white px-2 py-1 rounded bg-brand-500/10 hover:bg-brand-500 transition-all"
                                                                >
                                                                    Save
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                                                            {post.content}
                                                        </pre>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Stage 3: The Pulse */}
                {activeTab === 'pulse' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Activity className="text-green-500" /> Community Outreach
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-slate-400 text-sm">Value-first engagement opportunities</p>
                                    <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                    <p className="text-green-400 text-sm font-bold">{opportunities.filter(o => o.status === 'DONE').length} Replying Done</p>
                                </div>
                            </div>
                            <button
                                onClick={handleGeneratePulse}
                                disabled={isGeneratingPulse || !growthSettings?.current_campaign_theme}
                                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                            >
                                {isGeneratingPulse ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                                Scan for Pulse
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {opportunities.length === 0 ? (
                                <div className="py-24 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                                    No pulse opportunities found for this theme yet.
                                </div>
                            ) : (
                                opportunities.map(opp => (
                                    <div key={opp.id} className={`p-5 rounded-2xl border transition-all ${opp.status === 'DONE' ? 'bg-slate-900 border-slate-800 opacity-60' : 'bg-slate-900 border-slate-700 hover:border-green-500/50'
                                        }`}>
                                        <div className="flex flex-col md:flex-row gap-6">
                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-white font-bold flex items-center gap-2">
                                                        {opp.theme_focus} <span className="text-xs text-slate-500 font-normal">at Pulse</span>
                                                    </h4>
                                                    <a
                                                        href={opp.query_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-brand-400 hover:text-brand-300 text-xs font-bold flex items-center gap-1"
                                                    >
                                                        Open Search <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>

                                                <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Suggested Reply</p>
                                                    <p className="text-sm text-slate-300 leading-relaxed italic">
                                                        {opp.suggested_reply?.split('\n---\n')[0]}
                                                    </p>
                                                    <button
                                                        onClick={() => opp.suggested_reply && navigator.clipboard.writeText(opp.suggested_reply.split('\n---\n')[0])}
                                                        className="mt-3 text-xs text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1"
                                                    >
                                                        <Copy className="w-3 h-3" /> Copy Template
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="md:w-32 flex flex-col justify-center">
                                                <button
                                                    onClick={() => handleMarkPulseDone(opp)}
                                                    disabled={opp.status === 'DONE'}
                                                    className={`w-full py-3 rounded-xl flex flex-col items-center justify-center gap-2 border transition-all ${opp.status === 'DONE'
                                                        ? 'bg-green-500/10 border-green-500 text-green-500'
                                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-green-500 hover:text-green-500'
                                                        }`}
                                                >
                                                    <CheckCircle2 className="w-6 h-6" />
                                                    <span className="text-xs font-bold uppercase tracking-widest">{opp.status === 'DONE' ? 'Replied' : 'Mark Done'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GrowthLab;
