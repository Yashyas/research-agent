import { create } from 'zustand';

export interface Source {
  id: string;
  type: string;
  title: string;
}

interface SourceStore {
  sourceList: Source[];
  setSourceList: (sources: Source[]) => void;
  addSource: (source: Source) => void;
  removeSource: (id: string) => void;
}


export const useSourceStore = create<SourceStore>((set) => ({
  sourceList: [],
  setSourceList: (sources) => set({ sourceList: sources }),
  addSource: (source) =>
    set((state) => ({
      sourceList: [...state.sourceList, source],
    })),
  removeSource: (id) =>
    set((state) => ({
      sourceList: state.sourceList.filter((s) => s.id !== id),
    })),
}));