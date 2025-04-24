import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import OpenAI from "openai";
import cors from 'cors';
import { CARTOON_CUSTOM_PROMPT } from "../prompts/cartoonPrompt"; // Assurez-vous que le chemin est correct

const openaiApiKeyParam = defineSecret("OPENAI_KEY");

// Configuration CORS (gardée pour la fonction HTTP)
const allowedOrigins = [
    'https://4200-idx-starterpack-appgit-1745404939831.cluster-c23mj7ubf5fxwq6nrbev4ugaxa.cloudworkstations.dev',
    // Ajoutez d'autres origines ici si nécessaire
];
const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Logique CORS... (inchangée)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: "POST, GET, OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
};
const corsHandler = cors(corsOptions);

export const genererImageStarterPack = onRequest(
  {
    region: "us-central1", // Ou europe-west1
    timeoutSeconds: 120,
    memory: "1GiB",
    secrets: [openaiApiKeyParam],
  },
  (request, response) => {
      logger.info(`genererImageStarterPack: Request received - Method=${request.method}, Origin=${request.headers.origin}`);
      corsHandler(request, response, async () => {
          logger.info("genererImageStarterPack: CORS handler passed.");
          let openai: OpenAI;
          try {
              // Initialisation OpenAI (inchangée)
              try {
                  openai = new OpenAI({ apiKey: openaiApiKeyParam.value() });
              } catch (initErr: any) {
                  logger.error("!!! genererImageStarterPack: Failed to initialize OpenAI client.", { error: initErr.message });
                  response.status(500).send({ error: "Server configuration error." });
                  return;
              }

              const { userId, image } = request.body;
              logger.info(`genererImageStarterPack: Processing request for userId: ${userId}`);

              if (!userId || !image) {
                  logger.warn("genererImageStarterPack: Missing userId or image in request body.");
                  response.status(400).send({ error: "Missing userId or image in body." });
                  return;
              }

              // --- Vérification du statut Premium Côté Serveur ---
              let isPremiumUser = false;
              try {
                  const userRecord = await admin.auth().getUser(userId);
                  isPremiumUser = userRecord.customClaims?.['premium'] === true;
                  logger.info(`genererImageStarterPack: User ${userId} premium status: ${isPremiumUser}`);
              } catch (authError) {
                  logger.error(`genererImageStarterPack: Failed to get user record for ${userId}`, authError);
                  // Continuer comme non-premium si l'utilisateur n'est pas trouvé (sécurité)
              }
              // ----------------------------------------------------

              // Traitement et upload image originale (inchangé)
              const base64 = image.includes(",") ? image.split(",")[1] : image;
              const imageBuffer = Buffer.from(base64, "base64");
              const timestamp = Date.now();
              const bucket = admin.storage().bucket();
              const originalPath = `images/original/${userId}/${timestamp}.jpg`;
              const originalFile = bucket.file(originalPath);
              await originalFile.save(imageBuffer, { contentType: "image/jpeg" });
              const [originalUrl] = await originalFile.getSignedUrl({ action: "read", expires: "03-09-2491" });
              logger.info(`genererImageStarterPack: Original image URL generated.`);

              // Prompt (inchangé)
              const prompt = CARTOON_CUSTOM_PROMPT;

              // --- Ajustement des paramètres DALL-E selon le statut premium ---
              const dalleModel = "dall-e-3";
              const imageSize = "1024x1024"; // Garder la taille standard pour l'instant
              // Définir la qualité explicitement
              const imageQuality = isPremiumUser ? "hd" : "standard"; // HD pour premium, standard sinon
              logger.info(`genererImageStarterPack: Calling OpenAI DALL-E 3 for user ${userId} with quality: ${imageQuality}`);
              // ---------------------------------------------------------------

              const result = await openai.images.generate({
                  model: dalleModel,
                  prompt,
                  n: 1,
                  size: imageSize,
                  quality: imageQuality, // Utiliser la qualité déterminée
                  response_format: "b64_json",
              });

              const generatedB64 = result.data[0]?.b64_json;
              if (!generatedB64) {
                  logger.error("genererImageStarterPack: No image data (b64_json) returned by OpenAI.", { resultData: result.data });
                  throw new Error("No image returned by OpenAI.");
              }
              logger.info(`genererImageStarterPack: Image successfully generated by OpenAI for user ${userId}`);

              // Traitement et upload image générée (inchangé)
              const generatedBuffer = Buffer.from(generatedB64, "base64");
              const generatedPath = `images/generated/${userId}/${timestamp}.jpg`;
              const generatedFile = bucket.file(generatedPath);
              await generatedFile.save(generatedBuffer, { contentType: "image/jpeg" });
              const [generatedUrl] = await generatedFile.getSignedUrl({ action: "read", expires: "03-09-2491" });
              logger.info(`genererImageStarterPack: Generated image URL generated.`);

              // Sauvegarde Firestore (inchangée)
              await admin.firestore().collection("images").add({
                  userId,
                  originalImageUrl: originalUrl,
                  generatedImageUrl: generatedUrl,
                  prompt,
                  qualityUsed: imageQuality, // Sauvegarder la qualité utilisée peut être utile
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });

              // Réponse succès (inchangée)
              logger.info(`genererImageStarterPack: Successfully processed request for user ${userId}`);
              response.status(200).send({ generatedImageUrl: generatedUrl });

          } catch (err: any) {
              // Gestion des erreurs (inchangée)
              logger.error("!!! genererImageStarterPack: Error during function execution", { /* ... */ });
              const clientErrorMessage = "An unexpected error occurred during image generation. Please try again later.";
              response.status(500).send({ error: clientErrorMessage });
          }
      });
  }
);
