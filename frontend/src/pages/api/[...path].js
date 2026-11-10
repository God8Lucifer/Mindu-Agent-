// Share the Node API implementation without starting a separate HTTP server.
import { handler } from "../../../../backend/src/server.js";

export const config = {
  api: { bodyParser: false },
  maxDuration: 90,
};

export default handler;
