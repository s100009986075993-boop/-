const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { RoomEngine, RoomError } = require("./room-engine.cjs");
const root = path.resolve(__dirname, "..");
function createRoomServer({ bank, engine, origins } = {}) {
  engine ||= new RoomEngine(
    bank ||
      ["structure", "environment", "law", "construction"].flatMap((s) =>
        JSON.parse(
          fs.readFileSync(path.join(root, "data", s + "-bank.json"), "utf8"),
        ),
      ),
  );
  const allowed = new Set(
    origins || [
      process.env.PUBLIC_ORIGIN || "https://s100009986075993-boop.github.io",
      "http://127.0.0.1:3000",
      "http://localhost:3000",
      "http://127.0.0.1:3001",
      "http://localhost:3001",
    ],
  );
  if (process.env.RENDER_EXTERNAL_URL)
    allowed.add(process.env.RENDER_EXTERNAL_URL.replace(/\/$/, ""));
  const rates = new Map(),
    createRates = new Map();
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    const send = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, "http://localhost"),
        route = url.pathname;
      if (route === "/health") {
        send(200, { ok: true, version: "rooms-1" });
        return;
      }
      if (route.startsWith("/api/")) {
        if (origin && !allowed.has(origin))
          throw new RoomError("這個網站尚未獲准連線", 403);
        if (origin) {
          res.setHeader("Access-Control-Allow-Origin", origin);
          res.setHeader("Vary", "Origin");
        }
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization",
        );
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        if (req.method === "OPTIONS") {
          res.writeHead(204);
          res.end();
          return;
        }
        const now = Date.now();
        for (const [k, v] of rates) if (now - v.at > 60000) rates.delete(k);
        const key = req.socket.remoteAddress;
        const rate = rates.get(key) || { at: now, count: 0 };
        if (++rate.count > 1500)
          throw new RoomError("操作太頻繁，請稍候再試", 429);
        rates.set(key, rate);
        let body = {};
        if (req.method === "POST") {
          if (
            !String(req.headers["content-type"]).startsWith("application/json")
          )
            throw new RoomError("請使用 JSON 請求", 415);
          const chunks = [];
          let bytes = 0;
          for await (const chunk of req) {
            chunks.push(chunk);
            bytes += chunk.length;
            if (bytes > 4096)
              throw new RoomError("請求內容太大", 413);
          }
          try {
            body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
          } catch {
            throw new RoomError("JSON 格式錯誤");
          }
          if (!body || typeof body !== "object" || Array.isArray(body))
            throw new RoomError("請求格式錯誤");
        }
        const token = /^Bearer ([a-f0-9]{64})$/.exec(
          req.headers.authorization || "",
        )?.[1];
        if (route === "/api/rooms" && req.method === "POST") {
          for (const [k, v] of createRates)
            if (now - v.at > 600000) createRates.delete(k);
          const attempts = createRates.get(key) || { at: now, count: 0 };
          createRates.set(key, attempts);
          if (++attempts.count > 20)
            throw new RoomError("建立房間太頻繁，請稍候再試", 429);
          send(201, engine.create(body));
          return;
        }
        const m =
          /^\/api\/rooms\/([A-Z2-9]{6})(?:\/(join|start|answer|next|leave))?$/.exec(
            route,
          );
        if (!m) throw new RoomError("找不到此操作", 404);
        const [, code, action] = m;
        if (!action && req.method === "GET")
          send(200, engine.view(code, token));
        else if (req.method === "POST" && action) {
          const handlers = {
            join: () => engine.join(code, body),
            start: () => engine.start(code, token),
            answer: () => engine.answer(code, token, body),
            next: () => engine.next(code, token),
            leave: () => {
              engine.leave(code, token);
              return { ok: true };
            },
          };
          send(200, handlers[action]());
        } else throw new RoomError("不支援此操作", 405);
        return;
      }
      if (!["GET", "HEAD"].includes(req.method))
        throw new RoomError("不支援此操作", 405);
      if (route === "/rooms-config.js") {
        res.writeHead(200, {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "no-store",
        });
        res.end('window.ARCHITECT_ROOMS = {apiBase: ""};');
        return;
      }
      const name = decodeURIComponent(route === "/" ? "/index.html" : route);
      if (
        !/^\/(?:index\.html|style\.css|[a-z][a-z0-9-]*\.js|(?:assets|data)\/[a-zA-Z0-9_./-]+)$/.test(
          name,
        ) ||
        name.split("/").includes("..")
      )
        throw new RoomError("找不到檔案", 404);
      const file = path.resolve(root, "." + name);
      if (!file.startsWith(root + path.sep))
        throw new RoomError("找不到檔案", 404);
      const stat = await fs.promises.stat(file).catch(() => null);
      if (!stat?.isFile()) throw new RoomError("找不到檔案", 404);
      const types = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
        ".txt": "text/plain; charset=utf-8",
      };
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      if (req.method === "HEAD") res.end();
      else fs.createReadStream(file).pipe(res);
    } catch (e) {
      if (!res.headersSent)
        send(e.status || 500, {
          error: e.status ? e.message : "服務暫時無法使用，請稍後重試",
        });
      else res.end();
    }
  });
  return { server, engine };
}
if (require.main === module) {
  const port = Number(process.env.PORT || 3001);
  createRoomServer().server.listen(port, "0.0.0.0", () =>
    console.log(`Room server listening on ${port}`),
  );
}
module.exports = { createRoomServer };
