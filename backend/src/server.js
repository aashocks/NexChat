import express from "express";
import cors from "cors";
import "dotenv/config";

import fs from "node:fs";
import path from "node:path";

import { clerkMiddleware } from "@clerk/express";

import { connectDB } from "./lib/db.js";
import job from "./lib/cron.js";
import clerkWebhook from "./webhooks/clerk.webhook.js";

const app = express();

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL;

const publicDirPath = path.join(process.cwd(), "public");

app.use("/api/webhooks/clerk", express.raw({ type: "application/json" }), clerkWebhook);

app.use(express.json());

app.use(cors({
    origin: FRONTEND_URL || true,
    credentials: true
}));

app.use(clerkMiddleware());

app.get("/health", (req, res) => {
    res.status(200).json({ ok: true });
});

if (fs.existsSync(publicDirPath)) {
    app.use(express.static(publicDirPath));

    app.get("/{*any}", (req, res, next) => {
        res.sendFile(
            path.join(publicDirPath, "index.html"),
            (err) => next(err)
        );
    });
}

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server is running on port ${PORT}`);

            if (process.env.NODE_ENV === "production") {
                job.start();
                console.log("Cron job started");
            }
        });

    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();