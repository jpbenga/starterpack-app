import * as admin from "firebase-admin";

// ========================================================================
// Initialisation Firebase Admin SDK (Une seule fois)
// ========================================================================
admin.initializeApp();

// ========================================================================
// Exportation des fonctions depuis leurs fichiers dédiés
// ========================================================================

// Exportez la fonction de génération d'image
export * from "./handlers/generateImageStarterPack";

// Exportez la fonction d'accès premium
export * from "./handlers/grantPremiumAccess"; // <- NOUVELLE LIGNE

// ========================================================================
// Ajoutez d'autres exports de fonctions ici au fur et à mesure
// export * from "./handlers/votreAutreFonction";
// ========================================================================

