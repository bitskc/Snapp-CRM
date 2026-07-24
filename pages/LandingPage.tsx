import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Rocket,
    Zap,
    Search,
    LayoutDashboard,
    MapPin,
    ArrowRight,
    CheckCircle2,
    Shield,
    Bot,
    TrendingUp,
    Users,
    ChevronRight,
    Star,
    Layers,
    Terminal,
    Sparkles,
    Sliders
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // ROI Calculator State
    const [leadsCount, setLeadsCount] = useState(50);
    const [avgDealValue, setAvgDealValue] = useState(2500);
    const estimatedConversionIncrease = Math.round(leadsCount * 0.15 * avgDealValue);
    const hoursSavedPerWeek = Math.round(leadsCount * 0.25);

    const handleGetStarted = () => {
        if (user) {
            navigate('/app');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-500 selection:text-white overflow-x-hidden">
            {/* Header / Navbar */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 transition-all">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                            <Zap className="text-white" size={22} />
                        </div>
                        <div>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                                Snapp CRM
                            </span>
                            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold bg-brand-500/10 text-brand-400 rounded-full border border-brand-500/20">
                                AI-POWERED
                            </span>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#ai-autopilot" className="hover:text-white transition-colors">Sales Autopilot</a>
                        <a href="#calculator" className="hover:text-white transition-colors">ROI Calculator</a>
                        <a href="#mcp" className="hover:text-white transition-colors flex items-center gap-1.5 text-brand-400 font-semibold">
                            <Terminal size={14} /> MCP API
                        </a>
                    </nav>

                    <div className="flex items-center gap-4">
                        {user ? (
                            <button
                                onClick={() => navigate('/app')}
                                className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-brand-500/20"
                            >
                                <LayoutDashboard size={16} /> Open Dashboard
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 transition-colors"
                                >
                                    Sign In
                                </button>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-brand-500/20"
                                >
                                    Get Started <ArrowRight size={16} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-20 pb-24 md:pt-32 md:pb-32 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.25),rgba(255,255,255,0))]"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-brand-400 font-medium mb-8">
                        <Sparkles size={14} /> Built for Field Service Management & B2B Sales
                    </div>

                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl mx-auto leading-none">
                        Supercharge Your Sales Pipeline with <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">AI Autopilot</span>
                    </h1>

                    <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
                        Find qualified HVAC, plumbing, and electrical leads in seconds. Generate hyper-targeted call scripts, automate follow-ups, and run your growth campaigns natively on Netlify.
                    </p>

                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
                        <button
                            onClick={handleGetStarted}
                            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-500 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-xl shadow-brand-600/30 flex items-center justify-center gap-3 text-base"
                        >
                            Launch Snapp CRM <ArrowRight size={20} />
                        </button>
                        <a
                            href="#demo"
                            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold px-8 py-4 rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-2 text-base"
                        >
                            See Demo
                        </a>
                    </div>

                    {/* Feature Pills */}
                    <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-400" /> Free Netlify Database & Auth
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-400" /> Powered by Gemini 2.5 Flash
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-400" /> Model Context Protocol (MCP) Ready
                        </div>
                    </div>

                    {/* App Mockup Preview */}
                    <div id="demo" className="mt-16 relative rounded-2xl border border-slate-800 bg-slate-900/60 p-3 shadow-2xl backdrop-blur-xl max-w-5xl mx-auto">
                        <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800/80 shadow-inner">
                            {/* Window Header */}
                            <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                                    <span className="text-xs text-slate-500 font-mono ml-2">snappcrm.netlify.app/app</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                                        ● Live Netlify DB
                                    </span>
                                </div>
                            </div>
                            {/* Mockup Dashboard Content */}
                            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Cold Leads (12)</span>
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/60 shadow-sm">
                                            <div className="font-semibold text-sm text-white">Apex Plumbing Co.</div>
                                            <div className="text-xs text-slate-400 mt-1">Dallas, TX • Match: 95%</div>
                                        </div>
                                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/60 shadow-sm">
                                            <div className="font-semibold text-sm text-white">Lone Star HVAC</div>
                                            <div className="text-xs text-slate-400 mt-1">Austin, TX • Match: 88%</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Warm Prospects (8)</span>
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/60 shadow-sm">
                                            <div className="font-semibold text-sm text-white">Vortex Electric</div>
                                            <div className="text-xs text-slate-400 mt-1">Houston, TX • Call Script Ready</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live Deals (4)</span>
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="bg-slate-950 p-3 rounded-lg border border-emerald-500/20 shadow-sm">
                                            <div className="font-semibold text-sm text-white">Precision Air Conditioning</div>
                                            <div className="text-xs text-emerald-400 mt-1">$4,500 Contract Pending</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-900 p-4 rounded-xl border border-indigo-500/30 bg-gradient-to-b from-indigo-950/20 to-slate-900">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                            <Zap size={14} /> Sales Plan Queue
                                        </span>
                                    </div>
                                    <div className="bg-slate-950 p-3 rounded-lg border border-indigo-500/20">
                                        <div className="text-xs font-medium text-slate-300">Next Action</div>
                                        <div className="text-xs text-indigo-400 mt-1 font-semibold">Call Owner @ Apex Plumbing</div>
                                        <div className="text-[10px] text-slate-500 mt-2">AI Pitch generated with pain-point objection handling</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-slate-900/50 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto">
                        <h2 className="text-xs font-semibold text-brand-400 uppercase tracking-widest">Complete CRM Engine</h2>
                        <p className="mt-2 text-3xl sm:text-4xl font-bold text-white tracking-tight">
                            Everything You Need to Scale Business Outreach
                        </p>
                        <p className="mt-4 text-slate-400 text-base">
                            Built for modern field service operations, SaaS companies, and B2B growth teams.
                        </p>
                    </div>

                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-slate-700 transition-all">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
                                <Search size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">AI Lead Finder</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Prompt Gemini AI with your ideal customer profile (e.g. "Commercial Plumbing contractors in Texas") to discover real verified business leads instantly.
                            </p>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-slate-700 transition-all">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6">
                                <Zap size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Sales Autopilot Queue</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Automatically prioritize daily sales tasks. AI generates custom call scripts, follow-up emails, and meeting notes tailored to each prospect.
                            </p>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-slate-700 transition-all">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6">
                                <Rocket size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Growth Lab</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Ideate campaign themes, spark social posts for LinkedIn and X, and track engagement opportunities to expand brand presence.
                            </p>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-slate-700 transition-all">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
                                <LayoutDashboard size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Visual Drag & Drop Pipeline</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Organize deals by status (Cold, Warm, Live, Closed). Move leads effortlessly between columns and link custom products or services.
                            </p>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-slate-700 transition-all">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6">
                                <MapPin size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Geocoded Territory Map</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Visualize lead locations on an interactive OpenStreetMap view. Perfect for planning local field sales routes and territory visits.
                            </p>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-slate-700 transition-all">
                            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-6">
                                <Shield size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Zero-Maintenance Architecture</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Native Netlify Database + Netlify Identity authentication. No external DB servers to manage or configure.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ROI Calculator Section */}
            <section id="calculator" className="py-24 border-t border-slate-800 relative">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
                        <div className="text-center max-w-2xl mx-auto mb-10">
                            <h2 className="text-2xl sm:text-3xl font-bold text-white">Estimate Your Sales Pipeline Gain</h2>
                            <p className="text-slate-400 text-sm mt-2">See how much time and potential revenue Snapp CRM saves your team.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm font-semibold mb-2">
                                        <span className="text-slate-300">Target Prospects per Month</span>
                                        <span className="text-brand-400">{leadsCount} Leads</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="10"
                                        max="300"
                                        step="10"
                                        value={leadsCount}
                                        onChange={(e) => setLeadsCount(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm font-semibold mb-2">
                                        <span className="text-slate-300">Average Deal / Contract Value</span>
                                        <span className="text-brand-400">${avgDealValue.toLocaleString()}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="500"
                                        max="10000"
                                        step="250"
                                        value={avgDealValue}
                                        onChange={(e) => setAvgDealValue(parseInt(e.target.value))}
                                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-950 border border-slate-800 p-8 rounded-2xl text-center space-y-6">
                                <div>
                                    <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">Estimated Monthly Pipeline Lift</div>
                                    <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 mt-1">
                                        +${estimatedConversionIncrease.toLocaleString()}
                                    </div>
                                </div>
                                <div className="border-t border-slate-800/80 pt-4">
                                    <div className="text-xs uppercase font-bold text-slate-500 tracking-wider">Time Saved Weekly</div>
                                    <div className="text-2xl font-bold text-brand-400 mt-1">
                                        ~{hoursSavedPerWeek} Hours / week
                                    </div>
                                </div>
                                <button
                                    onClick={handleGetStarted}
                                    className="w-full bg-brand-600 hover:bg-brand-500 text-white font-medium py-3 rounded-lg transition-colors text-sm shadow-lg shadow-brand-500/20"
                                >
                                    Start Prospecting Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* MCP API Section */}
            <section id="mcp" className="py-20 bg-slate-900/40 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20 mb-4">
                                <Terminal size={14} /> AI AGENT INTEGRATION
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                                Model Context Protocol (MCP) Ready
                            </h2>
                            <p className="mt-4 text-slate-400 text-base leading-relaxed">
                                Connect Claude Desktop, Cursor, Perplexity, or custom AI agents directly to your Snapp CRM database. Execute leads queries, generate follow-up scripts, and manage deal pipeline programmatically.
                            </p>
                            <div className="mt-6 space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <CheckCircle2 size={18} className="text-brand-400" /> Streamable HTTP & JSON-RPC 2.0 Transport
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <CheckCircle2 size={18} className="text-brand-400" /> SHA-256 Hashed MCP API Key Management
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-300">
                                    <CheckCircle2 size={18} className="text-brand-400" /> Built for Claude Desktop & Cursor Integration
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 font-mono text-xs text-slate-300 shadow-2xl">
                            <div className="text-slate-500 pb-3 border-b border-slate-800 flex items-center justify-between">
                                <span>~/.cursor/mcp.json</span>
                                <span className="text-[10px] text-emerald-400">JSON-RPC 2.0</span>
                            </div>
                            <pre className="mt-4 text-brand-300 overflow-x-auto">
                                {`{
  "mcpServers": {
    "snapp-crm": {
      "url": "https://snappcrm.netlify.app/.netlify/functions/mcp",
      "headers": {
        "X-MCP-API-Key": "mcp_live_sk_8f9a2b4c6e1d..."
      }
    }
  }
}`}
                            </pre>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-800 bg-slate-950 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                            <Zap size={18} />
                        </div>
                        <span className="font-bold text-white">Snapp CRM</span>
                        <span className="text-xs text-slate-500">© 2026 ServiceSnapp. All rights reserved.</span>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-slate-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#mcp" className="hover:text-white transition-colors">MCP Spec</a>
                        <button onClick={() => navigate('/app')} className="hover:text-white transition-colors">App</button>
                        <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Sign In</button>
                    </div>
                </div>
            </footer>
        </div>
    );
};
