import { useState } from 'react';
import type { DiffResult, FrameDiff, CaptionDiff, EditorSnapshot } from '@/types';
import { diffSnapshots, shortenCommitId } from '@/utils/vcs';
import {
  Image,
  Type,
  Crop,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Edit3,
} from 'lucide-react';

interface DiffViewerProps {
  oldSnapshot: EditorSnapshot;
  newSnapshot: EditorSnapshot;
  oldLabel?: string;
  newLabel?: string;
}

type SectionKey = 'frames' | 'captions' | 'crop' | 'exportConfig';

export default function DiffViewer({
  oldSnapshot,
  newSnapshot,
  oldLabel = '旧版本',
  newLabel = '新版本',
}: DiffViewerProps) {
  const diff: DiffResult = diffSnapshots(oldSnapshot, newSnapshot);
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    new Set(['frames', 'captions', 'crop', 'exportConfig'])
  );

  const toggleSection = (key: SectionKey) => {
    const next = new Set(expandedSections);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setExpandedSections(next);
  };

  const sections: {
    key: SectionKey;
    label: string;
    icon: React.ReactNode;
    hasChanges: boolean;
    count: number;
  }[] = [
    {
      key: 'frames',
      label: '帧',
      icon: <Image className="w-4 h-4" />,
      hasChanges: diff.frameDiffs.length > 0,
      count: diff.frameDiffs.length,
    },
    {
      key: 'captions',
      label: '字幕',
      icon: <Type className="w-4 h-4" />,
      hasChanges: diff.captionDiffs.length > 0,
      count: diff.captionDiffs.length,
    },
    {
      key: 'crop',
      label: '裁剪',
      icon: <Crop className="w-4 h-4" />,
      hasChanges: diff.cropDiff !== null,
      count: diff.cropDiff ? (diff.cropDiff.changedFields?.length ?? 1) : 0,
    },
    {
      key: 'exportConfig',
      label: '导出配置',
      icon: <Settings className="w-4 h-4" />,
      hasChanges: diff.exportConfigDiff !== null,
      count: diff.exportConfigDiff ? (diff.exportConfigDiff.changedFields?.length ?? 1) : 0,
    },
  ];

  if (!diff.hasChanges) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>两个版本之间没有差异</p>
      </div>
    );
  }

  const renderFrameDiff = (frameDiff: FrameDiff, index: number) => {
    const icon =
      frameDiff.type === 'added' ? (
        <Plus className="w-4 h-4 text-green-400" />
      ) : frameDiff.type === 'removed' ? (
        <Minus className="w-4 h-4 text-red-400" />
      ) : (
        <Edit3 className="w-4 h-4 text-yellow-400" />
      );

    const label =
      frameDiff.type === 'added' ? '新增帧' : frameDiff.type === 'removed' ? '删除帧' : '修改帧';

    const frame = frameDiff.type === 'removed' ? frameDiff.oldFrame : frameDiff.newFrame;

    return (
      <div
        key={`${frameDiff.type}-${frameDiff.frameId || index}`}
        className={`p-3 rounded-lg border ${
          frameDiff.type === 'added'
            ? 'bg-green-500/5 border-green-500/20'
            : frameDiff.type === 'removed'
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-yellow-500/5 border-yellow-500/20'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span
            className={`text-sm font-medium ${
              frameDiff.type === 'added'
                ? 'text-green-400'
                : frameDiff.type === 'removed'
                  ? 'text-red-400'
                  : 'text-yellow-400'
            }`}
          >
            {label}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            #{frameDiff.index} {frameDiff.frameId && `(${shortenCommitId(frameDiff.frameId)})`}
          </span>
        </div>
        {frame && (
          <div className="flex gap-3">
            {frameDiff.type === 'modified' && frameDiff.oldFrame && (
              <div className="flex-1">
                <div className="text-xs text-slate-500 mb-1">{oldLabel}</div>
                <img
                  src={frameDiff.oldFrame.imageDataUrl}
                  alt="old"
                  className="w-full h-auto rounded border border-slate-700"
                />
                <div className="text-xs text-slate-400 mt-1">
                  延迟: {frameDiff.oldFrame.delay}ms
                </div>
              </div>
            )}
            <div className="flex-1">
              {frameDiff.type === 'modified' && (
                <div className="text-xs text-slate-500 mb-1">{newLabel}</div>
              )}
              <img
                src={frame.imageDataUrl}
                alt="frame"
                className="w-full h-auto rounded border border-slate-700"
              />
              <div className="text-xs text-slate-400 mt-1">延迟: {frame.delay}ms</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCaptionDiff = (capDiff: CaptionDiff, index: number) => {
    const icon =
      capDiff.type === 'added' ? (
        <Plus className="w-4 h-4 text-green-400" />
      ) : capDiff.type === 'removed' ? (
        <Minus className="w-4 h-4 text-red-400" />
      ) : (
        <Edit3 className="w-4 h-4 text-yellow-400" />
      );

    const caption = capDiff.type === 'removed' ? capDiff.oldCaption : capDiff.newCaption;

    return (
      <div
        key={`${capDiff.type}-${capDiff.captionId}-${index}`}
        className={`p-3 rounded-lg border ${
          capDiff.type === 'added'
            ? 'bg-green-500/5 border-green-500/20'
            : capDiff.type === 'removed'
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-yellow-500/5 border-yellow-500/20'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span
            className={`text-sm font-medium ${
              capDiff.type === 'added'
                ? 'text-green-400'
                : capDiff.type === 'removed'
                  ? 'text-red-400'
                  : 'text-yellow-400'
            }`}
          >
            {capDiff.type === 'added' ? '新增字幕' : capDiff.type === 'removed' ? '删除字幕' : '修改字幕'}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            ({shortenCommitId(capDiff.captionId)})
          </span>
        </div>
        {caption && (
          <div className="space-y-1">
            <div className="text-sm text-white">
              <span className="text-slate-500">文本: </span>
              "{caption.text}"
            </div>
            <div className="text-xs text-slate-400">
              帧范围: [{caption.frameRange[0]}, {caption.frameRange[1]}] | 位置: ({caption.x},{' '}
              {caption.y}) | 字号: {caption.fontSize}px
            </div>
            {capDiff.type === 'modified' && capDiff.changedFields && (
              <div className="mt-2 pt-2 border-t border-slate-700">
                <div className="text-xs text-slate-500 mb-1">变更字段:</div>
                <div className="flex flex-wrap gap-1">
                  {capDiff.changedFields.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs rounded"
                    >
                      {f}
                    </span>
                  ))}
                </div>
                {capDiff.oldCaption && capDiff.newCaption && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-slate-800/50 rounded">
                      <div className="text-slate-500 mb-1">{oldLabel}</div>
                      {capDiff.changedFields.map((f) => (
                        <div key={f} className="text-slate-300">
                          <span className="text-slate-500">{f}: </span>
                          {JSON.stringify((capDiff.oldCaption as Record<string, unknown>)[f])}
                        </div>
                      ))}
                    </div>
                    <div className="p-2 bg-slate-800/50 rounded">
                      <div className="text-slate-500 mb-1">{newLabel}</div>
                      {capDiff.changedFields.map((f) => (
                        <div key={f} className="text-slate-300">
                          <span className="text-slate-500">{f}: </span>
                          {JSON.stringify((capDiff.newCaption as Record<string, unknown>)[f])}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderConfigDiff = (
    title: string,
    oldObj: Record<string, unknown> | undefined,
    newObj: Record<string, unknown> | undefined,
    changedFields: string[] | undefined
  ) => {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-500 mb-2">{oldLabel} - {title}</div>
          {oldObj &&
            (changedFields ?? Object.keys(oldObj)).map((key) => (
              <div key={key} className="text-xs mb-1">
                <span className="text-slate-500">{key}: </span>
                <span className="text-slate-300 font-mono">{JSON.stringify(oldObj[key])}</span>
              </div>
            ))}
        </div>
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-xs text-slate-500 mb-2">{newLabel} - {title}</div>
          {newObj &&
            (changedFields ?? Object.keys(newObj)).map((key) => (
              <div key={key} className="text-xs mb-1">
                <span className="text-slate-500">{key}: </span>
                <span
                  className={`font-mono ${
                    changedFields?.includes(key) ? 'text-yellow-400' : 'text-slate-300'
                  }`}
                >
                  {JSON.stringify(newObj[key])}
                </span>
              </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="px-3 py-1.5 bg-slate-800/50 rounded text-slate-400 text-center border border-slate-700">
          {oldLabel}
        </div>
        <div className="px-3 py-1.5 bg-violet-500/10 rounded text-violet-400 text-center border border-violet-500/30">
          {newLabel}
        </div>
      </div>

      {sections.map((section) => (
        <div
          key={section.key}
          className={`rounded-xl border overflow-hidden ${
            section.hasChanges ? 'border-slate-600' : 'border-slate-700/50 opacity-60'
          }`}
        >
          <button
            onClick={() => toggleSection(section.key)}
            className="w-full flex items-center justify-between p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              {section.icon}
              <span className="text-sm font-medium text-white">{section.label}</span>
              {section.hasChanges && (
                <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded-full">
                  {section.count} 处变更
                </span>
              )}
              {!section.hasChanges && (
                <span className="px-2 py-0.5 bg-slate-700 text-slate-500 text-xs rounded-full">
                  无变更
                </span>
              )}
            </div>
            {expandedSections.has(section.key) ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {expandedSections.has(section.key) && (
            <div className="p-3 space-y-2 bg-slate-900/50">
              {section.key === 'frames' && diff.frameDiffs.length > 0 && (
                <div className="space-y-2">{diff.frameDiffs.map(renderFrameDiff)}</div>
              )}
              {section.key === 'frames' && diff.frameDiffs.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-2">帧没有变化</div>
              )}

              {section.key === 'captions' && diff.captionDiffs.length > 0 && (
                <div className="space-y-2">{diff.captionDiffs.map(renderCaptionDiff)}</div>
              )}
              {section.key === 'captions' && diff.captionDiffs.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-2">字幕没有变化</div>
              )}

              {section.key === 'crop' && diff.cropDiff &&
                renderConfigDiff(
                  '裁剪配置',
                  diff.cropDiff.oldCrop as unknown as Record<string, unknown> | undefined,
                  diff.cropDiff.newCrop as unknown as Record<string, unknown> | undefined,
                  diff.cropDiff.changedFields as unknown as string[] | undefined
                )}
              {section.key === 'crop' && !diff.cropDiff && (
                <div className="text-sm text-slate-500 text-center py-2">裁剪配置没有变化</div>
              )}

              {section.key === 'exportConfig' && diff.exportConfigDiff &&
                renderConfigDiff(
                  '导出配置',
                  diff.exportConfigDiff.oldConfig as unknown as Record<string, unknown> | undefined,
                  diff.exportConfigDiff.newConfig as unknown as Record<string, unknown> | undefined,
                  diff.exportConfigDiff.changedFields as unknown as string[] | undefined
                )}
              {section.key === 'exportConfig' && !diff.exportConfigDiff && (
                <div className="text-sm text-slate-500 text-center py-2">导出配置没有变化</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
