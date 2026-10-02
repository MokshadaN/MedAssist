# API compatibility policy

MedAssist's supported HTTP API is rooted at `/api/v1`.

## Compatibility

- Additive response fields and new optional query parameters are backward compatible.
- Existing field meanings, authentication requirements, and HTTP status semantics remain stable within v1.
- Removing or renaming fields, changing field types, or making optional request fields required needs a new API version unless required to close an immediate security defect.
- Security fixes may restrict access without a version change. Such changes must be recorded in release notes.

## Deprecation

- Deprecated routes are marked `deprecated: true` in OpenAPI.
- A supported replacement must be documented before deprecation.
- Deprecated routes remain available for at least 90 days or one published release cycle, whichever is longer, unless they expose a security vulnerability.
- Removal requires contract tests proving that maintained clients no longer use the route.

## Current deprecated routes

- `POST /api/v1/chat/message` — use the session intake flow at `POST /api/v1/chat/{session_id}/intake`.
- `POST /api/v1/reminders/create` — patients should use `POST /api/v1/reminders/me`.
- `GET /api/v1/reminders/{user_id}` — patients should use `GET /api/v1/reminders/me`; treating-doctor access will move to an explicitly scoped route.

## Removed stubs

`GET /api/v1/triage/{session_id}` was an unauthenticated hard-coded placeholder and is not a supported API. Triage remains available through authenticated intake and `POST /api/v1/triage/analyze`.
