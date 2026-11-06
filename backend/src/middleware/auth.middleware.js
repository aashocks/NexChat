import { clerkClient, getAuth } from "@clerk/express";
import User from "../models/user.model.js";

function getPrimaryEmail(clerkUser) {
    const addresses = clerkUser.emailAddresses ?? [];
    const primary = addresses.find((address) => address.id === clerkUser.primaryEmailAddressId);

    return (primary ?? addresses[0])?.emailAddress;
}

function getFullName(clerkUser, email) {
    return (
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        clerkUser.username ||
        email.split("@")[0]
    );
}

/**
 * Creates or repairs the MongoDB profile for a Clerk user, straight from Clerk.
 *
 * The Clerk webhook normally does this, but it can be missed (webhook not configured for the
 * live URL, user signed up before it was, Clerk keys/instance changed, ...). Without this
 * fallback those users get a 404 on every request and see an empty app.
 */
async function syncUserFromClerk(clerkId) {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    const email = getPrimaryEmail(clerkUser);

    if (!email) return null;

    const profile = {
        fullName: getFullName(clerkUser, email),
        profilePic: clerkUser.imageUrl || "",
    };

    try {
        // 1. Profile exists for this Clerk ID: just refresh it (also fills in missing names).
        const byClerkId = await User.findOneAndUpdate(
            { clerkId },
            { $set: profile },
            { new: true },
        );
        if (byClerkId) return byClerkId;

        // 2. Same person under an older Clerk ID: re-link it so their _id and chat history stay.
        const byEmail = await User.findOneAndUpdate(
            { email },
            { $set: { clerkId, ...profile } },
            { new: true },
        );
        if (byEmail) return byEmail;

        // 3. Brand new user.
        return await User.create({ clerkId, email, ...profile });
    } catch (error) {
        // Two requests raced to create the same user: use whichever one won.
        if (error?.code === 11000) return User.findOne({ clerkId });
        throw error;
    }
}

export async function protectRoute(req, res, next) {
    try {
        const { userId } = getAuth(req);

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        let user = await User.findOne({ clerkId: userId });

        // Missing profile, or one saved without a name: sync it from Clerk.
        if (!user || !user.fullName) {
            try {
                user = (await syncUserFromClerk(userId)) ?? user;
            } catch (syncError) {
                console.error("Could not sync user from Clerk:", syncError.message);
            }
        }

        if (!user) {
            res.status(404).json({ message: "User profile is not synced yet" });
            return;
        }

        req.user = user;

        next();
    }   catch (error) {
        console.error("Error in protectRoute middleware:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}
