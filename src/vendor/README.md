# Vendored third-party assets

## paged.polyfill.min.js

- **Source:** `node_modules/pagedjs/dist/paged.polyfill.min.js`
- **Library:** paged.js — https://gitlab.coko.foundation/pagedjs/pagedjs
- **Version:** 0.4.3 (matches the `pagedjs` dependency in `package.json`)
- **License:** MIT

### Why it's vendored

The PDF export (`src/export/render-static-html.ts`) inlines this polyfill into
the standalone export HTML so the file paginates itself in the browser and
renders our own `@page` header/footer + page numbers (see ADR-0017). It cannot
be imported from the package because pagedjs's `exports` map does not expose the
`dist/` polyfill bundle as a deep import — Vite rejects
`pagedjs/dist/paged.polyfill.min.js?raw`. Copying the file here bypasses that.

### Updating

When bumping the `pagedjs` version in `package.json`, re-copy the file:

```sh
cp node_modules/pagedjs/dist/paged.polyfill.min.js src/vendor/paged.polyfill.min.js
```

and update the version above. The in-app Page view (`src/renderer/PageView.tsx`)
uses the package's normal ESM `Previewer` export and does NOT need this copy.
