import { Server, Socket } from "socket.io";
import { Project } from "../../project";
import type { Server as HttpServer } from "http";
import { ProjectMetadata } from "../../types/project";
import { join } from "path";

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
    if (this.client) this.client.sock.disconnect();

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
    this.sock.on("set-pid", (pid) => (this.pid = pid));
    this.sock.on("kernel", (k) => console.log(k));

    this.sock.emit("open-file", join("V:/_app.tpa"));
  }
}
