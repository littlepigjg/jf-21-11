export interface Frame {
  id: string;
  imageData: ImageData;
  delay: number;
  width: number;
  height: number;
  disposalMethod: number;
}

export interface Caption {
  id: string;
  text: string;
  frameRange: [number, number];
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  align: 'left' | 'center' | 'right';
}

export interface CropConfig {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExportConfig {
  colors: number;
  quality: number;
  fps: number;
  dither: boolean;
  repeat: number;
  width: number;
  height: number;
}

export interface EditorState {
  frames: Frame[];
  selectedFrameIndex: number;
  captions: Caption[];
  crop: CropConfig;
  exportConfig: ExportConfig;
  isPlaying: boolean;
  playbackSpeed: number;
  currentFrameIndex: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface FrameSnapshot {
  id: string;
  delay: number;
  width: number;
  height: number;
  disposalMethod: number;
  imageDataHash: string;
  imageDataUrl: string;
}

export interface EditorSnapshot {
  frames: FrameSnapshot[];
  captions: Caption[];
  crop: CropConfig;
  exportConfig: ExportConfig;
  canvasWidth: number;
  canvasHeight: number;
}

export interface Commit {
  id: string;
  parentId: string | null;
  branchName: string;
  message: string;
  author: string;
  timestamp: number;
  snapshot: EditorSnapshot;
}

export interface Branch {
  name: string;
  headCommitId: string | null;
  createdAt: number;
  description?: string;
}

export type DiffChangeType = 'added' | 'removed' | 'modified';

export interface FrameDiff {
  type: DiffChangeType;
  index: number;
  frameId?: string;
  oldFrame?: FrameSnapshot;
  newFrame?: FrameSnapshot;
}

export interface CaptionDiff {
  type: DiffChangeType;
  captionId: string;
  oldCaption?: Caption;
  newCaption?: Caption;
  changedFields?: (keyof Caption)[];
}

export interface CropDiff {
  oldCrop?: CropConfig;
  newCrop?: CropConfig;
  changedFields?: (keyof CropConfig)[];
}

export interface ExportConfigDiff {
  oldConfig?: ExportConfig;
  newConfig?: ExportConfig;
  changedFields?: (keyof ExportConfig)[];
}

export interface DiffResult {
  frameDiffs: FrameDiff[];
  captionDiffs: CaptionDiff[];
  cropDiff: CropDiff | null;
  exportConfigDiff: ExportConfigDiff | null;
  hasChanges: boolean;
}

export interface ConflictItem {
  type: 'frame' | 'caption' | 'crop' | 'exportConfig';
  index?: number;
  captionId?: string;
  field?: string;
  baseValue?: unknown;
  ourValue?: unknown;
  theirValue?: unknown;
  resolution: 'pending' | 'ours' | 'theirs' | 'custom';
  resolvedValue?: unknown;
}

export interface MergeResult {
  success: boolean;
  conflicts: ConflictItem[];
  mergedSnapshot?: EditorSnapshot;
  message: string;
}

export interface VCSAction {
  id: string;
  type:
    | 'create_branch'
    | 'delete_branch'
    | 'switch_branch'
    | 'commit'
    | 'merge'
    | 'checkout_commit'
    | 'reset';
  timestamp: number;
  branchName?: string;
  targetBranchName?: string;
  commitId?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface VCSState {
  branches: Record<string, Branch>;
  commits: Record<string, Commit>;
  currentBranchName: string;
  detachedHeadCommitId: string | null;
  actionHistory: VCSAction[];
  isMergeInProgress: boolean;
  pendingMerge: {
    sourceBranch: string;
    targetBranch: string;
    conflicts: ConflictItem[];
    baseCommitId: string;
    ourCommitId: string;
    theirCommitId: string;
  } | null;
}
