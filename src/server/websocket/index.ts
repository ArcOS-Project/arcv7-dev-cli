import type { Server as HttpServer } from "http";
import { Signale } from "signale";
import { Server, Socket } from "socket.io";
import { LogItem, LogLevel } from "../../types/logging";
import { ProjectMetadata } from "../../types/project";

export const SockLog = new Signale({
  scope: "SIO",
  interactive: false,
});

export const SysLog = new Signale({
  scope: "ARC",
  interactive: false,
});

export class WebSock {
  io: Server;
  meta: ProjectMetadata;
  client?: SockClient;

  constructor(http: HttpServer, meta: ProjectMetadata) {
    this.meta = meta;
    this.io = new Server(http);
  }

  start() {
    this.io.on("connection", (s) => this.onConnection(s));
  }

  onConnection(sock: Socket) {
    if (this.client) {
      SockLog.warn(`Only one client is allowed at a time. Disconnecting ${sock.id.blue}`);
      this.client.sock.disconnect();
    }

    SockLog.info(`Connecting client ${sock.id.blue}`);

    const client = new SockClient(sock, this);
    this.client = client;
  }
}

export class SockClient {
  pids: number[] = [];
  sock: Socket;
  server: WebSock;
  pid: number = -1;

  constructor(sock: Socket, server: WebSock) {
    this.sock = sock;
    this.server = server;

    this.start();
  }

  start() {
    this.sock.on("disconnect", () => {
      SockLog.warn("Client disconnected!");
    });

    this.sock.on("pids", (pids: number[]) => {
      if (this.pids.toString() === pids.toString()) return;

      SockLog.info(`Got PIDs: ${pids.join(", ") || "(none)"}`);
      this.pids = pids;
    });

    this.sock.on("log-item", (item: LogItem) => {
      const log = () => {
        switch (item.level) {
          case LogLevel.warning:
            SysLog.warn(`[SYSTEM LOG] ${item.source}: ${item.message}`);
            break;
          case LogLevel.error:
          case LogLevel.critical:
            SysLog.error(`[SYSTEM LOG] ${item.source}: ${item.message}`);
            break;
          case LogLevel.info:
            SysLog.info(`[SYSTEM LOG] ${item.source}: ${item.message}`);
            break;
        }
      };

      switch (this.server.meta.logLevel) {
        case undefined:
        case "none":
          return;
        case "all":
          log();
          break;
        case "process":
          for (const pid of this.pids) {
            if (item.source.includes(`[${pid}]`) || item.message.includes(`PID ${pid}`) || item.message.includes(`${pid} PID`)) {
              log();
            }
          }
      }
    });

    this.sock.emit("open-file", "V:/_app.tpa");
  }
}
