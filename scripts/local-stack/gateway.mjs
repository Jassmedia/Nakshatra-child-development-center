// Part of scripts/local-stack (testing only).
// Mini "Kong": routes /auth/v1 -> GoTrue, /rest/v1 -> PostgREST. Plus a tiny SMTP sink on :2500.
import http from "node:http";
import net from "node:net";
import fs from "node:fs";

const routes = [
  ["/auth/v1", 9999],
  ["/rest/v1", 3001],
];

http
  .createServer((req, res) => {
    const route = routes.find(([p]) => req.url.startsWith(p));
    if (!route) {
      res.writeHead(404).end("no route");
      return;
    }
    const [prefix, port] = route;
    const path = req.url.slice(prefix.length) || "/";
    const headers = { ...req.headers, host: `127.0.0.1:${port}` };
    // Like Kong: when only an apikey is sent, use it as the bearer token.
    if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
    const up = http.request({ host: "127.0.0.1", port, path, method: req.method, headers }, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
    up.on("error", (e) => {
      res.writeHead(502).end(String(e));
    });
    req.pipe(up);
  })
  .listen(54321, "127.0.0.1");

// SMTP sink: accepts any mail and appends it to mail.log (to read password-reset links).
net
  .createServer((sock) => {
    let data = false;
    let buf = "";
    sock.write("220 sink\r\n");
    sock.on("data", (chunk) => {
      const text = chunk.toString();
      if (data) {
        buf += text;
        if (buf.includes("\r\n.\r\n")) {
          fs.appendFileSync(process.env.MAIL_LOG ?? "/tmp/nakshatra-mail.log", buf + "\n=====\n");
          buf = "";
          data = false;
          sock.write("250 ok\r\n");
        }
        return;
      }
      for (const line of text.split("\r\n").filter(Boolean)) {
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === "EHLO") sock.write("250-sink\r\n250 AUTH PLAIN LOGIN\r\n");
        else if (cmd === "HELO") sock.write("250 sink\r\n");
        else if (cmd === "AUTH") sock.write("235 ok\r\n");
        else if (cmd === "DATA") {
          data = true;
          sock.write("354 go\r\n");
        } else if (cmd === "QUIT") {
          sock.write("221 bye\r\n");
          sock.end();
        } else sock.write("250 ok\r\n");
      }
    });
  })
  .listen(2500, "127.0.0.1");

console.log("gateway on 54321, smtp sink on 2500");
