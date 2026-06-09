import type {
  Frame,
  Caption,
  CropConfig,
  ExportConfig,
  FrameSnapshot,
  EditorSnapshot,
  Commit,
  DiffResult,
  FrameDiff,
  CaptionDiff,
  CropDiff,
  ExportConfigDiff,
  ConflictItem,
  MergeResult,
} from '@/types';
import { imageDataToDataURL } from '@/utils/imageUtils';

export function generateCommitId(): string {
  return 'c_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function generateActionId(): string {
  return 'a_' + Math.random().toString(36).slice(2, 10);
}

export function hashImageData(imageData: ImageData): string {
  const { data, width, height } = imageData;
  let hash = 0;
  const step = Math.max(1, Math.floor(data.length / 10000));
  for (let i = 0; i < data.length; i += step) {
    hash = ((hash << 5) - hash + data[i]) | 0;
  }
  return `${width}x${height}_${hash >>> 0}`;
}

export function createFrameSnapshot(frame: Frame): FrameSnapshot {
  return {
    id: frame.id,
    delay: frame.delay,
    width: frame.width,
    height: frame.height,
    disposalMethod: frame.disposalMethod,
    imageDataHash: hashImageData(frame.imageData),
    imageDataUrl: imageDataToDataURL(frame.imageData),
  };
}

export async function frameSnapshotToFrame(snap: FrameSnapshot): Promise<Frame> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = snap.imageDataUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = snap.width;
  canvas.height = snap.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, snap.width, snap.height);
  return {
    id: snap.id,
    delay: snap.delay,
    width: snap.width,
    height: snap.height,
    disposalMethod: snap.disposalMethod,
    imageData: ctx.getImageData(0, 0, snap.width, snap.height),
  };
}

export async function editorSnapshotToState(snap: EditorSnapshot): Promise<{
  frames: Frame[];
  captions: Caption[];
  crop: CropConfig;
  exportConfig: ExportConfig;
  canvasWidth: number;
  canvasHeight: number;
}> {
  const frames = await Promise.all(snap.frames.map(frameSnapshotToFrame));
  return {
    frames,
    captions: JSON.parse(JSON.stringify(snap.captions)),
    crop: JSON.parse(JSON.stringify(snap.crop)),
    exportConfig: JSON.parse(JSON.stringify(snap.exportConfig)),
    canvasWidth: snap.canvasWidth,
    canvasHeight: snap.canvasHeight,
  };
}

export function createEditorSnapshot(
  frames: Frame[],
  captions: Caption[],
  crop: CropConfig,
  exportConfig: ExportConfig,
  canvasWidth: number,
  canvasHeight: number
): EditorSnapshot {
  return {
    frames: frames.map(createFrameSnapshot),
    captions: JSON.parse(JSON.stringify(captions)),
    crop: JSON.parse(JSON.stringify(crop)),
    exportConfig: JSON.parse(JSON.stringify(exportConfig)),
    canvasWidth,
    canvasHeight,
  };
}

export function isSameFrame(a: FrameSnapshot, b: FrameSnapshot): boolean {
  return (
    a.id === b.id &&
    a.delay === b.delay &&
    a.width === b.width &&
    a.height === b.height &&
    a.disposalMethod === b.disposalMethod &&
    a.imageDataHash === b.imageDataHash
  );
}

export function diffFrames(
  oldFrames: FrameSnapshot[],
  newFrames: FrameSnapshot[]
): FrameDiff[] {
  const diffs: FrameDiff[] = [];
  const oldById = new Map(oldFrames.map((f) => [f.id, f]));
  const newById = new Map(newFrames.map((f) => [f.id, f]));

  newFrames.forEach((frame, index) => {
    const oldFrame = oldById.get(frame.id);
    if (!oldFrame) {
      diffs.push({ type: 'added', index, frameId: frame.id, newFrame: frame });
    } else if (!isSameFrame(oldFrame, frame)) {
      diffs.push({
        type: 'modified',
        index,
        frameId: frame.id,
        oldFrame,
        newFrame: frame,
      });
    }
  });

  oldFrames.forEach((frame, index) => {
    if (!newById.has(frame.id)) {
      diffs.push({ type: 'removed', index, frameId: frame.id, oldFrame: frame });
    }
  });

  diffs.sort((a, b) => a.index - b.index);
  return diffs;
}

export function diffCaptions(oldCaptions: Caption[], newCaptions: Caption[]): CaptionDiff[] {
  const diffs: CaptionDiff[] = [];
  const oldById = new Map(oldCaptions.map((c) => [c.id, c]));
  const newById = new Map(newCaptions.map((c) => [c.id, c]));

  newCaptions.forEach((caption) => {
    const oldCaption = oldById.get(caption.id);
    if (!oldCaption) {
      diffs.push({ type: 'added', captionId: caption.id, newCaption: caption });
    } else {
      const changedFields = getCaptionChangedFields(oldCaption, caption);
      if (changedFields.length > 0) {
        diffs.push({
          type: 'modified',
          captionId: caption.id,
          oldCaption,
          newCaption: caption,
          changedFields,
        });
      }
    }
  });

  oldCaptions.forEach((caption) => {
    if (!newById.has(caption.id)) {
      diffs.push({ type: 'removed', captionId: caption.id, oldCaption: caption });
    }
  });

  return diffs;
}

function getCaptionChangedFields(oldC: Caption, newC: Caption): (keyof Caption)[] {
  const fields: (keyof Caption)[] = [];
  (Object.keys(newC) as (keyof Caption)[]).forEach((key) => {
    if (JSON.stringify(oldC[key]) !== JSON.stringify(newC[key])) {
      fields.push(key);
    }
  });
  return fields;
}

export function diffCrop(oldCrop: CropConfig, newCrop: CropConfig): CropDiff | null {
  const changedFields: (keyof CropConfig)[] = [];
  (Object.keys(newCrop) as (keyof CropConfig)[]).forEach((key) => {
    if (oldCrop[key] !== newCrop[key]) {
      changedFields.push(key);
    }
  });
  if (changedFields.length === 0) return null;
  return { oldCrop, newCrop, changedFields };
}

export function diffExportConfig(
  oldConfig: ExportConfig,
  newConfig: ExportConfig
): ExportConfigDiff | null {
  const changedFields: (keyof ExportConfig)[] = [];
  (Object.keys(newConfig) as (keyof ExportConfig)[]).forEach((key) => {
    if (oldConfig[key] !== newConfig[key]) {
      changedFields.push(key);
    }
  });
  if (changedFields.length === 0) return null;
  return { oldConfig, newConfig, changedFields };
}

export function diffSnapshots(oldSnap: EditorSnapshot, newSnap: EditorSnapshot): DiffResult {
  const frameDiffs = diffFrames(oldSnap.frames, newSnap.frames);
  const captionDiffs = diffCaptions(oldSnap.captions, newSnap.captions);
  const cropDiff = diffCrop(oldSnap.crop, newSnap.crop);
  const exportConfigDiff = diffExportConfig(oldSnap.exportConfig, newSnap.exportConfig);

  const hasChanges =
    frameDiffs.length > 0 ||
    captionDiffs.length > 0 ||
    cropDiff !== null ||
    exportConfigDiff !== null;

  return { frameDiffs, captionDiffs, cropDiff, exportConfigDiff, hasChanges };
}

export function findCommonAncestor(
  commits: Record<string, Commit>,
  commitAId: string,
  commitBId: string
): Commit | null {
  const ancestorsA = new Set<string>();
  let current: string | null = commitAId;
  while (current) {
    ancestorsA.add(current);
    const commit = commits[current];
    current = commit ? commit.parentId : null;
  }

  current = commitBId;
  while (current) {
    if (ancestorsA.has(current)) {
      return commits[current] || null;
    }
    const commit = commits[current];
    current = commit ? commit.parentId : null;
  }
  return null;
}

export function mergeSnapshots(
  baseSnap: EditorSnapshot,
  ourSnap: EditorSnapshot,
  theirSnap: EditorSnapshot
): MergeResult {
  const conflicts: ConflictItem[] = [];
  const ourFrameDiffs = diffFrames(baseSnap.frames, ourSnap.frames);
  const theirFrameDiffs = diffFrames(baseSnap.frames, theirSnap.frames);

  const mergedFrames = [...baseSnap.frames];
  const processedFrameIds = new Set<string>();

  ourFrameDiffs.forEach((diff) => {
    if (diff.type === 'added' && diff.newFrame) {
      mergedFrames.splice(diff.index, 0, diff.newFrame);
      processedFrameIds.add(diff.frameId!);
    } else if (diff.type === 'modified' && diff.newFrame) {
      const idx = mergedFrames.findIndex((f) => f.id === diff.frameId);
      if (idx !== -1) mergedFrames[idx] = diff.newFrame;
      processedFrameIds.add(diff.frameId!);
    } else if (diff.type === 'removed') {
      const idx = mergedFrames.findIndex((f) => f.id === diff.frameId);
      if (idx !== -1) mergedFrames.splice(idx, 1);
      processedFrameIds.add(diff.frameId!);
    }
  });

  theirFrameDiffs.forEach((diff) => {
    if (processedFrameIds.has(diff.frameId!)) {
      const ourDiff = ourFrameDiffs.find((d) => d.frameId === diff.frameId);
      if (ourDiff && JSON.stringify(ourDiff) !== JSON.stringify(diff)) {
        conflicts.push({
          type: 'frame',
          index: diff.index,
          frameId: diff.frameId,
          baseValue: baseSnap.frames.find((f) => f.id === diff.frameId),
          ourValue: ourDiff?.newFrame || ourDiff?.oldFrame,
          theirValue: diff.newFrame || diff.oldFrame,
          resolution: 'pending',
        });
      }
      return;
    }

    if (diff.type === 'added' && diff.newFrame) {
      mergedFrames.splice(diff.index, 0, diff.newFrame);
    } else if (diff.type === 'modified' && diff.newFrame) {
      const idx = mergedFrames.findIndex((f) => f.id === diff.frameId);
      if (idx !== -1) mergedFrames[idx] = diff.newFrame;
    } else if (diff.type === 'removed') {
      const idx = mergedFrames.findIndex((f) => f.id === diff.frameId);
      if (idx !== -1) mergedFrames.splice(idx, 1);
    }
  });

  const mergedCaptions: Caption[] = [];
  const captionIds = new Set([
    ...ourSnap.captions.map((c) => c.id),
    ...theirSnap.captions.map((c) => c.id),
  ]);

  captionIds.forEach((cid) => {
    const baseCap = baseSnap.captions.find((c) => c.id === cid);
    const ourCap = ourSnap.captions.find((c) => c.id === cid);
    const theirCap = theirSnap.captions.find((c) => c.id === cid);

    if (ourCap && !theirCap) {
      mergedCaptions.push(ourCap);
    } else if (!ourCap && theirCap) {
      mergedCaptions.push(theirCap);
    } else if (ourCap && theirCap) {
      if (JSON.stringify(ourCap) === JSON.stringify(theirCap)) {
        mergedCaptions.push(ourCap);
      } else {
        const changedFields = getCaptionChangedFields(ourCap, theirCap);
        changedFields.forEach((field) => {
          const baseVal = baseCap ? baseCap[field] : undefined;
          const ourVal = ourCap[field];
          const theirVal = theirCap[field];
          if (JSON.stringify(baseVal) !== JSON.stringify(ourVal) &&
              JSON.stringify(baseVal) !== JSON.stringify(theirVal) &&
              JSON.stringify(ourVal) !== JSON.stringify(theirVal)) {
            conflicts.push({
              type: 'caption',
              captionId: cid,
              field: field as string,
              baseValue: baseVal,
              ourValue: ourVal,
              theirValue: theirVal,
              resolution: 'pending',
            });
          }
        });
        mergedCaptions.push(ourCap);
      }
    }
  });

  let mergedCrop = ourSnap.crop;
  const cropDiff = diffCrop(baseSnap.crop, ourSnap.crop);
  const theirCropDiff = diffCrop(baseSnap.crop, theirSnap.crop);
  if (cropDiff && theirCropDiff) {
    const overlap = cropDiff.changedFields!.filter((f) =>
      theirCropDiff.changedFields!.includes(f)
    );
    overlap.forEach((field) => {
      if (ourSnap.crop[field] !== theirSnap.crop[field]) {
        conflicts.push({
          type: 'crop',
          field: field as string,
          baseValue: baseSnap.crop[field],
          ourValue: ourSnap.crop[field],
          theirValue: theirSnap.crop[field],
          resolution: 'pending',
        });
      }
    });
  } else if (theirCropDiff) {
    mergedCrop = theirSnap.crop;
  }

  let mergedExportConfig = ourSnap.exportConfig;
  const ecDiff = diffExportConfig(baseSnap.exportConfig, ourSnap.exportConfig);
  const theirEcDiff = diffExportConfig(baseSnap.exportConfig, theirSnap.exportConfig);
  if (ecDiff && theirEcDiff) {
    const overlap = ecDiff.changedFields!.filter((f) =>
      theirEcDiff.changedFields!.includes(f)
    );
    overlap.forEach((field) => {
      if (ourSnap.exportConfig[field] !== theirSnap.exportConfig[field]) {
        conflicts.push({
          type: 'exportConfig',
          field: field as string,
          baseValue: baseSnap.exportConfig[field],
          ourValue: ourSnap.exportConfig[field],
          theirValue: theirSnap.exportConfig[field],
          resolution: 'pending',
        });
      }
    });
  } else if (theirEcDiff) {
    mergedExportConfig = theirSnap.exportConfig;
  }

  const mergedSnapshot: EditorSnapshot = {
    frames: mergedFrames,
    captions: mergedCaptions,
    crop: mergedCrop,
    exportConfig: mergedExportConfig,
    canvasWidth: ourSnap.canvasWidth,
    canvasHeight: ourSnap.canvasHeight,
  };

  return {
    success: conflicts.length === 0,
    conflicts,
    mergedSnapshot,
    message:
      conflicts.length === 0
        ? '合并成功'
        : `检测到 ${conflicts.length} 个冲突，请手动解决`,
  };
}

export function resolveConflicts(
  mergedSnapshot: EditorSnapshot,
  conflicts: ConflictItem[]
): EditorSnapshot {
  const snap = JSON.parse(JSON.stringify(mergedSnapshot)) as EditorSnapshot;

  conflicts.forEach((conflict) => {
    if (conflict.resolution === 'pending') return;
    const value =
      conflict.resolution === 'ours'
        ? conflict.ourValue
        : conflict.resolution === 'theirs'
          ? conflict.theirValue
          : conflict.resolvedValue;

    if (conflict.type === 'frame' && conflict.frameId) {
      if (conflict.resolution === 'theirs' && conflict.theirValue) {
        const idx = snap.frames.findIndex((f) => f.id === conflict.frameId);
        if (idx !== -1) snap.frames[idx] = conflict.theirValue as FrameSnapshot;
      }
    } else if (conflict.type === 'caption' && conflict.captionId && conflict.field) {
      const cap = snap.captions.find((c) => c.id === conflict.captionId);
      if (cap) {
        (cap as Record<string, unknown>)[conflict.field] = value;
      }
    } else if (conflict.type === 'crop' && conflict.field) {
      (snap.crop as Record<string, unknown>)[conflict.field] = value;
    } else if (conflict.type === 'exportConfig' && conflict.field) {
      (snap.exportConfig as Record<string, unknown>)[conflict.field] = value;
    }
  });

  return snap;
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function shortenCommitId(id: string): string {
  return id.slice(0, 8);
}
