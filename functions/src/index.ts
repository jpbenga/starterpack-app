import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import OpenAI from "openai";

admin.initializeApp();

const openaiKey = defineSecret("OPENAI_KEY");

export const generateImage = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 120,
    memory: "1GiB",
    secrets: [openaiKey],
  },
  async (req, res) => {
    try {
      const openai = new OpenAI({ apiKey: openaiKey.value() });

      const { userId, image } = req.body;

      if (!userId || !image) {
        res.status(400).send({ error: "Missing userId or image in body." });
        return;
      }

      const base64 = image.includes(",") ? image.split(",")[1] : image;
      const imageBuffer = Buffer.from(base64, "base64");
      const timestamp = Date.now();
      const bucket = admin.storage().bucket();
      const originalPath = `images/original/${userId}/${timestamp}.jpg`;
      const originalFile = bucket.file(originalPath);

      await originalFile.save(imageBuffer, { contentType: "image/jpeg" });

      const [originalUrl] = await originalFile.getSignedUrl({
        action: "read",
        expires: "03-09-2491",
      });

      const prompt = `Create a 3D cartoon-style ultra-realistic "Starter Pack" image that looks like a premium collectible toy package.

Design details:
- Split the background into two parts: sky blue on the top, and off-white on the bottom.
- At the top, write "STARTER PACK" in elegant, uppercase typography.

Main figure:
- Use the provided image as a reference for the character's face.
- Keep the face's natural proportions without enlarging or exaggerating the features.
- Position the character inside a transparent plastic mold attached to a cardboard backing, like real toy packaging.

Around the main figure, include four clear accessory compartments, each containing one item:
1. A loyal-looking black Labrador
2. A pair of high-heeled red-soled shoes (Louboutin-style)
3. A miniature of a Peugeot 207 car
4. An elegant feminine activity item (e.g., a perfume bottle, a makeup compact, or a yoga accessory)

Typography:
- At the bottom of the packaging, write "ANTOINE" in the same elegant uppercase font used at the top.

Styling:
- The lighting should cast soft, realistic shadows across the figure and accessories.
- Ensure all elements are well-balanced, proportionate, and fit visually into a high-end toy packaging aesthetic.
- The overall style should feel fun and collectible, like a real boxed figure sold in stores.`;

      const result = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      });

      const generatedB64 = result.data[0]?.b64_json;

      if (!generatedB64) {
        throw new Error("No image returned by OpenAI.");
      }

      const generatedBuffer = Buffer.from(generatedB64, "base64");
      const generatedPath = `images/generated/${userId}/${timestamp}.jpg`;
      const generatedFile = bucket.file(generatedPath);

      await generatedFile.save(generatedBuffer, { contentType: "image/jpeg" });

      const [generatedUrl] = await generatedFile.getSignedUrl({
        action: "read",
        expires: "03-09-2491",
      });

      await admin.firestore().collection("images").add({
        userId,
        originalImageUrl: originalUrl,
        generatedImageUrl: generatedUrl,
        prompt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).send({ generatedImageUrl: generatedUrl });
    } catch (err: any) {
      logger.error("Error during function execution", {
        userId: req.body?.userId,
        message: err.message,
        stack: err.stack,
        ...(err.response?.data && { openAIError: err.response.data }),
      });

      const clientErrorMessage = err.message.includes("Cannot initialize OpenAI")
        ? "Server configuration error."
        : err.message || "Unexpected error during image generation";

      res.status(500).send({ error: clientErrorMessage });
    }
  }
);
