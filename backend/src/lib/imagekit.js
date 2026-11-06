import ImageKit, { toFile } from "@imagekit/nodejs";

// Environment variable names are case-sensitive on Linux (Render), so accept both spellings.
function getPrivateKey() {
    return (process.env.ImageKit_PRIVATE_KEY || process.env.IMAGEKIT_PRIVATE_KEY || "").trim();
}

let client;

// Created on first use so a missing key can never break server start-up.
function getClient() {
    if (!client) client = new ImageKit({ privateKey: getPrivateKey() });
    return client;
}

function hasImageKitConfig() {
    return Boolean(getPrivateKey());
}

// this helper makes a safe, unique filename for imagekit uploads.
function createFileName( originalName = "upload") {
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/gi, "_");
    return `chat-${Date.now()}-${safeName}`;
}

/**
 * Upload image or video to ImageKit
 * @see https://imagekit.io/docs/api-reference/upload-file/upload-file
 */
async function uploadChatMedia(file) {
    const fileName = createFileName(file.originalname);

    const result = await getClient().files.upload({
        file: await toFile(file.buffer, fileName, { type: file.mimetype }),
        fileName,
        folder: "/chat",
    });

    return result.url;
}

export { uploadChatMedia, hasImageKitConfig };
