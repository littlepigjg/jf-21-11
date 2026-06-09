import {
  Clock,
  GitBranch,
  GitCommit,
  GitMerge,
  Trash2,
  SwitchCamera,
  RotateCcw,
  User,
} from 'lucide-react';
import { useVCSStore } from '@/stores/vcsStore';
import { formatTimestamp, shortenCommitId } from '@/utils/vcs';
import type { VCSAction } from '@/types';

export default function ActionHistory() {
  const { actionHistory } = useVCSStore();

  const getActionIcon = (type: VCSAction['type']) => {
    switch (type) {
      case 'create_branch':
        return <GitBranch className="w-4 h-4 text-green-400" />;
      case 'delete_branch':
        return <Trash2 className="w-4 h-4 text-red-400" />;
      case 'switch_branch':
        return <SwitchCamera className="w-4 h-4 text-cyan-400" />;
      case 'commit':
        return <GitCommit className="w-4 h-4 text-violet-400" />;
      case 'merge':
        return <GitMerge className="w-4 h-4 text-yellow-400" />;
      case 'checkout_commit':
        return <RotateCcw className="w-4 h-4 text-pink-400" />;
      case 'reset':
        return <RotateCcw className="w-4 h-4 text-orange-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionLabel = (type: VCSAction['type']) => {
    switch (type) {
      case 'create_branch':
        return '创建分支';
      case 'delete_branch':
        return '删除分支';
      case 'switch_branch':
        return '切换分支';
      case 'commit':
        return '提交';
      case 'merge':
        return '合并';
      case 'checkout_commit':
        return '检出提交';
      case 'reset':
        return '重置';
      default:
        return type;
    }
  };

  const getActionBgColor = (type: VCSAction['type']) => {
    switch (type) {
      case 'create_branch':
        return 'bg-green-500/10 border-green-500/20';
      case 'delete_branch':
        return 'bg-red-500/10 border-red-500/20';
      case 'switch_branch':
        return 'bg-cyan-500/10 border-cyan-500/20';
      case 'commit':
        return 'bg-violet-500/10 border-violet-500/20';
      case 'merge':
        return 'bg-yellow-500/10 border-yellow-500/20';
      case 'checkout_commit':
        return 'bg-pink-500/10 border-pink-500/20';
      case 'reset':
        return 'bg-orange-500/10 border-orange-500/20';
      default:
        return 'bg-slate-800/50 border-slate-700';
    }
  };

  const formatActionDetails = (action: VCSAction) => {
    const parts: string[] = [];
    if (action.branchName) {
      parts.push(`分支: ${action.branchName}`);
    }
    if (action.targetBranchName) {
      parts.push(`目标: ${action.targetBranchName}`);
    }
    if (action.commitId) {
      parts.push(`提交: ${shortenCommitId(action.commitId)}`);
    }
    if (action.message) {
      parts.push(action.message);
    }
    return parts;
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-violet-400" />
          操作历史
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          记录所有版本控制相关操作（共 {actionHistory.length} 条）
        </p>
      </div>

      {actionHistory.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无操作记录</p>
          <p className="text-sm mt-1">执行的操作将在此处显示</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-700" />
          <div className="space-y-1">
            {actionHistory.map((action, index) => (
              <div key={action.id} className="relative pl-12">
                <div
                  className={`absolute left-3.5 top-4 w-3 h-3 rounded-full border-2 border-slate-900 ${
                    action.type === 'create_branch'
                      ? 'bg-green-500'
                      : action.type === 'delete_branch'
                        ? 'bg-red-500'
                        : action.type === 'switch_branch'
                          ? 'bg-cyan-500'
                          : action.type === 'commit'
                            ? 'bg-violet-500'
                            : action.type === 'merge'
                              ? 'bg-yellow-500'
                              : 'bg-pink-500'
                  }`}
                />
                <div className={`p-4 rounded-xl border ${getActionBgColor(action.type)}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getActionIcon(action.type)}
                        <span className="text-sm font-medium text-white">
                          {getActionLabel(action.type)}
                        </span>
                        <span className="text-xs text-slate-500">#{actionHistory.length - index}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                        {formatActionDetails(action).map((part, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {part}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(action.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
