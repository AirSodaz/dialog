## 2025-05-18 - [Accessible Hover Sidebar]
**Learning:** Collapsible sidebars that open on hover are inaccessible to keyboard users unless they also handle `onFocus`.
**Action:** When implementing "hover-to-reveal" containers, always add `onFocus` (to open) and `onBlur` (to close if focus leaves container) handlers to the container element.

## 2025-10-26 - [Native Tooltips for Micro-UX]
**Learning:** For lightweight "Micro-UX" enhancements on icon-only buttons, standard HTML `title` attributes combined with `aria-label` provide immediate accessibility and usability value without the overhead/complexity of JavaScript tooltip libraries.
**Action:** Use `title` + `aria-label` pair for icon-only toolbar buttons when a full tooltip component isn't strictly required or available.

## 2025-10-27 - [Accessible Status Indicators]
**Learning:** For dynamic status icons (like loading spinners vs. idle icons), using a container with `role="status"` and a dynamic `aria-label` ensures screen readers announce state changes immediately, while keeping the visual implementation flexible.
**Action:** Wrap status icons in a `div` with `role="status"` and use `aria-label` to describe the current state (e.g., "Generating content"), hiding the icon itself with `aria-hidden="true"`.

## 2025-10-27 - [Combobox Pattern for Search]
**Learning:** For custom search modals, the standard `input` + `list` structure is opaque to screen readers; implementing the full ARIA Combobox pattern (`role="combobox"`, `aria-activedescendant`, `role="listbox"`) makes the "type to filter" interaction accessible without changing visual behavior.
**Action:** Always implement `role="combobox"` on search inputs that filter a list, ensuring selection state is mirrored via `aria-activedescendant`.

## 2026-01-30 - [Semantic Command Menus]
**Learning:** Custom "slash command" menus implemented as `div` soup are invisible to screen readers; adding `role="listbox"` to the container and `role="option"` to items transforms them into navigable widgets, even if full focus management is complex.
**Action:** Always apply `role="listbox"` and `role="option"` to custom popup menus, and ensure `aria-selected` mirrors the visual selection state.
