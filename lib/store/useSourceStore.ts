// // store/useSourceStore.ts
// import { create } from 'zustand';

// export type SourceType = 'pdf' | 'youtube';

// export interface Source {
//   id: string;
//   type: SourceType;
//   title: string;
//   url?: string;
//   file?: File;
// }

// interface SourceStore {
//   sourceList: Source[];
//   addSource: (source: Omit<Source, 'id'>) => void;
//   removeSource: (id: string) => void;
// }

// export const useSourceStore = create<SourceStore>((set) => ({
//   sourceList: [],
//   addSource: (source) =>
//     set((state) => ({
//       sourceList: [...state.sourceList, { ...source, id: crypto.randomUUID() }],
//     })),
//   removeSource: (id) =>
//     set((state) => ({
//       sourceList: state.sourceList.filter((s) => s.id !== id),
//     })),
// }));

// store/useSourceStore.ts
import { create } from 'zustand';

export type SourceType = 'pdf' | 'youtube';

export interface Source {
  id: string;
  type: SourceType;
  title: string;
  url?: string;
  file?: File;
}

interface SourceStore {
  sourceList: Source[];
  addSource: (source: Omit<Source, 'id'>) => void;
  removeSource: (id: string) => void;
}

// Pre-populate with dummy data
const initialDummyData: Source[] = [
  {
    id: "dummy-youtube-1",
    type: "youtube",
    title: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  },
  {
    id: "dummy-pdf-1",
    type: "pdf",
    title: "architecture_diagrams_v2.pdf",
    // Note: We leave the 'file' property undefined here since we can't 
    // mock a real browser File object cleanly in a static store initial state
  },
  {
    id: "dummy-youtube-2",
    type: "youtube",
    title: "https://www.youtube.com/watch?v=M576WlNmIQQ",
    url: "https://www.youtube.com/watch?v=M576WlNmIQQ",
  }
];

export const useSourceStore = create<SourceStore>((set) => ({
  sourceList: initialDummyData,
  addSource: (source) =>
    set((state) => ({
      sourceList: [...state.sourceList, { ...source, id: crypto.randomUUID() }],
    })),
  removeSource: (id) =>
    set((state) => ({
      sourceList: state.sourceList.filter((s) => s.id !== id),
    })),
}));