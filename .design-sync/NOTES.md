# CREFLE Web UI — design-sync notes

- Target: Claude Design project **CREFLE Web UI** — projectId `ac6e3f84-2523-4445-8033-787d6bcba52c` (created 2026-07-08).
- This is the WEB LAYER of the CREFLE DS (26 components, @crefle/web-ui). Separate from CREFLE Foundation (`7ab62ce9-...`, foundation only) and CREFLE Presentation Design System (slides).
- Bundle source of truth: `ds-bundle/` (regenerate from styles/ + docs/ + src/ when the DS changes).
  - `styles.css` = single entry closure: @import tokens/foundation.css + tokens/web-tokens.css + tokens/themes.css + fonts.css. This is what rendered designs receive.
  - `cards/*.html` = self-contained token-based reference cards (first line `<!-- @dsCard group=... -->`); the app compiles the card index from these markers on recompile.
- Re-sync: rebuild ds-bundle (copy latest tokens/themes/fonts, regenerate cards), `: > ds-bundle/_ds_needs_recompile`, then DesignSync finalize_plan(writes = ds-bundle paths, localDir = ds-bundle) -> write_files. No deletes unless removing a card.
- Live/interactive components stay in Storybook (`npm run storybook`), not Claude Design.
