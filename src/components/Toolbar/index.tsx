import {
  FilePlus,
  Upload,
  Download,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Trash2,
  Gauge,
  Sparkles,
  GitBranch,
  GitCommit,
  History,
  GitMerge,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useVCSStore } from '@/stores/vcsStore';
import { shortenCommitId } from '@/utils/vcs';

export default function Toolbar() {
  const {
    frames,
    captions,
    crop,
    exportConfig,
    canvasWidth,
    canvasHeight,
    isPlaying,
    setIsPlaying,
    currentFrameIndex,
    setCurrentFrameIndex,
    setShowImportDialog,
    setShowExportDialog,
    setShowVCSPanel,
    setShowCommitDialog,
    setShowMergeDialog,
    playbackSpeed,
    setPlaybackSpeed,
    clearAll,
  } = useEditorStore();
  const {
    currentBranchName,
    detachedHeadCommitId,
    hasUncommittedChanges,
    getBranchCommitCount,
    isMergeInProgress,
  } = useVCSStore();

  const hasChanges = hasUncommittedChanges(
    frames,
    captions,
    crop,
    exportConfig,
    canvasWidth,
    canvasHeight
  );

  const handlePrevFrame = () => {
    const newIndex = currentFrameIndex > 0 ? currentFrameIndex - 1 : frames.length - 1;
    setCurrentFrameIndex(newIndex);
    useEditorStore.getState().setSelectedFrameIndex(newIndex);
  };

  const handleNextFrame = () => {
    const newIndex = currentFrameIndex < frames.length - 1 ? currentFrameIndex + 1 : 0;
    setCurrentFrameIndex(newIndex);
    useEditorStore.getState().setSelectedFrameIndex(newIndex);
  };

  const togglePlay = () => {
    if (frames.length === 0) return;
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 mr-4">
          <Sparkles className="w-6 h-6 text-violet-400" />
          <span className="text-lg font-bold text-white tracking-tight font-mono">
            GIF Studio
          </span>
        </div>

        <button
          onClick={() => setShowImportDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-violet-500/25"
        >
          <Upload className="w-4 h-4" />
          导入
        </button>

        <button
          onClick={() => clearAll()}
          disabled={frames.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          <FilePlus className="w-4 h-4" />
          新建
        </button>

        <button
          onClick={() => setShowExportDialog(true)}
          disabled={frames.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-cyan-500/25"
        >
          <Download className="w-4 h-4" />
          导出 GIF
        </button>

        <button
          onClick={() => {
            if (frames.length > 0) {
              if (confirm('确定清空所有内容？')) clearAll();
            }
          }}
          disabled={frames.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          清空
        </button>

        <div className="w-px h-6 bg-slate-700 mx-2" />

        <button
          onClick={() => setShowCommitDialog(true)}
          disabled={frames.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-green-500/25 relative"
        >
          <GitCommit className="w-4 h-4" />
          提交
          {hasChanges && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400 border-2 border-slate-900 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setShowMergeDialog(true)}
          disabled={frames.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          <GitMerge className="w-4 h-4" />
          合并
        </button>

        <button
          onClick={() => setShowVCSPanel(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <History className="w-4 h-4" />
          版本控制
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevFrame}
            disabled={frames.length === 0}
            className="p-2 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            disabled={frames.length === 0}
            className={`p-2.5 rounded-lg text-white transition-all disabled:opacity-50 ${
              isPlaying
                ? 'bg-orange-500 hover:bg-orange-400 hover:shadow-lg hover:shadow-orange-500/25'
                : 'bg-violet-600 hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-500/25'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button
            onClick={handleNextFrame}
            disabled={frames.length === 0}
            className="p-2 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg">
          <Gauge className="w-4 h-4 text-cyan-400" />
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="bg-transparent text-slate-200 text-sm outline-none cursor-pointer"
          >
            <option value={0.25} className="bg-slate-800">0.25x</option>
            <option value={0.5} className="bg-slate-800">0.5x</option>
            <option value={1} className="bg-slate-800">1x</option>
            <option value={1.5} className="bg-slate-800">1.5x</option>
            <option value={2} className="bg-slate-800">2x</option>
            <option value={4} className="bg-slate-800">4x</option>
          </select>
        </div>

        <button
          onClick={() => setShowVCSPanel(true)}
          className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-violet-500/50 hover:bg-slate-700 transition-all group"
          title="查看分支和提交历史"
        >
          <GitBranch className="w-4 h-4 text-violet-400" />
          <div className="text-left">
            <div className="text-sm font-mono text-white leading-tight">
              {detachedHeadCommitId
                ? `HEAD @ ${shortenCommitId(detachedHeadCommitId)}`
                : currentBranchName}
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">
              {getBranchCommitCount(currentBranchName)} 次提交
              {isMergeInProgress && <span className="text-yellow-400 ml-1">· 合并中</span>}
            </div>
          </div>
          {hasChanges && !detachedHeadCommitId && (
            <span className="w-2 h-2 rounded-full bg-yellow-400 ml-1" title="有未提交的更改" />
          )}
        </button>

        <div className="text-sm text-slate-400 font-mono">
          {frames.length > 0 ? (
            <span>
              <span className="text-violet-400">{currentFrameIndex + 1}</span>
              <span className="mx-1">/</span>
              <span>{frames.length}</span>
              <span className="ml-3 text-slate-500">帧</span>
            </span>
          ) : (
            <span className="text-slate-500">暂无帧</span>
          )}
        </div>
      </div>
    </div>
  );
}
