import express from "express";
import User from "../models/user.model.js";
import { verifyWebhook } from "@clerk/express/webhooks";

const router = express.Router();

router.post("/", async (req, res) => {

    // Step 1: Verify the Clerk webhook
    let evt;

    try {
        evt = await verifyWebhook(req);

        console.log("CLERK WEBHOOK RECEIVED:", evt.type);
        console.log("CLERK USER ID:", evt.data.id);

    } catch (error) {
        console.error("CLERK VERIFICATION ERROR:", error);

        return res.status(400).json({
            error: "Webhook verification failed"
        });
    }

    // Step 2: Save or update the user in MongoDB
    try {

        if (
            evt.type === "user.created" ||
            evt.type === "user.updated"
        ) {
            const u = evt.data;

            const email =
                u.email_addresses?.find(
                    (e) => e.id === u.primary_email_address_id
                )?.email_address ??
                u.email_addresses?.[0]?.email_address;

            const fullName =
                [u.first_name, u.last_name]
                    .filter(Boolean)
                    .join(" ") ||
                u.username ||
                email?.split("@")[0];

            const savedUser = await User.findOneAndUpdate(
                { clerkId: u.id },
                {
                    clerkId: u.id,
                    email,
                    fullName,
                    profilePic: u.image_url
                },
                {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true
                }
            );

            console.log("USER SAVED TO MONGODB:", savedUser?._id);
        }

        if (evt.type === "user.deleted") {
            if (evt.data.id) {
                const deletedUser = await User.findOneAndDelete({
                    clerkId: evt.data.id
                });

                console.log(
                    "USER DELETED FROM MONGODB:",
                    deletedUser?._id
                );
            }
        }

        return res.status(200).json({ ok: true });

    } catch (error) {
        console.error("MONGODB WEBHOOK ERROR:", error);

        return res.status(500).json({
            error: "Failed to synchronize user with MongoDB"
        });
    }
});

export default router;
