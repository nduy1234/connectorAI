// AcmeERP — a fake 2009-era ERP with the usual legacy quirks:
//  * every error comes back as HTTP 200 with {"status":"ERROR"}  (silent 200 errors)
//  * pagination uses ?pg=N (1-based, fixed size 2) and a "more" flag  (legacy pagination)
//  * access tokens die after 3 calls; you get a 401 and must re-auth  (token refresh)
//  * POST /sync during business hours (09:00-17:00) locks the ERP  (time-window rule)
import express from "express";

export const ACME_PORT = 4001;
const CLIENT = { client_id: "acme-demo", client_secret: "s3cret" };
const CALLS_PER_TOKEN = 3;
const PAGE_SIZE = 2;

const customers = [
  { id: "C-100", name: "Globex Corp", tier: "gold" },
  { id: "C-101", name: "Initech", tier: "silver" },
  { id: "C-102", name: "Umbrella LLC", tier: "bronze" },
];
const orders = [
  { id: "1001", customer_id: "C-100", sku: "WIDGET-A", qty: 10, state: "shipped" },
  { id: "1002", customer_id: "C-101", sku: "WIDGET-B", qty: 4, state: "open" },
  { id: "1003", customer_id: "C-100", sku: "GADGET-X", qty: 1, state: "open" },
  { id: "1004", customer_id: "C-102", sku: "WIDGET-A", qty: 25, state: "cancelled" },
  { id: "1005", customer_id: "C-101", sku: "GADGET-Y", qty: 7, state: "open" },
];
const tokens = new Map(); // token -> calls remaining

const fail = (res, message) => res.status(200).json({ status: "ERROR", message });

function page(list, pg) {
  const n = Math.max(1, parseInt(pg ?? "1", 10) || 1);
  const data = list.slice((n - 1) * PAGE_SIZE, n * PAGE_SIZE);
  return { status: "OK", pg: n, data, more: n * PAGE_SIZE < list.length };
}

export function createAcmeApp() {
  const app = express();
  app.use(express.json());

  app.post("/auth/token", (req, res) => {
    const { client_id, client_secret } = req.body ?? {};
    if (client_id !== CLIENT.client_id || client_secret !== CLIENT.client_secret) {
      return fail(res, "INVALID_CLIENT");
    }
    const token = "acme_" + Math.random().toString(36).slice(2, 10);
    tokens.set(token, CALLS_PER_TOKEN);
    res.json({ status: "OK", access_token: token, expires_in: 30 });
  });

  // Everything below needs a live token.
  app.use((req, res, next) => {
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    const left = tokens.get(token);
    if (!left) return res.status(401).json({ error: "token_expired" });
    if (left <= 1) tokens.delete(token);
    else tokens.set(token, left - 1);
    next();
  });

  app.get("/customers", (req, res) => res.json(page(customers, req.query.pg)));
  app.get("/orders", (req, res) => res.json(page(orders, req.query.pg)));

  app.get("/orders/:id", (req, res) => {
    const order = orders.find((o) => o.id === req.params.id);
    if (!order) return fail(res, "ORDER_NOT_FOUND");
    res.json({ status: "OK", data: order });
  });

  app.post("/orders", (req, res) => {
    const { customer_id, sku, qty } = req.body ?? {};
    if (!customer_id) return fail(res, "MISSING_FIELD customer_id");
    if (!customers.some((c) => c.id === customer_id)) return fail(res, "UNKNOWN_CUSTOMER");
    if (!sku) return fail(res, "MISSING_FIELD sku");
    const order = { id: String(1001 + orders.length), customer_id, sku, qty: Number(qty ?? 1), state: "open" };
    orders.push(order);
    res.json({ status: "OK", data: order });
  });

  app.post("/sync", (_req, res) => {
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 17) return fail(res, "SYNC_LOCKED: nightly batch tables locked during business hours");
    res.json({ status: "OK", synced: orders.length });
  });

  return app;
}
