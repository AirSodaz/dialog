## 2024-05-23 - Zustand Selector Optimization
**Learning:** The codebase uses `useAppStore()` without selectors in many places (e.g., `App.tsx`, `DocumentList.tsx`), causing components to subscribe to the *entire* state. This leads to widespread re-renders on minor state changes (like `settingsOpen`).
**Action:** Always use `useShallow` or specific selectors when using `useAppStore` in performance-sensitive components to isolate updates.
