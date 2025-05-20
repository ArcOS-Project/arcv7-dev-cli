import type { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { ProjectMetadata } from "../../types/project";
import { Signale } from "signale";

export const SockLog = new Signale({
  scope: "SIO",
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
      SockLog.warn(
        `Only one client is allowed at a time. Disconnecting ${sock.id.blue}`
      );
      this.client.sock.disconnect();
    }

    SockLog.info(`Connecting client ${sock.id.blue}`);

    const client = new SockClient(sock, this);
    this.client = client;
  }
}

export class SockClient {
  sock: Socket;
  server: WebSock;
  pid: number = -1;

  constructor(sock: Socket, server: WebSock) {
    this.sock = sock;
    this.server = server;

    this.start();
  }

  start() {
    this.sock.emit("open-file", "V:/_app.tpa");
  }
}
