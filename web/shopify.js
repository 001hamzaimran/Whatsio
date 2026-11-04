import { shopifyApp } from "@shopify/shopify-app-express";
import { SQLiteSessionStorage } from "@shopify/shopify-app-session-storage-sqlite";

const DB_PATH = `${process.cwd()}/database.sqlite`;
const REQUIRED_SCOPES = (process.env.SCOPES || "")
  .split(",")
  .map((scope) => scope.trim())
  .filter(Boolean);

const shopify = shopifyApp({
  api: {
    apiVersion: "2026-10",
    scopes: REQUIRED_SCOPES,
    future: {
      customerAddressDefaultFix: true,
      lineItemBilling: true,
      unstable_managedPricingSupport: true,
    },
    billing: undefined, // 100% Free app - no charges or billing API needed
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  sessionStorage: new SQLiteSessionStorage(DB_PATH),
});

// Safely wrap webhook registration so a GraphQL 403 on webhook check does not crash the entire OAuth handshake
const originalRegister = shopify.api.webhooks.register;
if (typeof originalRegister === "function") {
  shopify.api.webhooks.register = async function (...args) {
    try {
      return await originalRegister.apply(this, args);
    } catch (err) {
      shopify.config.logger.warning(
        `Webhook auto-registration notice (${err.message}). Continuing OAuth callback.`
      );
      return {};
    }
  };
}

export default shopify;
