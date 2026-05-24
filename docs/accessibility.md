# Accessibility QA

## Scope

This pass covers the implemented smartphone-sized web MVP screens:

- recipe list, search, and filters;
- recipe detail, portion input, and private export;
- recipe create/edit/delete form;
- cookbook/category management;
- meal planner loop editing.

## Checks Completed

- Primary navigation, forms, destructive confirmations, planner controls, and export controls use native buttons, inputs, selects, and textareas.
- Interactive controls have visible text or `aria-label` values in component tests.
- Loading states use `role="status"`; error states use `role="alert"`.
- Destructive recipe/category actions require a second confirmation tap through `ConfirmActionButton`.
- CSS uses safe-area padding, 44px minimum control height, visible focus outlines, and a narrow-phone breakpoint.
- Browser smoke on `http://127.0.0.1:5173/` confirmed recipe, cookbook, planner, and export entry screens render without console errors.

## Known Limits

- No automated axe audit is configured yet.
- Native screen-reader testing on iOS/Android is deferred until the mobile conversion phase.
- Actual photo upload/accessibility text for stored image blobs is deferred until app-managed media storage is implemented.
