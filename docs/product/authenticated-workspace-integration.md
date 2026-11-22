# Authenticated workspace integration

## Delivered

- Browser session restoration calls `POST /api/v1/auth/refresh` on application startup and relies on the server-managed HttpOnly refresh cookie.
- Access tokens are kept only in module memory; they are not written to localStorage, sessionStorage, or browser-readable cookies.
- Login and account registration use the existing API contracts. Authenticated API calls include a bearer access token and credentials so refresh cookies remain available.
- A single-flight refresh operation avoids concurrent refresh requests racing to rotate the same refresh token. A protected API request that receives a 401 can refresh once and retry.
- Logout calls the server endpoint and clears the in-memory access token even if the network request fails.
- The organization picker is populated from the authenticated user's membership list. A remembered organization ID is treated only as a preference and is revalidated against the server response on every session bootstrap.
- Users can create an organization through the existing API; the creator is shown the owner role returned by the backend.
- Workspace UI shows the authenticated user, active organization, and membership role. It explicitly labels domain metrics and activity feed as not yet integrated rather than inventing live values.
- API client tests cover refresh-cookie session restoration, in-memory token handling, login, logout cleanup, organization listing, and API error conversion.

## Security boundaries

- Refresh tokens are never exposed to JavaScript. The API's HttpOnly cookie remains the sole refresh credential.
- Access tokens are memory-only and are lost on reload; the application obtains a replacement using the refresh cookie.
- The selected organization ID is not an authorization credential. The frontend validates it against `GET /api/v1/organizations`; every future organization resource request must still use server-side membership authorization.
- Do not add a client-supplied role or trust local storage for authorization decisions.
- The existing API's origin allowlist and credentialed CORS behavior remain in force.

## Remaining work

- Add product, partner, lifecycle, and evidence domain endpoints before rendering operational metrics.
- Add dedicated browser-level end-to-end coverage for cookie behavior, CORS, cross-tab refresh rotation, and organization switching.
- Add password reset, email verification, and MFA before production identity readiness.
- The current backend refresh token rotation is server-authoritative; multiple browser tabs can still race refresh rotation. Cross-tab coordination is a follow-up security improvement.
