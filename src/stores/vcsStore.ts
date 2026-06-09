import { create } from 'zustand';
import type {
  Branch,
  Commit,
  ConflictItem,
  EditorSnapshot,
  VCSAction,
  VCSState,
} from '@/types';
import {
  createEditorSnapshot,
  findCommonAncestor,
  generateActionId,
  generateCommitId,
  mergeSnapshots,
  resolveConflicts,
} from '@/utils/vcs';

const DEFAULT_BRANCH = 'main';

interface VCSStore extends VCSState {
  createBranch: (name: string, description?: string) => { success: boolean; message: string };
  deleteBranch: (name: string) => { success: boolean; message: string };
  switchBranch: (name: string) => { success: boolean; message: string; snapshot?: EditorSnapshot };
  commit: (
    message: string,
    author: string,
    frames: Parameters<typeof createEditorSnapshot>[0],
    captions: Parameters<typeof createEditorSnapshot>[1],
    crop: Parameters<typeof createEditorSnapshot>[2],
    exportConfig: Parameters<typeof createEditorSnapshot>[3],
    canvasWidth: number,
    canvasHeight: number
  ) => { success: boolean; message: string; commit?: Commit };
  startMerge: (
    sourceBranchName: string,
    targetBranchName: string
  ) => {
    success: boolean;
    message: string;
    conflicts?: ConflictItem[];
    mergedSnapshot?: EditorSnapshot;
  };
  resolveConflict: (index: number, resolution: ConflictItem['resolution'], customValue?: unknown) => void;
  finalizeMerge: (
    message: string,
    author: string
  ) => { success: boolean; message: string; snapshot?: EditorSnapshot };
  abortMerge: () => void;
  checkoutCommit: (commitId: string) => { success: boolean; message: string; snapshot?: EditorSnapshot };
  getCurrentHeadCommit: () => Commit | null;
  getBranchCommits: (branchName: string) => Commit[];
  getAllCommitsChronological: () => Commit[];
  getBranchCommitCount: (branchName: string) => number;
  addAction: (action: Omit<VCSAction, 'id' | 'timestamp'>) => void;
  hasUncommittedChanges: (
    frames: Parameters<typeof createEditorSnapshot>[0],
    captions: Parameters<typeof createEditorSnapshot>[1],
    crop: Parameters<typeof createEditorSnapshot>[2],
    exportConfig: Parameters<typeof createEditorSnapshot>[3],
    canvasWidth: number,
    canvasHeight: number
  ) => boolean;
}

const createInitialState = (): VCSState => ({
  branches: {
    [DEFAULT_BRANCH]: {
      name: DEFAULT_BRANCH,
      headCommitId: null,
      createdAt: Date.now(),
      description: '主分支',
    },
  },
  commits: {},
  currentBranchName: DEFAULT_BRANCH,
  detachedHeadCommitId: null,
  actionHistory: [],
  isMergeInProgress: false,
  pendingMerge: null,
});

export const useVCSStore = create<VCSStore>((set, get) => ({
  ...createInitialState(),

  createBranch: (name, description) => {
    const state = get();
    if (state.branches[name]) {
      return { success: false, message: `分支 "${name}" 已存在` };
    }
    if (!name.trim() || !/^[a-zA-Z0-9_-]+$/.test(name)) {
      return { success: false, message: '分支名无效，仅允许字母、数字、下划线和短横线' };
    }
    const currentHead = state.detachedHeadCommitId
      ? state.detachedHeadCommitId
      : state.branches[state.currentBranchName]?.headCommitId ?? null;

    const newBranch: Branch = {
      name,
      headCommitId: currentHead,
      createdAt: Date.now(),
      description,
    };

    set({
      branches: { ...state.branches, [name]: newBranch },
    });

    get().addAction({
      type: 'create_branch',
      branchName: name,
      details: { fromCommit: currentHead },
    });

    return { success: true, message: `分支 "${name}" 创建成功` };
  },

  deleteBranch: (name) => {
    const state = get();
    if (name === DEFAULT_BRANCH) {
      return { success: false, message: '无法删除主分支' };
    }
    if (!state.branches[name]) {
      return { success: false, message: `分支 "${name}" 不存在` };
    }
    if (state.currentBranchName === name && !state.detachedHeadCommitId) {
      return { success: false, message: '无法删除当前所在分支' };
    }

    const newBranches = { ...state.branches };
    delete newBranches[name];

    set({ branches: newBranches });

    get().addAction({
      type: 'delete_branch',
      branchName: name,
    });

    return { success: true, message: `分支 "${name}" 已删除` };
  },

  switchBranch: (name) => {
    const state = get();
    if (!state.branches[name]) {
      return { success: false, message: `分支 "${name}" 不存在` };
    }
    if (state.currentBranchName === name && !state.detachedHeadCommitId) {
      return { success: false, message: '已在该分支上' };
    }
    if (state.isMergeInProgress) {
      return { success: false, message: '合并进行中，无法切换分支' };
    }

    const branch = state.branches[name];
    let snapshot: EditorSnapshot | undefined;

    if (branch.headCommitId) {
      const commit = state.commits[branch.headCommitId];
      if (commit) {
        snapshot = commit.snapshot;
      }
    }

    set({
      currentBranchName: name,
      detachedHeadCommitId: null,
    });

    get().addAction({
      type: 'switch_branch',
      branchName: name,
    });

    return { success: true, message: `已切换到分支 "${name}"`, snapshot };
  },

  commit: (message, author, frames, captions, crop, exportConfig, canvasWidth, canvasHeight) => {
    const state = get();
    if (!message.trim()) {
      return { success: false, message: '提交信息不能为空' };
    }

    const snapshot = createEditorSnapshot(
      frames,
      captions,
      crop,
      exportConfig,
      canvasWidth,
      canvasHeight
    );

    const currentBranch = state.branches[state.currentBranchName];
    if (!currentBranch) {
      return { success: false, message: '当前分支无效' };
    }

    const parentId = state.detachedHeadCommitId || currentBranch.headCommitId;

    if (parentId) {
      const parentCommit = state.commits[parentId];
      if (
        parentCommit &&
        JSON.stringify(parentCommit.snapshot) === JSON.stringify(snapshot)
      ) {
        return { success: false, message: '没有可提交的更改' };
      }
    }

    const commit: Commit = {
      id: generateCommitId(),
      parentId,
      branchName: state.currentBranchName,
      message: message.trim(),
      author,
      timestamp: Date.now(),
      snapshot,
    };

    const newCommits = { ...state.commits, [commit.id]: commit };
    const newBranches = {
      ...state.branches,
      [state.currentBranchName]: {
        ...currentBranch,
        headCommitId: commit.id,
      },
    };

    set({
      commits: newCommits,
      branches: newBranches,
      detachedHeadCommitId: null,
    });

    get().addAction({
      type: 'commit',
      branchName: state.currentBranchName,
      commitId: commit.id,
      message: commit.message,
    });

    return { success: true, message: '提交成功', commit };
  },

  startMerge: (sourceBranchName, targetBranchName) => {
    const state = get();
    const sourceBranch = state.branches[sourceBranchName];
    const targetBranch = state.branches[targetBranchName];

    if (!sourceBranch) return { success: false, message: `源分支 "${sourceBranchName}" 不存在` };
    if (!targetBranch) return { success: false, message: `目标分支 "${targetBranchName}" 不存在` };
    if (sourceBranchName === targetBranchName) return { success: false, message: '不能合并同一分支' };
    if (!sourceBranch.headCommitId) return { success: false, message: '源分支没有任何提交' };
    if (!targetBranch.headCommitId) {
      const sourceCommit = state.commits[sourceBranch.headCommitId];
      if (sourceCommit) {
        set({
          branches: {
            ...state.branches,
            [targetBranchName]: {
              ...targetBranch,
              headCommitId: sourceBranch.headCommitId,
            },
          },
        });
        get().addAction({
          type: 'merge',
          branchName: targetBranchName,
          targetBranchName: sourceBranchName,
          message: `Fast-forward 合并 ${sourceBranchName} 到 ${targetBranchName}`,
        });
        return {
          success: true,
          message: `Fast-forward 合并成功：${sourceBranchName} → ${targetBranchName}`,
          mergedSnapshot: sourceCommit.snapshot,
        };
      }
    }

    const baseCommit = findCommonAncestor(
      state.commits,
      targetBranch.headCommitId!,
      sourceBranch.headCommitId
    );

    if (!baseCommit) {
      return { success: false, message: '未找到共同祖先，无法合并' };
    }

    const targetCommit = state.commits[targetBranch.headCommitId!];
    const sourceCommit = state.commits[sourceBranch.headCommitId];

    if (!targetCommit || !sourceCommit) {
      return { success: false, message: '提交数据缺失' };
    }

    const mergeResult = mergeSnapshots(
      baseCommit.snapshot,
      targetCommit.snapshot,
      sourceCommit.snapshot
    );

    if (mergeResult.success) {
      const mergeCommit: Commit = {
        id: generateCommitId(),
        parentId: targetCommit.id,
        branchName: targetBranchName,
        message: `合并分支 "${sourceBranchName}" 到 "${targetBranchName}"`,
        author: 'system',
        timestamp: Date.now(),
        snapshot: mergeResult.mergedSnapshot!,
      };

      set({
        commits: { ...state.commits, [mergeCommit.id]: mergeCommit },
        branches: {
          ...state.branches,
          [targetBranchName]: {
            ...targetBranch,
            headCommitId: mergeCommit.id,
          },
        },
      });

      get().addAction({
        type: 'merge',
        branchName: targetBranchName,
        targetBranchName: sourceBranchName,
        commitId: mergeCommit.id,
        message: mergeCommit.message,
      });

      return {
        success: true,
        message: `合并成功：${sourceBranchName} → ${targetBranchName}`,
        mergedSnapshot: mergeResult.mergedSnapshot,
      };
    }

    set({
      isMergeInProgress: true,
      pendingMerge: {
        sourceBranch: sourceBranchName,
        targetBranch: targetBranchName,
        conflicts: mergeResult.conflicts,
        baseCommitId: baseCommit.id,
        ourCommitId: targetCommit.id,
        theirCommitId: sourceCommit.id,
        mergedSnapshot: mergeResult.mergedSnapshot,
      } as VCSStore['pendingMerge'],
    });

    return {
      success: false,
      message: mergeResult.message,
      conflicts: mergeResult.conflicts,
      mergedSnapshot: mergeResult.mergedSnapshot,
    };
  },

  resolveConflict: (index, resolution, customValue) => {
    const state = get();
    if (!state.pendingMerge) return;
    if (index < 0 || index >= state.pendingMerge.conflicts.length) return;

    const newConflicts = [...state.pendingMerge.conflicts];
    newConflicts[index] = {
      ...newConflicts[index],
      resolution,
      resolvedValue: customValue,
    };

    set({
      pendingMerge: {
        ...state.pendingMerge,
        conflicts: newConflicts,
      },
    });
  },

  finalizeMerge: (message, author) => {
    const state = get();
    if (!state.pendingMerge) return { success: false, message: '没有正在进行的合并' };

    const unresolved = state.pendingMerge.conflicts.filter((c) => c.resolution === 'pending');
    if (unresolved.length > 0) {
      return { success: false, message: `还有 ${unresolved.length} 个冲突未解决` };
    }

    const resolvedSnapshot = resolveConflicts(
      state.pendingMerge.mergedSnapshot!,
      state.pendingMerge.conflicts
    );

    const targetBranch = state.branches[state.pendingMerge.targetBranch];
    const mergeCommit: Commit = {
      id: generateCommitId(),
      parentId: state.pendingMerge.ourCommitId,
      branchName: state.pendingMerge.targetBranch,
      message: message || `合并分支 "${state.pendingMerge.sourceBranch}" 到 "${state.pendingMerge.targetBranch}"`,
      author,
      timestamp: Date.now(),
      snapshot: resolvedSnapshot,
    };

    set({
      commits: { ...state.commits, [mergeCommit.id]: mergeCommit },
      branches: {
        ...state.branches,
        [state.pendingMerge.targetBranch]: {
          ...targetBranch,
          headCommitId: mergeCommit.id,
        },
      },
      isMergeInProgress: false,
      pendingMerge: null,
    });

    get().addAction({
      type: 'merge',
      branchName: state.pendingMerge.targetBranch,
      targetBranchName: state.pendingMerge.sourceBranch,
      commitId: mergeCommit.id,
      message: mergeCommit.message,
    });

    return {
      success: true,
      message: '合并完成',
      snapshot: resolvedSnapshot,
    };
  },

  abortMerge: () => {
    set({
      isMergeInProgress: false,
      pendingMerge: null,
    });
  },

  checkoutCommit: (commitId) => {
    const state = get();
    const commit = state.commits[commitId];
    if (!commit) {
      return { success: false, message: '提交不存在' };
    }

    set({
      detachedHeadCommitId: commitId,
    });

    get().addAction({
      type: 'checkout_commit',
      commitId,
      branchName: state.currentBranchName,
    });

    return {
      success: true,
      message: `已检出提交 ${commitId.slice(0, 8)}`,
      snapshot: commit.snapshot,
    };
  },

  getCurrentHeadCommit: () => {
    const state = get();
    const headId = state.detachedHeadCommitId
      ? state.detachedHeadCommitId
      : state.branches[state.currentBranchName]?.headCommitId ?? null;
    return headId ? state.commits[headId] ?? null : null;
  },

  getBranchCommits: (branchName) => {
    const state = get();
    const branch = state.branches[branchName];
    if (!branch || !branch.headCommitId) return [];

    const commits: Commit[] = [];
    let currentId: string | null = branch.headCommitId;
    while (currentId) {
      const commit = state.commits[currentId];
      if (commit) {
        commits.push(commit);
        currentId = commit.parentId;
      } else {
        break;
      }
    }
    return commits;
  },

  getAllCommitsChronological: () => {
    return Object.values(get().commits).sort((a, b) => b.timestamp - a.timestamp);
  },

  getBranchCommitCount: (branchName) => {
    return get().getBranchCommits(branchName).length;
  },

  addAction: (action) => {
    const state = get();
    const newAction: VCSAction = {
      ...action,
      id: generateActionId(),
      timestamp: Date.now(),
    };
    set({
      actionHistory: [newAction, ...state.actionHistory].slice(0, 500),
    });
  },

  hasUncommittedChanges: (frames, captions, crop, exportConfig, canvasWidth, canvasHeight) => {
    const state = get();
    const headCommit = state.getCurrentHeadCommit();
    if (!headCommit) return frames.length > 0;

    const currentSnapshot = createEditorSnapshot(
      frames,
      captions,
      crop,
      exportConfig,
      canvasWidth,
      canvasHeight
    );

    return JSON.stringify(currentSnapshot) !== JSON.stringify(headCommit.snapshot);
  },
}));
