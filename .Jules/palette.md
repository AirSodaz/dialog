## 2025-05-18 - [Accessible Hover Sidebar]
**Learning:** Collapsible sidebars that open on hover are inaccessible to keyboard users unless they also handle `onFocus`.
**Action:** When implementing "hover-to-reveal" containers, always add `onFocus` (to open) and `onBlur` (to close if focus leaves container) handlers to the container element.

## 2025-10-26 - [Native Tooltips for Micro-UX]
**Learning:** For lightweight "Micro-UX" enhancements on icon-only buttons, standard HTML `title` attributes combined with `aria-label` provide immediate accessibility and usability value without the overhead/complexity of JavaScript tooltip libraries.
**Action:** Use `title` + `aria-label` pair for icon-only toolbar buttons when a full tooltip component isn't strictly required or available.
