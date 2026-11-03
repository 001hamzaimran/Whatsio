// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import { normalizeCountryCode, normalizePhone } from "./phone.js";
import PrivacyWebhookHandlers from "./privacy.js";

const SETTINGS_NAMESPACE = "whatsio";
const DEFAULT_MESSAGE = "Hi! I have a question about your products.";
const REACT_REFRESH_PREAMBLE =
  '<script type="module" src="/dev_embed.js"></script>';

const SETTINGS_QUERY = `
  query WhatsioSettings {
    currentAppInstallation {
      id
      phone: metafield(namespace: "whatsio", key: "phone") { value }
      countryCode: metafield(namespace: "whatsio", key: "country_code") { value }
      message: metafield(namespace: "whatsio", key: "message") { value }
      position: metafield(namespace: "whatsio", key: "position") { value }
    }
    shop {
      myshopifyDomain
    }
  }
`;

const SAVE_SETTINGS_MUTATION = `
  mutation SaveWhatsioSettings($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());

app.use(express.json());

app.get("/api/settings", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  try {
    const response = await client.request(SETTINGS_QUERY);
    const installation = response.data.currentAppInstallation;

    res.status(200).send({
      phone: installation.phone?.value || "",
      countryCode: installation.countryCode?.value || "92",
      message: installation.message?.value || DEFAULT_MESSAGE,
      position: installation.position?.value || "right",
      shop: response.data.shop.myshopifyDomain,
    });
  } catch (error) {
    console.error("Failed to load Whatsio settings", error);
    res.status(500).send({ error: "Could not load your settings." });
  }
});

app.post("/api/settings", async (req, res) => {
  const countryCode = normalizeCountryCode(req.body.countryCode);
  const phone = normalizePhone(req.body.phone, countryCode);
  const message = String(req.body.message || "").trim();
  const position = req.body.position === "left" ? "left" : "right";

  if (!countryCode) {
    return res.status(422).send({
      error: "Enter a valid country calling code, such as +92.",
    });
  }

  if (!phone) {
    return res.status(422).send({
      error:
        "Enter a valid WhatsApp number. Local numbers will use the country calling code above.",
    });
  }

  if (!message || message.length > 500) {
    return res.status(422).send({
      error: "Enter a prewritten message between 1 and 500 characters.",
    });
  }

  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  try {
    const settingsResponse = await client.request(SETTINGS_QUERY);
    const ownerId = settingsResponse.data.currentAppInstallation.id;
    const response = await client.request(SAVE_SETTINGS_MUTATION, {
      variables: {
        metafields: [
          {
            ownerId,
            namespace: SETTINGS_NAMESPACE,
            key: "phone",
            type: "single_line_text_field",
            value: phone,
          },
          {
            ownerId,
            namespace: SETTINGS_NAMESPACE,
            key: "country_code",
            type: "single_line_text_field",
            value: countryCode,
          },
          {
            ownerId,
            namespace: SETTINGS_NAMESPACE,
            key: "message",
            type: "multi_line_text_field",
            value: message,
          },
          {
            ownerId,
            namespace: SETTINGS_NAMESPACE,
            key: "position",
            type: "single_line_text_field",
            value: position,
          },
        ],
      },
    });
    const userErrors = response.data.metafieldsSet.userErrors;

    if (userErrors.length > 0) {
      return res.status(422).send({ error: userErrors[0].message });
    }

    return res.status(200).send({ phone, countryCode, message, position });
  } catch (error) {
    console.error("Failed to save Whatsio settings", error);
    return res.status(500).send({ error: "Could not save your settings." });
  }
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace(
          "<!-- VITE_REACT_REFRESH_PREAMBLE -->",
          process.env.NODE_ENV === "production" ? "" : REACT_REFRESH_PREAMBLE
        )
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT);
