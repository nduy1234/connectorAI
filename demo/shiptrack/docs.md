# ShipTrack Internal API

Host: `http://localhost:4002`

### Login
`POST /api/login` with `{ "username": "...", "password": "..." }`
→ `{ "ok": true, "session_token": "..." }`

Pass the session token in the `X-Session-Token` header.

Test account: username `ops`, password `tracker`.

### Carriers
`GET /api/carriers` → `{ "ok": true, "carriers": ["UPS", ...] }`

### Shipments
`GET /api/shipments?page=1` → `{ "ok": true, "page": 1, "results": [Shipment], "has_next": true }`

`GET /api/shipments/:trackingId` → `{ "ok": true, "shipment": Shipment }`

`POST /api/shipments/:trackingId/label` with `{ "weight_kg": 2.5 }` → `{ "ok": true, "label_url": "..." }`

Shipment: `{ tracking_id, carrier, status, destination }`
