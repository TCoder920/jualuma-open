# Mobile UI Figma Addendum

Primary Figma file documented in repo: `82xjOMk2VzXWjThZN5UT8W`

Current repo reality:

- Existing documented Figma coverage is centered on the web shell.
- The mobile states called out in `jualuma.pdf` were not represented as dedicated frames.
- Shared `frontend-app` code now implements the overflow and drawer behavior for both `iOS` and `Android`.

## Required Frames

Add or update these frames in the primary Figma file:

1. `Auth / Verify Email / Default`
2. `Auth / Verify Email / Long Email + Error`
3. `Auth / Signup / Mobile / Validation Error`
4. `AI Assistant / Mobile / Drawer Open`
5. `AI Assistant / Mobile / Empty State Sliding Cards`
6. `AI Assistant / Mobile / Long Attachment Names`
7. `AI Assistant / Mobile / Long Error Code Message`
8. `AI Assistant / Tablet / Drawer + Chat`
9. `Dashboard / Mobile / Insights Period Chips (320px)`
10. `Auth / Signup / Mobile / 320px Single Column`
11. `Auth / Reset Password / Mobile / 320px Single Column`

## Behavior Locked In Code

- Sidebar is a mobile drawer on narrow viewports and a fixed rail on desktop.
- Quick action cards use horizontal snap scrolling on mobile instead of a clipped two-column grid.
- Long emails, long filenames, and long backend errors wrap instead of clipping.
- Chat bubbles expand to full width on small screens.
- Toggle labels and alert content wrap instead of forcing single-line overflow.
- Native `iOS` and `Android` shells do not show the web cookie-consent banner.
- Auth and entry surfaces use the `jualuma-logo-main.png` mark as the primary brand asset instead of the legacy animated wordmark.
- The launch shell, login, signup, verify-email, maintenance, and not-found screens all keep the same centered brand mark treatment on mobile.
- Dashboard `Insights Period` chips stay fully visible at `320px` and wrap to multiple rows instead of clipping.
- Signup and reset-password mobile layouts use a true single-column stack at `320px`; no fixed `320px` min-width blocks inside padded containers.

## Validation Targets

- `320px` width
- `375px` width
- `430px` width
- dynamic type / larger font scale
- long email address
- long attachment filename
- long backend error with visible `Code: XXXX`
