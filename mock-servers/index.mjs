// Starts both demo legacy systems. Run with `npm run mocks` (also started by `npm run dev`).
import { createAcmeApp, ACME_PORT } from "./acmeerp.mjs";
import { createShipTrackApp, SHIPTRACK_PORT } from "./shiptrack.mjs";

createAcmeApp().listen(ACME_PORT, () => console.log(`AcmeERP mock   -> http://localhost:${ACME_PORT}`));
createShipTrackApp().listen(SHIPTRACK_PORT, () => console.log(`ShipTrack mock -> http://localhost:${SHIPTRACK_PORT}`));
