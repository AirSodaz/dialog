## 2025-05-18 - [Accessible Hover Sidebar]
**Learning:** Collapsible sidebars that open on hover are inaccessible to keyboard users unless they also handle `onFocus`.
**Action:** When implementing "hover-to-reveal" containers, always add `onFocus` (to open) and `onBlur` (to close if focus leaves container) handlers to the container element.
