# 05 — Risks, pitfalls & open questions

## Version alignment (check at implementation time)

- Use **`storybook@latest`** (Storybook 9.x/10.x) — both support Svelte 5 and the
  Vite builder. Let `storybook init` resolve the matching `@storybook/sveltekit`
  and addon versions, then pin them in `package.json`.
- **`@storybook/addon-svelte-csf`** must be the v5-compatible line (works with
  Svelte 5 + `defineMeta`/snippets). If `init` doesn't add it, add manually.
- Our toolchain: Svelte `^5.55`, Vite `^8`, Tailwind `^4.2`, Bun `1.3`. Confirm
  the chosen Storybook major lists Vite 8 / Svelte 5 as supported; if not, take
  the newest that does and note the gap here.
- `@storybook/addon-vitest` must match the installed **Vitest 4** major and needs
  `@vitest/browser` + `playwright`.

## Reusing our `vite.config.ts`

`@storybook/sveltekit` loads the project Vite config, which includes:
`designTokensPlugin()`, `tailwindcss()`, `sveltekit()`, `unplugin-icons`,
`paraglideVitePlugin()`. Expected to work as-is. Possible friction:

- **Paraglide plugin** runs a compile step; if it conflicts with Storybook's dev
  server, scope it out via `viteFinal` in `.storybook/main.ts` and rely on the
  pre-generated `src/generated/paraglide` output instead.
- **design-tokens plugin** writes `src/generated/design-tokens.css`; ensure it
  runs before Tailwind reads it (it already orders first in `vite.config.ts`).
- If any plugin breaks SB, add:
  ```ts
  // .storybook/main.ts
  async viteFinal(config) {
    // mutate config.plugins as needed (filter/replace), then:
    return config;
  }
  ```

## Theme decorator

The side-effect decorator toggles `.dark` on `document.documentElement`. Risk:
in the **Docs** view multiple stories render in one document, so the last
decorator wins for the shared `<html>`. Mitigations:

- prefer the toolbar (canvas view) for theme QA, or
- switch to a wrapper component decorator (`theme-decorator.svelte`) that scopes
  `.dark` to a wrapping element, so each story controls its own subtree.

## SSR / `$app` in stories

`theme-toggle`, `language-switcher`, and the app-chrome organisms read
`$app/state` (`page`) and `$app/paths` (`resolve`). Under `@storybook/sveltekit`
these are provided. For stories needing a specific route/locale, add a decorator
that sets `page.url`. (Our Vitest uses the `vitest-mocks/` stand-ins; Storybook
does not need them.)

## Scope guard

The `main.ts` stories glob is deliberately `../src/shared/ui/**` so
`src/modules/doctors/**` (doctor-specific) is never picked up. If someone later
adds doctor stories, they must live elsewhere or the glob must stay scoped.

## Performance / cost

- Browser-mode story tests (addon-vitest) are slower and need Chromium. Keep them
  in a **separate** Vitest project so the default `bun run test` stays fast (jsdom).
- ~41 story files is a meaningful authoring effort — that's why S1–S3 are split.

## Open questions to confirm before/while implementing

1. **App-chrome organisms** (site-footer, bottom-nav, app-shell): author stories
   now, or defer? (Listed optional in `03-component-inventory.md`.)
2. **CI**: should `build-storybook` and/or `test:stories` be required gates, or
   informational only initially?
3. **Visual regression** (Chromatic or Storybook test-runner snapshots): out of
   scope here — decide later if we want it.
4. **Story-test vs jsdom overlap**: we already have thorough jsdom specs. Keep
   `play` interaction stories minimal (one per overlay/interactive component) to
   avoid duplicating coverage.
