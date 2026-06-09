import { useState, useEffect } from 'react';
import { X, GitCommit, User, AlertCircle, Check, Sparkles } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useVCSStore } from '@/stores/vcsStore';
import { shortenCommitId } from '@/utils/vcs';

interface CommitDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CommitDialog({ open, onClose }: CommitDialogProps) {
  const {
    frames,
    captions,
    crop,
    exportConfig,
    canvasWidth,
    canvasHeight,
  } = useEditorStore();
  const {
    currentBranchName,
    detachedHeadCommitId,
    getCurrentHeadCommit,
    commit,
    hasUncommittedChanges,
  } = useVCSStore();

  const [message, setMessage] = useState('');
  const [author, setAuthor] = useState('user');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [commitResult, setCommitResult] = useState<{ commitId: string } | null>(null);

  const hasChanges = hasUncommittedChanges(
    frames,
    captions,
    crop,
    exportConfig,
    canvasWidth,
    canvasHeight
  );

  const headCommit = getCurrentHeadCommit();

  useEffect(() => {
    if (open) {
      setMessage('');
      setError('');
      setSuccessMsg('');
      setCommitResult(null);
    }
  }, [open]);

  if (!open) return null;

  const handleCommit = () => {
    if (!message.trim()) {
      setError('请输入提交信息');
      return;
    }
    if (!hasChanges) {
      setError('没有可提交的更改');
      return;
    }

    const result = commit(
      message,
      author || 'user',
      frames,
      captions,
      crop,
      exportConfig,
      canvasWidth,
      canvasHeight
    );

    if (result.success && result.commit) {
      setCommitResult({ commitId: result.commit.id });
      setSuccessMsg('提交成功！');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg border border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <GitCommit className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold text-white">提交更改</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-slate-400">当前分支:</span>
            <span className="text-sm font-mono text-violet-400 font-medium">
              {detachedHeadCommitId
                ? `HEAD 分离 @ ${shortenCommitId(detachedHeadCommitId)}`
                : currentBranchName}
            </span>
          </div>

          {!hasChanges && !commitResult && (
            <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              当前没有未提交的更改
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              <Check className="w-4 h-4 flex-shrink-0" />
              {successMsg}
              {commitResult && (
                <span className="font-mono text-xs ml-1">
                  ({shortenCommitId(commitResult.commitId)})
                </span>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              提交信息 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="简短描述本次更改的内容..."
              rows={3}
              disabled={!!commitResult}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500 resize-none disabled:opacity-50"
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
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="user"
              disabled={!!commitResult}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500 disabled:opacity-50"
            />
          </div>

          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>帧数: {frames.length}</span>
              <span>字幕数: {captions.length}</span>
            </div>
            {headCommit && (
              <div className="text-slate-600 pt-1 border-t border-slate-700/50">
                基于提交: <span className="font-mono">{shortenCommitId(headCommit.id)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCommit}
            disabled={!message.trim() || !hasChanges || !!commitResult}
            className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            <GitCommit className="w-4 h-4" />
            提交
          </button>
        </div>
      </div>
    </div>
  );
}
