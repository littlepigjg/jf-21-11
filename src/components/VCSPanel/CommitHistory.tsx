import { useState } from 'react';
import {
  FolderGit2,
  User,
  Clock,
  Eye,
  GitCommit,
  ChevronRight,
  ChevronDown,
  X,
} from 'lucide-react';
import type { Commit, EditorSnapshot } from '@/types';
import { useVCSStore } from '@/stores/vcsStore';
import { useEditorStore } from '@/stores/editorStore';
import { formatTimestamp, shortenCommitId } from '@/utils/vcs';
import DiffViewer from './DiffViewer';

export default function CommitHistory() {
  const { getAllCommitsChronological, currentBranchName, branches, getBranchCommits, checkoutCommit } =
    useVCSStore();
  const { restoreFromSnapshot } = useEditorStore();

  const [selectedBranch, setSelectedBranch] = useState<string>('__all__');
  const [expandedCommitId, setExpandedCommitId] = useState<string | null>(null);
  const [diffView, setDiffView] = useState<{
    oldSnap: EditorSnapshot; newSnap: EditorSnapshot; title: string;
  } | null>(null);

  const commits =
    selectedBranch === '__all__'
      ? getAllCommitsChronological()
      : getBranchCommits(selectedBranch);

  const branchNames = Object.keys(branches);

  const handleCheckout = async (commit: Commit) => {
    if (!confirm(`确定检出提交 ${shortenCommitId(commit.id)}？\n这将使工作区切换到此提交的快照。`))
      return;
    const result = checkoutCommit(commit.id);
    if (result.success && result.snapshot) {
      await restoreFromSnapshot(result.snapshot);
    }
  };

  const handleViewDiff = (commit: Commit) => {
    if (commit.parentId) {
      const parentCommit = useVCSStore.getState().commits[commit.parentId];
      if (parentCommit) {
        setDiffView({
          oldSnap: parentCommit.snapshot,
          newSnap: commit.snapshot,
          title: `${shortenCommitId(parentCommit.id)} → ${shortenCommitId(commit.id)}`,
        });
      }
    } else {
      const emptySnap: EditorSnapshot = {
        frames: [],
        captions: [],
        crop: { enabled: false, x: 0, y: 0, width: 0, height: 0 },
        exportConfig: {
          colors: 256, quality: 80, fps: 15, dither: true, repeat: 0, width: 0, height: 0,
        },
        canvasWidth: 0,
        canvasHeight: 0,
      };
      setDiffView({
        oldSnap: emptySnap,
        newSnap: commit.snapshot,
        title: `初始提交 ${shortenCommitId(commit.id)}`,
      });
    }
  };

  const getBranchColor = (branchName: string): string => {
    const colors = [
      'text-violet-400',
      'text-cyan-400',
      'text-green-400',
      'text-yellow-400',
      'text-pink-400',
    ];
    let hash = 0;
    for (let i = 0; i < branchName.length; i++) {
      hash = branchName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="p-6 space-y-4">
      {diffView && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-semibold text-white">差异对比 - {diffView.title}</h3>
              </div>
              <button
                onClick={() => setDiffView(null)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <DiffViewer
                oldSnapshot={diffView.oldSnap}
                newSnapshot={diffView.newSnap}
                oldLabel="父提交"
                newLabel="此提交"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-violet-400" />
            提交历史
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            当前分支: <span className="text-violet-400 font-mono">{currentBranchName}</span>
          </p>
        </div>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
        >
          <option value="__all__">全部分支</option>
          {branchNames.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </div>

      {commits.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <GitCommit className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无提交记录</p>
          <p className="text-sm mt-1">创建一些更改后提交以在此处查看</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-700" />
          <div className="space-y-1">
            {commits.map((commit) => {
              const isExpanded = expandedCommitId === commit.id;
              return (
                <div key={commit.id} className="relative pl-12">
                  <div className="absolute left-3.5 top-4 w-3 h-3 rounded-full bg-violet-500 border-2 border-slate-900" />
                  <div className="bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors overflow-hidden">
                    <button
                      onClick={() => setExpandedCommitId(isExpanded ? null : commit.id)}
                      className="w-full text-left p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-medium truncate">{commit.message}</p>
                            <span className={`px-2 py-0.5 bg-slate-700 text-xs rounded-full font-mono ${getBranchColor(commit.branchName)}`}>
                              {commit.branchName}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1 font-mono">
                              <GitCommit className="w-3 h-3" />
                              {shortenCommitId(commit.id)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {commit.author}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(commit.timestamp)}
                            </span>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 border-t border-slate-700/50">
                      <div className="pt-3 flex items-center gap-2">
                        <button
                          onClick={() => handleViewDiff(commit)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          查看差异
                        </button>
                        <button
                          onClick={() => handleCheckout(commit)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <GitCommit className="w-4 h-4" />
                          检出此提交
                        </button>
                        <div className="text-xs text-slate-500 ml-2">
                          {commit.snapshot.frames.length} 帧 | {commit.snapshot.captions.length} 字幕
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
