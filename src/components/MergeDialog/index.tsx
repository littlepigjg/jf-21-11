import { useState, useEffect, useMemo } from 'react';
import {
  X,
  GitMerge,
  AlertTriangle,
  Check,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  User,
  CheckCircle2,
  XCircle,
  Sparkles,
  Image,
  Type,
  Crop,
  Settings,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useVCSStore } from '@/stores/vcsStore';
import type { ConflictItem, FrameSnapshot, Caption } from '@/types';
import { shortenCommitId } from '@/utils/vcs';
import DiffViewer from '@/components/VCSPanel/DiffViewer';

interface MergeDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function MergeDialog({ open, onClose }: MergeDialogProps) {
  const { mergeSourceBranch, restoreFromSnapshot } = useEditorStore();
  const {
    branches,
    currentBranchName,
    isMergeInProgress,
    pendingMerge,
    startMerge,
    resolveConflict,
    finalizeMerge,
    abortMerge,
  } = useVCSStore();

  const [sourceBranch, setSourceBranch] = useState<string>('');
  const [targetBranch, setTargetBranch] = useState<string>('');
  const [phase, setPhase] = useState<'select' | 'merging' | 'conflicts' | 'done'>('select');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [expandedConflict, setExpandedConflict] = useState<number | null>(null);
  const [mergeAuthor, setMergeAuthor] = useState('user');
  const [mergeMessage, setMergeMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const branchNames = useMemo(() => Object.keys(branches), [branches]);

  useEffect(() => {
    if (open) {
      setSourceBranch(mergeSourceBranch || branchNames.find((b) => b !== currentBranchName) || '');
      setTargetBranch(currentBranchName);
      setPhase(isMergeInProgress ? 'conflicts' : 'select');
      setError('');
      setSuccessMsg('');
      setExpandedConflict(null);
      setMergeAuthor('user');
      setMergeMessage('');
    }
  }, [open, mergeSourceBranch, branchNames, currentBranchName, isMergeInProgress]);

  if (!open) return null;

  const handleStartMerge = () => {
    if (!sourceBranch || !targetBranch) {
      setError('请选择源分支和目标分支');
      return;
    }
    if (sourceBranch === targetBranch) {
      setError('源分支和目标分支不能相同');
      return;
    }

    setError('');
    setPhase('merging');

    setTimeout(() => {
      const result = startMerge(sourceBranch, targetBranch);
      if (result.success) {
        setSuccessMsg(result.message);
        setPhase('done');
        if (result.mergedSnapshot) {
          restoreFromSnapshot(result.mergedSnapshot);
        }
      } else if (result.conflicts && result.conflicts.length > 0) {
        setPhase('conflicts');
        setMergeMessage(`合并分支 "${sourceBranch}" 到 "${targetBranch}"`);
      } else {
        setError(result.message);
        setPhase('select');
      }
    }, 400);
  };

  const handleResolveAll = (resolution: ConflictItem['resolution']) => {
    if (!pendingMerge) return;
    pendingMerge.conflicts.forEach((_, index) => {
      resolveConflict(index, resolution);
    });
  };

  const handleFinalize = () => {
    if (!pendingMerge) return;
    const unresolved = pendingMerge.conflicts.filter((c) => c.resolution === 'pending');
    if (unresolved.length > 0) {
      setError(`还有 ${unresolved.length} 个冲突未解决`);
      return;
    }

    const result = finalizeMerge(mergeMessage, mergeAuthor || 'user');
    if (result.success) {
      setSuccessMsg(result.message);
      setPhase('done');
      if (result.snapshot) {
        restoreFromSnapshot(result.snapshot);
      }
    } else {
      setError(result.message);
    }
  };

  const handleAbort = () => {
    if (confirm('确定中止本次合并？所有冲突解决将丢失。')) {
      abortMerge();
      onClose();
    }
  };

  const handleClose = () => {
    if (phase === 'conflicts') {
      if (!confirm('合并正在进行中，关闭将中止合并。确定吗？')) return;
      abortMerge();
    }
    onClose();
  };

  const getConflictTypeIcon = (type: ConflictItem['type']) => {
    switch (type) {
      case 'frame':
        return <Image className="w-4 h-4" />;
      case 'caption':
        return <Type className="w-4 h-4" />;
      case 'crop':
        return <Crop className="w-4 h-4" />;
      case 'exportConfig':
        return <Settings className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getConflictTypeLabel = (type: ConflictItem['type']) => {
    switch (type) {
      case 'frame':
        return '帧';
      case 'caption':
        return '字幕';
      case 'crop':
        return '裁剪';
      case 'exportConfig':
        return '导出配置';
      default:
        return type;
    }
  };

  const formatValue = (val: unknown): string => {
    if (val === undefined || val === null) return '（无）';
    if (typeof val === 'object') {
      if ((val as FrameSnapshot).imageDataUrl) {
        return `[帧数据 ${(val as FrameSnapshot).width}x${(val as FrameSnapshot).height}]`;      }
      if ((val as Caption).text) {
        return `[字幕: "${(val as Caption).text}"]`;
      }
      return JSON.stringify(val, null, 0);
    }
    return String(val);
  };

  const renderConflictContent = (conflict: ConflictItem, index: number) => {
    const isFrame = conflict.type === 'frame';
    const isCaption = conflict.type === 'caption';

    return (
      <div className="pt-3 space-y-3">
        {isFrame && (
          <div className="grid grid-cols-3 gap-2">
            {conflict.baseValue && (conflict.baseValue as FrameSnapshot).imageDataUrl && (
              <div>
                <div className="text-xs text-slate-500 mb-1">基准版本</div>
                <img
                  src={(conflict.baseValue as FrameSnapshot).imageDataUrl}
                  alt="base"
                  className="w-full h-auto rounded border border-slate-700"
                />
              </div>
            )}
            {conflict.ourValue && (conflict.ourValue as FrameSnapshot).imageDataUrl && (
              <div>
                <div className="text-xs text-cyan-400 mb-1">当前分支 (我们的)</div>
                <img
                  src={(conflict.ourValue as FrameSnapshot).imageDataUrl}
                  alt="ours"
                  className="w-full h-auto rounded border border-cyan-500/50"
                />
              </div>
            )}
            {conflict.theirValue && (conflict.theirValue as FrameSnapshot).imageDataUrl && (
              <div>
                <div className="text-xs text-violet-400 mb-1">源分支 (他们的)</div>
                <img
                  src={(conflict.theirValue as FrameSnapshot).imageDataUrl}
                  alt="theirs"
                  className="w-full h-auto rounded border border-violet-500/50"
                />
              </div>
            )}
          </div>
        )}

        {!isFrame && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-slate-800/50 rounded border border-slate-700">
              <div className="text-slate-500 mb-1">基准版本</div>
              <div className="text-slate-300 break-all">{formatValue(conflict.baseValue)}</div>
            </div>
            <div className="p-2 bg-cyan-500/5 rounded border border-cyan-500/30">
              <div className="text-cyan-400 mb-1">当前分支 (我们的)</div>
              <div className="text-cyan-300 break-all">{formatValue(conflict.ourValue)}</div>
            </div>
            <div className="p-2 bg-violet-500/5 rounded border border-violet-500/30">
              <div className="text-violet-400 mb-1">源分支 (他们的)</div>
              <div className="text-violet-300 break-all">{formatValue(conflict.theirValue)}</div>
            </div>
          </div>
        )}

        {isCaption && conflict.field && (
          <div className="text-xs text-slate-500">
            字幕 ID: <span className="font-mono">{conflict.captionId}</span>
            {' | '}
            字段: <span className="text-yellow-400">{conflict.field}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => resolveConflict(index, 'ours')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              conflict.resolution === 'ours'
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-400'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            使用我们的
          </button>
          <button
            onClick={() => resolveConflict(index, 'theirs')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              conflict.resolution === 'theirs'
                ? 'bg-violet-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-violet-500/20 hover:text-violet-400'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            使用他们的
          </button>
          {conflict.resolution !== 'pending' && (
            <button
              onClick={() => resolveConflict(index, 'pending')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              重置
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderPhase = () => {
    if (phase === 'select') {
      return (
        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                源分支 <span className="text-violet-400">(合并内容来自)</span>
              </label>
              <select
                value={sourceBranch}
                onChange={(e) => setSourceBranch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="">请选择分支</option>
                {branchNames
                  .filter((b) => b !== targetBranch)
                  .map((name) => (
                    <option key={name}>{name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                目标分支 <span className="text-cyan-400">(合并到)</span>
              </label>
              <select
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">请选择分支</option>
                {branchNames
                  .filter((b) => b !== sourceBranch)
                  .map((name) => (
                    <option key={name}>{name}</option>
                  ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 py-4 text-slate-500">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 rounded-full border border-violet-500/30">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-sm text-violet-300 font-mono">{sourceBranch || '源分支'}</span>
            </div>
            <ArrowRightLeft className="w-5 h-5 text-slate-600" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 rounded-full border border-cyan-500/30">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-sm text-cyan-300 font-mono">{targetBranch || '目标分支'}</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
            <p className="font-medium text-slate-400 mb-1">合并说明:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>系统将自动查找两个分支的最近共同祖先</li>
              <li>无冲突的更改将被自动合并</li>
              <li>冲突部分需要您手动选择保留哪个版本</li>
            </ul>
          </div>
        </div>
      );
    }

    if (phase === 'merging') {
      return (
        <div className="p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-slate-300">正在分析差异并执行合并...</p>
        </div>
      );
    }

    if (phase === 'done') {
      return (
        <div className="p-12 text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-lg font-medium text-white">合并完成！</p>
          {successMsg && <p className="text-sm text-slate-400">{successMsg}</p>}
        </div>
      );
    }

    if (phase === 'conflicts' && pendingMerge) {
      const totalConflicts = pendingMerge.conflicts.length;
      const resolvedCount = pendingMerge.conflicts.filter((c) => c.resolution !== 'pending').length;
      const progress = totalConflicts > 0 ? (resolvedCount / totalConflicts) * 100 : 0;

      return (
        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-400">检测到 {totalConflicts} 个冲突</p>
              <p className="text-xs text-yellow-400/70">
                正在合并 <span className="font-mono">{pendingMerge.sourceBranch}</span> →{' '}
                <span className="font-mono">{pendingMerge.targetBranch}</span>
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-mono text-yellow-400">
                {resolvedCount} / {totalConflicts}
              </div>
              <div className="text-xs text-yellow-400/60">已解决</div>
            </div>
          </div>

          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {totalConflicts > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">快速操作:</span>
              <button
                onClick={() => handleResolveAll('ours')}
                className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 text-xs rounded-md hover:bg-cyan-500/20 transition-colors"
              >
                全部使用我们的
              </button>
              <button
                onClick={() => handleResolveAll('theirs')}
                className="px-2.5 py-1 bg-violet-500/10 text-violet-400 text-xs rounded-md hover:bg-violet-500/20 transition-colors"
              >
                全部使用他们的
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-2.5 py-1 bg-slate-700 text-slate-300 text-xs rounded-md hover:bg-slate-600 transition-colors ml-auto"
              >
                {showPreview ? '隐藏' : '显示'}合并预览
              </button>
            </div>
          )}

          {showPreview && pendingMerge.ourCommitId && pendingMerge.theirCommitId && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <DiffViewer
                oldSnapshot={
                  useVCSStore.getState().commits[pendingMerge.ourCommitId]?.snapshot || {
                    frames: [],
                    captions: [],
                    crop: { enabled: false, x: 0, y: 0, width: 0, height: 0 },
                    exportConfig: {
                      colors: 256, quality: 80, fps: 15, dither: true, repeat: 0, width: 0, height: 0,
                    },
                    canvasWidth: 0,
                    canvasHeight: 0,
                  }
                }
                newSnapshot={
                  useVCSStore.getState().commits[pendingMerge.theirCommitId]?.snapshot || {
                    frames: [],
                    captions: [],
                    crop: { enabled: false, x: 0, y: 0, width: 0, height: 0 },
                    exportConfig: {
                      colors: 256, quality: 80, fps: 15, dither: true, repeat: 0, width: 0, height: 0,
                    },
                    canvasWidth: 0,
                    canvasHeight: 0,
                  }
                }
                oldLabel={`目标分支 (${pendingMerge.targetBranch})`}
                newLabel={`源分支 (${pendingMerge.sourceBranch})`}
              />
            </div>
          )}

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {pendingMerge.conflicts.map((conflict, index) => {
              const isExpanded = expandedConflict === index;
              const isResolved = conflict.resolution !== 'pending';
              return (
                <div
                  key={index}
                  className={`rounded-xl border overflow-hidden transition-colors ${
                    isResolved
                      ? 'bg-green-500/5 border-green-500/30'
                      : 'bg-slate-800/50 border-slate-700 hover:border-yellow-500/50'
                  }`}
                >
                  <button
                    onClick={() => setExpandedConflict(isExpanded ? null : index)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isResolved
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {isResolved ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          getConflictTypeIcon(conflict.type)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            冲突 #{index + 1}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">
                            {getConflictTypeLabel(conflict.type)}
                          </span>
                          {conflict.field && (
                            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                              {conflict.field}
                            </span>
                          )}
                          {conflict.index !== undefined && conflict.type === 'frame' && (
                            <span className="text-xs text-slate-500">帧 #{conflict.index}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {isResolved ? (
                            <span className="text-green-400">
                              已解决: {conflict.resolution === 'ours' ? '使用我们的版本' : '使用他们的版本'}
                            </span>
                          ) : (
                            '点击展开查看详情并选择解决方案'
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-slate-700/50">
                      {renderConflictContent(conflict, index)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-700">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                合并提交信息
              </label>
              <input
                type="text"
                value={mergeMessage}
                onChange={(e) => setMergeMessage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  作者
                </span>
              </label>
              <input
                type="text"
                value={mergeAuthor}
                onChange={(e) => setMergeAuthor(e.target.value)}
                placeholder="user"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderFooter = () => {
    if (phase === 'merging' || phase === 'done') {
      return (
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-700">
          <button
            onClick={onClose}
            disabled={phase === 'merging'}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {phase === 'done' ? '完成' : '关闭'}
          </button>
        </div>
      );
    }

    if (phase === 'conflicts') {
      const allResolved =
        pendingMerge && pendingMerge.conflicts.every((c) => c.resolution !== 'pending');
      return (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
          <button
            onClick={handleAbort}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <XCircle className="w-4 h-4" />
            中止合并
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleFinalize}
              disabled={!allResolved}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Check className="w-4 h-4" />
              完成合并
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-700">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleStartMerge}
          disabled={!sourceBranch || !targetBranch || sourceBranch === targetBranch}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          <GitMerge className="w-4 h-4" />
          开始合并
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <GitMerge className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">
              {phase === 'conflicts' ? '解决合并冲突' : phase === 'done' ? '合并完成' : '合并分支'}
            </h2>
            {pendingMerge && (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">
                {pendingMerge.conflicts.filter((c) => c.resolution !== 'pending').length}/
                {pendingMerge.conflicts.length}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">{renderPhase()}</div>

        {renderFooter()}
      </div>
    </div>
  );
}
