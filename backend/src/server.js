import express from "express";
import cors from "cors";
import "dotenv/config";

import fs from "node:fs";
import path from "node:path";

import { clerkMiddleware } from "@clerk/express";

import User from "./models/user.model.js";
import { connectDB } from "./lib/db.js";

const app = express();

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL;

const publicDirPath = path.join(process.cwd(), "public");

app.use(express.json());

app.use(
    cors({
        origin: FRONTEND_URL || true,
        credentials: true
    })
);

app.use(clerkMiddleware());

app.get("/health", (req, res) => {
    res.status(200).json({ ok: true });
});

// Serve frontend files
if (fs.existsSync(publicDirPath)) {
    app.use(express.static(publicDirPath));

    app.get("/{*any}", (req, res, next) => {
        res.sendFile(
            path.join(publicDirPath, "index.html"),
            (err) => next(err)
        );
    });
}

// Start server and connect database
const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server is running on port ${PORT}`);

            if(process.env.NODE_ENV === "production") job.start();
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
