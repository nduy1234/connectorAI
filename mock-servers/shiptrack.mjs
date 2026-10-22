// ShipTrack — a fake in-house logistics tracker. Different vendor, same bad habits:
//  * errors are HTTP 200 with {"ok":false,"error":...}  (silent 200 errors)
//  * pagination uses ?page=N (1-based, fixed size 3) and a "has_next" flag  (legacy pagination)
//  * session tokens expire after 3 calls -> 401 SESSION_EXPIRED  (token refresh)
//  * NEW quirk: tracking IDs are case-sensitive and must be UPPERCASE
import express from "express";

export const SHIPTRACK_PORT = 4002;
const USER = { username: "ops", password: "tracker" };
const CALLS_PER_TOKEN = 3;
const PAGE_SIZE = 3;

const shipments = [
  { tracking_id: "ST-9001", carrier: "UPS", status: "in_transit", destination: "Austin, TX" },
  { tracking_id: "ST-9002", carrier: "FedEx", status: "delivered", destination: "Denver, CO" },
  { tracking_id: "ST-9003", carrier: "DHL", status: "label_created", destination: "Boston, MA" },
  { tracking_id: "ST-9004", carrier: "UPS", status: "in_transit", destination: "Seattle, WA" },
  { tracking_id: "ST-9005", carrier: "USPS", status: "exception", destination: "Miami, FL" },
  { tracking_id: "ST-9006", carrier: "FedEx", status: "in_transit", destination: "Chicago, IL" },
  { tracking_id: "ST-9007", carrier: "DHL", status: "delivered", destination: "Portland, OR" },
];
const carriers = ["UPS", "FedEx", "DHL", "USPS"];
const sessions = new Map(); // token -> calls remaining

const fail = (res, error) => res.status(200).json({ ok: false, error });

export function createShipTrackApp() {
  const app = express();
  app.use(express.json());

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body ?? {};
    if (username !== USER.username || password !== USER.password) return fail(res, "BAD_CREDENTIALS");
    const token = "st_" + Math.random().toString(36).slice(2, 10);
    sessions.set(token, CALLS_PER_TOKEN);
    res.json({ ok: true, session_token: token });
  });

  app.use("/api", (req, res, next) => {
    const token = req.headers["x-session-token"];
    const left = sessions.get(token);
    if (!left) return res.status(401).json({ ok: false, error: "SESSION_EXPIRED" });
    if (left <= 1) sessions.delete(token);
    else sessions.set(token, left - 1);
    next();
  });

  app.get("/api/carriers", (_req, res) => res.json({ ok: true, carriers }));

  app.get("/api/shipments", (req, res) => {
    const n = Math.max(1, parseInt(req.query.page ?? "1", 10) || 1);
    const results = shipments.slice((n - 1) * PAGE_SIZE, n * PAGE_SIZE);
    res.json({ ok: true, page: n, results, has_next: n * PAGE_SIZE < shipments.length });
  });

  app.get("/api/shipments/:trackingId", (req, res) => {
    // Case-sensitive lookup on purpose: "st-9001" is NOT found.
    const s = shipments.find((x) => x.tracking_id === req.params.trackingId);
    if (!s) return fail(res, "NOT_FOUND");
    res.json({ ok: true, shipment: s });
  });

  app.post("/api/shipments/:trackingId/label", (req, res) => {
    const s = shipments.find((x) => x.tracking_id === req.params.trackingId);
    if (!s) return fail(res, "NOT_FOUND");
    if (!req.body?.weight_kg) return fail(res, "WEIGHT_REQUIRED");
    res.json({ ok: true, label_url: `http://localhost:${SHIPTRACK_PORT}/labels/${s.tracking_id}.pdf` });
  });

  return app;
}
