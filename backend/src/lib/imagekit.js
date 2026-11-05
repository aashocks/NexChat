import ImageKit, { toFile} from "@imagekit/nodejs";

const imagekit = new ImageKit({ privateKey: process.env.ImageKit_PRIVATE_KEY });

function hasImageKitConfig() {
    return Boolean( process.env.ImageKit_PRIVATE_KEY );
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

        const result = await imagekit.files.upload({
            file: await toFile(file.buffer, fileName,{ type: file.mimetype }),
            fileName,
            folder: "/chat",
    });

    return result.url;
}

export { uploadChatMedia, hasImageKitConfig };