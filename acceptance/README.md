# Solid acceptance

The recipe scenario uses real Solid login, a private Pod write, an independent shared-reader check and a clean browser context. The normal development and production checks start the application locally.

Set `ACCEPTANCE_URL=https://umai.pondersource.com` to exercise the deployed application instead. The test still starts a disposable localhost Community Solid Server and uses the pinned recipes reader from the workflow. Install `solid-server` and `acceptance` dependencies plus the reader before running `npm --prefix acceptance test`.

The live publication scenario also checks the public client ID and redirect URI, root assets, direct recipe navigation and any registered service-worker scopes. The workflow runs both scenarios after deployment. No personal Pod or account is used.
