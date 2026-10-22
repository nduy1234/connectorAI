Notes from call with Dana (Acme IT lead) + Raj (integration contractor):

- The docs lie about errors. Everything returns HTTP 200. /orders and every other endpoint returns 200 even on failure, so you MUST check the `status` field — anything other than "OK" is a failure and the reason is in `message`.
- Pagination is the old style: `?pg=` starting at 1, page size is hard-coded to 2 and you can't change it. Keep going while `more` is true. People forget and only ever get the first 2 orders.
- Tokens are garbage — they say expires_in 30 but they actually die after a handful of calls. When you get a 401 just re-hit /auth/token and retry. Don't surface the 401 to users.
- Never call /sync during business hours (9am–5pm). It locks the order tables and the warehouse floor stops. Only after 17:00 or before 09:00.
- Order IDs are numeric strings like "1001". Customer IDs look like "C-100".
