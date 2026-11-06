import express from "express";
import cors from "cors";
import "dotenv/config";

import fs from "node:fs";
import path from "node:path";

import { clerkMiddleware } from "@clerk/express";

import { connectDB } from "./lib/db.js";
import job from "./lib/cron.js";

import clerkWebhook from "./webhooks/clerk.webhook.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

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

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (fs.existsSync(publicDirPath)) {
    app.use(express.static(publicDirPath));

    app.get("/{*any}", (req, res, next) => {
        res.sendFile(
            path.join(publicDirPath, "index.html"),
            (err) => {
                if (err) next(err);
            }
        );
    });
}

// Turn upload errors (file too large, wrong type, ...) into JSON the frontend can show.
app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "File is too large (max 25MB)" });
    }

    if (err?.status && err.status < 500) {
        return res.status(err.status).json({ message: err.message });
    }

    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Internal server error" });
});

const startServer = async () => {
    try {
        await connectDB();

        server.listen(PORT, "0.0.0.0", () => {
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