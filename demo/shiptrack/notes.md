Slack thread with Marco (ShipTrack maintainer, 6 years on the team):

- Same deal as most of our old stuff: a failed call still comes back HTTP 200. Look at `ok` — if it's false, read `error`.
- Shipment list is paged with `?page=` (starts at 1, 3 per page, fixed). Loop until `has_next` is false.
- Session tokens expire after a few requests. You'll get a 401 SESSION_EXPIRED — log in again and retry the call.
- Tracking IDs are case-sensitive and must be UPPERCASE ("ST-9001"). Lowercase IDs come back as NOT_FOUND, which confuses everyone. Always uppercase them before calling.
- Label creation needs weight_kg or it fails (silently, of course).
