# AcmeERP REST API v2.1 (2009)

Base URL: `http://localhost:4001`

## Authentication
OAuth-style client credentials.

`POST /auth/token`
Body: `{ "client_id": "...", "client_secret": "..." }`
Returns: `{ "status": "OK", "access_token": "...", "expires_in": 30 }`

Send the token on every request as `Authorization: Bearer <access_token>`.

Sandbox credentials: client_id `acme-demo`, client_secret `s3cret`.

## Customers
`GET /customers?pg=1`
Returns `{ "status": "OK", "pg": 1, "data": [Customer], "more": true }`

Customer: `{ id, name, tier }`

## Orders
`GET /orders?pg=1`
Returns `{ "status": "OK", "pg": 1, "data": [Order], "more": true }`

`GET /orders/{id}`
Returns `{ "status": "OK", "data": Order }`

`POST /orders`
Body: `{ "customer_id": "C-100", "sku": "WIDGET-A", "qty": 3 }`
Returns `{ "status": "OK", "data": Order }`

Order: `{ id, customer_id, sku, qty, state }` where state is open | shipped | cancelled

## Sync
`POST /sync`
Triggers the batch reconciliation job between the ERP and the warehouse.

## Errors
Standard HTTP status codes are used for errors.
