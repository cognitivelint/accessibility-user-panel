import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

export interface DemoServer {
  port: number;
  url: string;
  close: () => Promise<void>;
}

export async function startDemoServer(port = Number(process.env.PORT ?? 4173)): Promise<DemoServer> {
  const server: Server = createServer(async (req, res) => {
    const file = req.url === "/" || !req.url ? "index.html" : req.url.replace(/^\//, "");
    try {
      const body = await readFile(join(root, file));
      res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Demo server did not bind a TCP port");
  }

  return {
    port: address.port,
    url: `http://127.0.0.1:${address.port}/`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

const invokedDirectly =
  Boolean(process.argv[1]) && pathToFileURL(process.argv[1]!).href === import.meta.url;

if (invokedDirectly) {
  const demo = await startDemoServer();
  process.stdout.write(`Demo app ${demo.url}\n`);
}
