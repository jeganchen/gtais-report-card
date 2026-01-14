/**
 * 学生选择状态管理 (Zustand)
 */

import { create } from 'zustand';

interface SelectionState {
  selectedIds: Set<string>;
  selectOne: (id: string) => void;
  unselectOne: (id: string) => void;
  toggleOne: (id: string) => void;
  selectAll: (ids: string[]) => void;
  unselectAll: () => void;
  toggleAll: (ids: string[]) => void;
  isSelected: (id: string) => boolean;
  isAllSelected: (ids: string[]) => boolean;
  isSomeSelected: (ids: string[]) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: new Set<string>(),

  selectOne: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedIds);
      newSet.add(id);
      return { selectedIds: newSet };
    }),

  unselectOne: (id) =>
    set((state) => {
      const newSet = new Set(state.selectedIds);
      newSet.delete(id);
      return { selectedIds: newSet };
    }),

  toggleOne: (id) => {
    const { selectedIds, selectOne, unselectOne } = get();
    if (selectedIds.has(id)) {
      unselectOne(id);
    } else {
      selectOne(id);
    }
  },

  selectAll: (ids) =>
    set(() => ({
      selectedIds: new Set(ids),
    })),

  unselectAll: () =>
    set(() => ({
      selectedIds: new Set<string>(),
    })),

  toggleAll: (ids) => {
    const { isAllSelected, selectAll, unselectAll } = get();
    if (isAllSelected(ids)) {
      unselectAll();
    } else {
      selectAll(ids);
    }
  },

  isSelected: (id) => get().selectedIds.has(id),

  isAllSelected: (ids) => {
    const { selectedIds } = get();
    return ids.length > 0 && ids.every((id) => selectedIds.has(id));
  },

  isSomeSelected: (ids) => {
    const { selectedIds } = get();
    return ids.some((id) => selectedIds.has(id)) && !ids.every((id) => selectedIds.has(id));
  },
}));

