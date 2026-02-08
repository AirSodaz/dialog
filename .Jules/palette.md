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

## 2026-02-01 - [Accessible Hover Actions]
**Learning:** Action buttons (like delete/edit) that only appear on hover via `opacity-0` are invisible to keyboard users. Using `group-focus-within:opacity-100` alongside `group-hover:opacity-100` ensures these actions become visible when the parent container or the actions themselves receive focus.
**Action:** Always pair `group-hover` visibility classes with `group-focus-within` for interactive list items containing hidden actions.

## 2026-02-02 - [Inline Errors vs Alerts]
**Learning:** Browser `alert()` calls disrupt user flow and offer poor accessibility. Inline error messages with `role="alert"` provide immediate, non-blocking feedback that is announced by screen readers.
**Action:** Replace `alert()` error handling with inline state-driven UI components wrapped in `role="alert"`.

## 2026-02-03 - [Semantic Settings Navigation]
**Learning:** Settings modals with sidebar navigation are often misinterpreted as lists of buttons by screen readers; structurally implementing them as vertical tabs (`role="tablist"`, `role="tab"`, `role="tabpanel"`) clarifies the relationship between the control and the content panel.
**Action:** Use ARIA Tab pattern for internal modal navigation where a list of options controls a content panel.

## 2026-02-09 - [Transparent Overlay Buttons]
**Learning:** Using `opacity-0` for interactive overlays can obscure focus rings and potentially hide elements from assistive technologies depending on implementation. Using `bg-transparent` (with `outline-none` and managed focus styles) ensures the element remains interactive, accessible, and supports visible focus indicators.
**Action:** Prefer `bg-transparent` over `opacity-0` for clickable overlay buttons, ensuring `focus-visible` styles are explicitly defined.
