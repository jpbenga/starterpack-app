import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin"; // admin est nécessaire ici

// Note: admin.initializeApp() est appelé dans index.ts, pas besoin de le refaire ici.

export const grantPremiumAccess = onCall(
  {
    region: "us-central1", // Ou europe-west1
  },
  async (request) => {
    logger.info("grantPremiumAccess: Function called", { auth: request.auth, data: request.data });

    const uid = request.auth?.uid;
    if (!uid) {
        logger.error("grantPremiumAccess: User is not authenticated.");
        throw new HttpsError('unauthenticated', 'User must be logged in to grant premium access.');
    }

    // TODO: Mettre en place une vraie logique de vérification ici
    const paymentVerified = true; // Placeholder - À remplacer par votre logique
    logger.info(`grantPremiumAccess: Proceeding to grant premium for user ${uid}. Payment verification status: ${paymentVerified}`);

    if (!paymentVerified) {
        logger.warn(`grantPremiumAccess: Payment verification failed for user ${uid}.`);
        throw new HttpsError('failed-precondition', 'Payment verification failed or conditions not met.');
    }

    try {
        const user = await admin.auth().getUser(uid);
        const existingClaims = user.customClaims || {};

        const newClaims = {
           ...existingClaims,
           premium: true
        };

        await admin.auth().setCustomUserClaims(uid, newClaims);
        logger.info(`grantPremiumAccess: Successfully set custom claims for user ${uid}`, { claims: newClaims });

        try {
            await admin.firestore().collection('users').doc(uid).set({
                isPremium: true,
                premiumStartDate: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            logger.info(`grantPremiumAccess: Successfully updated Firestore profile for user ${uid}`);
        } catch (firestoreError) {
            logger.error(`grantPremiumAccess: Failed to update Firestore profile for user ${uid} after setting claim`, firestoreError);
            // Ne pas bloquer si le claim est défini mais Firestore échoue
        }

        return { success: true, message: "Premium access granted successfully." };

    } catch (error) {
        logger.error(`grantPremiumAccess: Failed to set custom claim for user ${uid}`, error);
        // Utiliser HttpsError pour les erreurs internes dans les fonctions appelables
        throw new HttpsError('internal', 'Failed to grant premium access.', (error instanceof Error ? error.message : undefined));
    }
  });
