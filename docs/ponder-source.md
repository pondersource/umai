# Ponder Source distribution

The production build targets https://umai.pondersource.com. GitHub Pages must be configured to deploy through Actions, and DNS must resolve the hostname to Ponder Source's Pages service. The app is not considered deployed until that URL and its Solid login have been verified.

CI runs the same Playwright recipe acceptance scenario against the development server and a production build. It signs into a disposable Community Solid Server account, imports a recipe through the UI, observes a successful Pod write, verifies anonymous access is rejected, and reads it through the shared recipes parser after signing in from a fresh browser context. Traces are retained on failure.

The recipes parser is checked out from Ponder Source data-modules at a pinned revision. Runtime storage still uses Soukai Solid. This is interoperability coverage, not a completed runtime module migration. The shared recipes module currently lacks writes, discovery, history and image handling; those must be added without losing existing fields before replacing the runtime.

remoteStorage.js's Solid backend currently stores remoteStorage-format data on a Pod. Installing it does not map Umai's existing Schema.org RDF documents, relations or history to a remoteStorage module. Native RDF remains in use until an appropriate adapter can preserve that model.

Solid Memo is maintained by a separate worker. New module names/scopes need Michiel's sign-off.
