import Toolbar from '@/components/Toolbar';
import FramePanel from '@/components/FramePanel';
import PreviewCanvas from '@/components/PreviewCanvas';
import PropertyPanel from '@/components/PropertyPanel';
import ImportDialog from '@/components/ImportDialog';
import ExportDialog from '@/components/ExportDialog';
import VCSPanel from '@/components/VCSPanel';
import CommitDialog from '@/components/CommitDialog';
import MergeDialog from '@/components/MergeDialog';
import { useEditorStore } from '@/stores/editorStore';

export default function Home() {
  const {
    showImportDialog,
    showExportDialog,
    showVCSPanel,
    showCommitDialog,
    showMergeDialog,
    setShowImportDialog,
    setShowExportDialog,
    setShowVCSPanel,
    setShowCommitDialog,
    setShowMergeDialog,
  } = useEditorStore();

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      <Toolbar />
      <div className="flex-1 flex min-h-0">
        <FramePanel />
        <PreviewCanvas />
        <PropertyPanel />
      </div>
      <ImportDialog open={showImportDialog} onClose={() => setShowImportDialog(false)} />
      <ExportDialog open={showExportDialog} onClose={() => setShowExportDialog(false)} />
      <VCSPanel />
      <CommitDialog open={showCommitDialog} onClose={() => setShowCommitDialog(false)} />
      <MergeDialog open={showMergeDialog} onClose={() => setShowMergeDialog(false)} />
    </div>
  );
}
