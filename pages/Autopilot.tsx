import { FC } from 'react';
import {
  Zap, Phone, Mail, Share2, FileText, Copy, RefreshCw, CheckCircle2,
  Clock, Loader2, ChevronRight, SkipForward, Sparkles
} from 'lucide-react';
import { useAutopilotQueue } from '../hooks/useAutopilotQueue';
import { useCRM } from '../contexts/CRMContext';
import { AutopilotAction } from '../types';

const ACTION_ICONS: Record<AutopilotAction['actionType'], typeof Phone> = {
  call: Phone,
  email: Mail,
  social: Share2,
  note: FileText,
};

const ACTION_LABELS: Record<AutopilotAction['actionType'], string> = {
  call: 'Call Script',
  email: 'Email',
  social: 'Social Post',
  note: 'Check-in Note',
};

const PriorityDot: FC<{ priority: number }> = ({ priority }) => {
  const color =
    priority >= 8 ? 'bg-green-400' : priority >= 5 ? 'bg-yellow-400' : 'bg-slate-500';
  return <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />;
};

export const AutopilotPage: FC = () => {
  const { addToast } = useCRM();
  const {
    actions,
    pendingActions,
    pendingCount,
    completedCount,
    totalCount,
    isGenerating,
    isLoadingContent,
    activeAction,
    activeActionId,
    generateQueue,
    startAction,
    completeAction,
    snoozeAction,
    skipAction,
    regenerateContent,
    setActiveActionId,
  } = useAutopilotQueue();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard', 'success');
  };

  const handleComplete = async () => {
    if (!activeAction?.content) return;
    const summary = activeAction.content.slice(0, 80).replace(/\n/g, ' ');
    await completeAction(activeAction.id, summary);
  };

  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Skeleton cards for loading state
  const SkeletonCards = () => (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="p-4 rounded-lg bg-slate-800 border border-slate-700 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700 rounded w-1/3" />
              <div className="h-3 bg-slate-700 rounded w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Header */}
      <header className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="text-yellow-400" /> Daily Sales Plan
            </h1>
            <p className="text-slate-400 text-sm">
              {pendingCount > 0
                ? `${pendingCount} action${pendingCount !== 1 ? 's' : ''} remaining`
                : isGenerating
                  ? 'Scanning your pipeline...'
                  : 'All caught up!'}
            </p>
          </div>
          <button
            onClick={generateQueue}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm transition-all border border-slate-700 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="animate-spin w-4 h-4" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {totalCount === 0 ? 'Generate Queue' : 'Refresh Queue'}
          </button>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Queue list */}
        <div className={`${activeActionId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border-r border-slate-800 overflow-y-auto scrollbar-hide`}>
          <div className="p-4 space-y-2">
            {isGenerating && actions.length === 0 ? (
              <SkeletonCards />
            ) : actions.length === 0 ? (
              <div className="py-24 text-center">
                <Sparkles className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 font-medium mb-2">No actions in queue</p>
                <p className="text-slate-600 text-sm mb-6">
                  Generate a queue to get your daily sales plan
                </p>
                <button
                  onClick={generateQueue}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-lg font-bold transition-all disabled:opacity-50"
                >
                  Generate Queue
                </button>
              </div>
            ) : (
              actions.map(action => {
                const Icon = ACTION_ICONS[action.actionType];
                const isActive = action.id === activeActionId;
                const isDone = action.status === 'completed';
                const isSkipped = action.status === 'skipped';
                const statusChanged = (action as any)._statusChanged;

                return (
                  <button
                    key={action.id}
                    onClick={() =>
                      isDone || isSkipped ? null : startAction(action.id)
                    }
                    disabled={isDone || isSkipped}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      isActive
                        ? 'bg-brand-500/10 border-brand-500/50'
                        : isDone
                          ? 'bg-slate-900 border-slate-800 opacity-50'
                          : isSkipped
                            ? 'bg-slate-900 border-slate-800 opacity-30'
                            : statusChanged
                              ? 'bg-slate-900 border-yellow-800/50 opacity-60'
                              : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isDone
                            ? 'bg-green-500/20 text-green-400'
                            : isSkipped
                              ? 'bg-slate-700 text-slate-500'
                              : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <PriorityDot priority={action.priority} />
                          <span
                            className={`text-sm font-medium truncate ${
                              isDone
                                ? 'text-slate-500 line-through'
                                : 'text-white'
                            }`}
                          >
                            {action.leadName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {ACTION_LABELS[action.actionType]}
                          {statusChanged && ' — Status changed'}
                          {isDone && ' — Done'}
                          {isSkipped && ' — Skipped'}
                        </p>
                      </div>
                      {!isDone && !isSkipped && !statusChanged && (
                        <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                      )}
                      {statusChanged && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            skipAction(action.id);
                          }}
                          className="text-xs text-yellow-400 hover:text-yellow-300 px-2 py-1 rounded bg-yellow-500/10"
                        >
                          Skip
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-1">
                      {action.reasoning}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Action workspace */}
        <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide">
          {activeAction ? (
            <div className="flex-1 p-6 max-w-3xl mx-auto w-full space-y-6">
              {/* Action header */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveActionId(null)}
                  className="md:hidden text-slate-400 hover:text-white text-sm"
                >
                  &larr; Back
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {(() => {
                      const Icon = ACTION_ICONS[activeAction.actionType];
                      return <Icon className="w-5 h-5 text-brand-400" />;
                    })()}
                    <span className="text-xs text-brand-400 uppercase font-bold tracking-widest">
                      {ACTION_LABELS[activeAction.actionType]}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {activeAction.leadName}
                  </h2>
                </div>
              </div>

              {/* Contact info */}
              <div className="flex flex-wrap gap-4 text-sm">
                {activeAction.contactName && (
                  <span className="text-slate-400">
                    {activeAction.contactName}
                  </span>
                )}
                {activeAction.email && (
                  <a
                    href={`mailto:${activeAction.email}`}
                    className="text-brand-400 hover:text-brand-300"
                  >
                    {activeAction.email}
                  </a>
                )}
                {activeAction.phone && (
                  <a
                    href={`tel:${activeAction.phone}`}
                    className="text-brand-400 hover:text-brand-300"
                  >
                    {activeAction.phone}
                  </a>
                )}
              </div>

              {/* Reasoning */}
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">
                  Why this action
                </p>
                <p className="text-sm text-slate-300">{activeAction.reasoning}</p>
              </div>

              {/* Generated content */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
                    Generated Content
                  </h3>
                  {activeAction.content && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => regenerateContent(activeAction.id)}
                        disabled={isLoadingContent}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className="w-3 h-3 inline mr-1" />
                        Regenerate
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  {isLoadingContent ? (
                    <div className="flex items-center gap-3 text-slate-400 py-12 justify-center">
                      <Loader2 className="animate-spin w-5 h-5" />
                      <span className="text-sm">Generating content...</span>
                    </div>
                  ) : activeAction.content ? (
                    <div className="prose prose-sm prose-invert max-w-none text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
                      {activeAction.content}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <p className="text-sm">Content will generate when you start this action.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {activeAction.content && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleCopy(activeAction.content!)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 border border-slate-700 transition-all"
                  >
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                  <button
                    onClick={handleComplete}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-bold transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark Complete
                  </button>
                  <button
                    onClick={() => snoozeAction(activeAction.id)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-slate-400 rounded-lg text-sm hover:bg-slate-700 border border-slate-700 transition-all"
                  >
                    <SkipForward className="w-4 h-4" /> Snooze
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                {pendingCount > 0 ? (
                  <>
                    <Clock className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">
                      Select an action to get started
                    </p>
                    <p className="text-slate-600 text-sm mt-1">
                      {pendingCount} action{pendingCount !== 1 ? 's' : ''}{' '}
                      waiting
                    </p>
                  </>
                ) : totalCount > 0 ? (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-white font-bold text-lg">All caught up!</p>
                    <p className="text-slate-400 text-sm mt-1">
                      {completedCount} action{completedCount !== 1 ? 's' : ''}{' '}
                      completed today
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutopilotPage;
