## 2024-05-23 - Zustand Selector Optimization
**Learning:** The codebase uses `useAppStore()` without selectors in many places (e.g., `App.tsx`, `DocumentList.tsx`), causing components to subscribe to the *entire* state. This leads to widespread re-renders on minor state changes (like `settingsOpen`).
**Action:** Always use `useShallow` or specific selectors when using `useAppStore` in performance-sensitive components to isolate updates.

## 2024-05-24 - Selector-Based Derivation
**Learning:** React components often re-render unnecessarily when subscribing to large lists (like `notes`) just to filter a few items (like `recentPages`). `useShallow` works on derived arrays too—it compares the elements. If the derived elements (references) haven't changed, the component won't re-render, even if the source list reference changed.
**Action:** Move expensive or filtering logic into the selector itself and wrap with `useShallow`, rather than selecting the whole list and filtering in the render body.

## 2024-05-24 - Store and IPC Throttling
**Learning:** The `Editor` was triggering `updateNote` (Zustand) and `saveDocument` (IPC to `workspace.json`) on every keystroke. This caused the Sidebar to re-render constantly (due to `updatedAt` change) and hammered the disk with JSON writes, despite Dexie handling immediate persistence effectively.
**Action:** Decouple high-frequency "safety saves" (Dexie) from "metadata sync" (Store/IPC). Use a throttle or debounce strategy for store updates and file system syncs, while keeping local DB writes immediate.
