import { useState } from 'react';
import { X, GitBranch, History, Clock, FolderGit2 } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import BranchManager from './BranchManager';
import CommitHistory from './CommitHistory';
import ActionHistory from './ActionHistory';

type TabType = 'branches' | 'commits' | 'history';

export default function VCSPanel() {
  const { showVCSPanel, setShowVCSPanel } = useEditorStore();
  const [activeTab, setActiveTab] = useState<TabType>('branches');

  if (!showVCSPanel) return null;

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'branches', label: '分支', icon: <GitBranch className="w-4 h-4" /> },
    { key: 'commits', label: '提交', icon: <FolderGit2 className="w-4 h-4" /> },
    { key: 'history', label: '操作历史', icon: <Clock className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col border border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-violet-400" />
            <h2 className="text-xl font-bold text-white">版本控制</h2>
          </div>
          <button
            onClick={() => setShowVCSPanel(false)}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-700 px-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'text-violet-400 border-violet-400'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'branches' && <BranchManager />}
          {activeTab === 'commits' && <CommitHistory />}
          {activeTab === 'history' && <ActionHistory />}
        </div>
      </div>
    </div>
  );
}
