import { createServer } from "node:http";
import worker from "../dist/server/index.js";

const port = Number(process.env.PORT || 8787);
const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    if (body.length > 10000) { outgoing.writeHead(413); outgoing.end("Request too large"); return; }
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers)) {
      if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    const request = new Request("http://127.0.0.1:" + port + incoming.url, {
      method: incoming.method, headers, body: body.length ? body : undefined
    });
    const response = await worker.fetch(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500);
    outgoing.end(error instanceof Error ? error.message : "Server error");
  }
});
server.listen(port, "127.0.0.1", () => console.log("ShipGuard local preview: http://127.0.0.1:" + port));
