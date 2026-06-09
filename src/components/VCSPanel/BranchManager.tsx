import { useState } from 'react';
import {
  GitBranch,
  Plus,
  Trash2,
  SwitchCamera,
  GitMerge,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { useVCSStore } from '@/stores/vcsStore';
import { useEditorStore } from '@/stores/editorStore';
import { formatTimestamp, shortenCommitId } from '@/utils/vcs';

export default function BranchManager() {
  const {
    branches,
    currentBranchName,
    detachedHeadCommitId,
    createBranch,
    deleteBranch,
    switchBranch,
    getBranchCommitCount,
    getCurrentHeadCommit,
  } = useVCSStore();
  const { restoreFromSnapshot, setShowMergeDialog } = useEditorStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchDesc, setNewBranchDesc] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const headCommit = getCurrentHeadCommit();

  const showMessage = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccessMsg('');
    } else {
      setSuccessMsg(msg);
      setError('');
    }
    setTimeout(() => {
      setError('');
      setSuccessMsg('');
    }, 3000);
  };

  const handleCreateBranch = () => {
    const result = createBranch(newBranchName.trim(), newBranchDesc.trim() || undefined);
    if (result.success) {
      setNewBranchName('');
      setNewBranchDesc('');
      setShowCreateForm(false);
      showMessage(result.message);
    } else {
      showMessage(result.message, true);
    }
  };

  const handleSwitchBranch = async (name: string) => {
    const result = switchBranch(name);
    if (result.success) {
      if (result.snapshot) {
        await restoreFromSnapshot(result.snapshot);
      }
      showMessage(result.message);
    } else {
      showMessage(result.message, true);
    }
  };

  const handleDeleteBranch = (name: string) => {
    if (!confirm(`确定删除分支 "${name}"？此操作不可恢复。`)) return;
    const result = deleteBranch(name);
    if (result.success) {
      showMessage(result.message);
    } else {
      showMessage(result.message, true);
    }
  };

  const branchList = Object.values(branches).sort((a, b) => {
    if (a.name === 'main') return -1;
    if (b.name === 'main') return 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="p-6 space-y-6">
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
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-violet-400" />
            分支管理
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            当前分支:
            <span className="text-violet-400 font-mono ml-1">
              {detachedHeadCommitId
                ? `HEAD 分离 @ ${shortenCommitId(detachedHeadCommitId)}`
                : currentBranchName}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建分支
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h4 className="text-sm font-medium text-white mb-3">创建新分支</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">分支名称 *</label>
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="如: feature/new-effect"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">描述（可选）</label>
              <input
                type="text"
                value={newBranchDesc}
                onChange={(e) => setNewBranchDesc(e.target.value)}
                placeholder="分支用途说明"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="text-xs text-slate-500">
              将基于当前
              {headCommit
                ? `提交 ${shortenCommitId(headCommit.id)}`
                : '状态'}
              创建
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleCreateBranch}
                disabled={!newBranchName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Check className="w-4 h-4" />
                创建
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewBranchName('');
                  setNewBranchDesc('');
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <X className="w-4 h-4" />
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {branchList.map((branch) => {
          const isCurrent = branch.name === currentBranchName && !detachedHeadCommitId;
          const commitCount = getBranchCommitCount(branch.name);
          return (
            <div
              key={branch.name}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                isCurrent
                  ? 'bg-violet-500/10 border-violet-500/30'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isCurrent ? 'bg-violet-500/20' : 'bg-slate-700/50'
                  }`}
                >
                  <GitBranch
                    className={`w-5 h-5 ${isCurrent ? 'text-violet-400' : 'text-slate-400'}`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-semibold ${
                        isCurrent ? 'text-violet-400' : 'text-white'
                      }`}
                    >
                      {branch.name}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded-full font-medium">
                        当前
                      </span>
                    )}
                    {branch.name === 'main' && (
                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full font-medium">
                        主分支
                      </span>
                    )}
                  </div>
                  {branch.description && (
                    <p className="text-sm text-slate-400 mt-0.5 truncate">{branch.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>{commitCount} 次提交</span>
                    <span>创建于 {formatTimestamp(branch.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {!isCurrent && (
                  <>
                    <button
                      onClick={() => handleSwitchBranch(branch.name)}
                      title="切换到此分支"
                      className="p-2 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowMergeDialog(true, branch.name)}
                      title="合并此分支到当前分支"
                      className="p-2 hover:bg-slate-700 text-slate-400 hover:text-violet-400 rounded-lg transition-colors"
                    >
                      <GitMerge className="w-4 h-4" />
                    </button>
                  </>
                )}
                {branch.name !== 'main' && (
                  <button
                    onClick={() => handleDeleteBranch(branch.name)}
                    title="删除分支"
                    className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {branchList.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无分支</p>
        </div>
      )}
    </div>
  );
}
