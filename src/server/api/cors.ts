import { CorsOptions } from "cors";

export const corsOptions: CorsOptions = {
  origin: "*",
  allowedHeaders: "*",
  methods: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
  credentials: true,
};
