/// <reference types="@shopify/polaris-types" />
/// <reference types="@shopify/app-bridge-types" />

import { useEffect, useState, useRef } from "react";
import "./HomePage.css";

const EMPTY_SETTINGS = {
  phone: "",
  countryCode: "92",
  message: "Hi! I have a question about your products.",
  position: "right",
  shop: "",
};

const MESSAGE_PRESETS = [
  { label: "👋 Product Inquiry", text: "Hi! I have a question about your products." },
  { label: "💬 Order Support", text: "Hello! I need help with an order I placed." },
  { label: "🏷️ Discount Inquiry", text: "Hi! Are there any special discount offers available today?" },
  { label: "📦 Track Shipping", text: "Hello! I would like an update on my shipment." },
];

async function authFetch(url, options = {}) {
  const headers = { ...options.headers };
  if (!headers["Content-Type"] && options.method && options.method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  try {
    if (window.shopify?.idToken) {
      const token = await window.shopify.idToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.warn("Could not retrieve session token from App Bridge", err);
  }

  return fetch(url, { ...options, headers });
}

export default function HomePage() {
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [previewPhone, setPreviewPhone] = useState("");
  const [previewCountryCode, setPreviewCountryCode] = useState("92");
  const [previewMessage, setPreviewMessage] = useState(EMPTY_SETTINGS.message);
  const [previewPosition, setPreviewPosition] = useState("right");
  const [previewDevice, setPreviewDevice] = useState("desktop"); // "desktop" | "mobile"
  const [showBubble, setShowBubble] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const messageInputRef = useRef(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const response = await authFetch("/api/settings");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load your settings.");
      }

      setSettings(data);
      setPreviewPhone(data.phone || "");
      setPreviewCountryCode(data.countryCode || "92");
      setPreviewMessage(data.message || EMPTY_SETTINGS.message);
      setPreviewPosition(data.position || "right");
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Could not load your settings."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      phone: formData.get("phone") || previewPhone,
      countryCode: formData.get("countryCode") || previewCountryCode,
      message: formData.get("message") || previewMessage,
      position: previewPosition,
    };

    try {
      const response = await authFetch("/api/settings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save your settings.");
      }

      setSettings((current) => ({ ...current, ...data }));
      setPreviewPhone(data.phone);
      setPreviewCountryCode(data.countryCode);
      setPreviewMessage(data.message);
      setPreviewPosition(data.position);

      if (window.shopify?.toast) {
        window.shopify.toast.show("WhatsApp chat settings saved successfully!");
      }
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Could not save your settings."));
    } finally {
      setSaving(false);
    }
  }

  function handlePresetClick(text) {
    setPreviewMessage(text);
    if (messageInputRef.current) {
      messageInputRef.current.value = text;
    }
  }

  // Retained for future re-activation when ready
  function openThemeEditor() {
    const apiKey = document
      .querySelector('meta[name="shopify-api-key"]')
      ?.getAttribute("content");
    if (!settings.shop || !apiKey) return;

    const editorUrl = new URL(
      `https://${settings.shop}/admin/themes/current/editor`
    );
    editorUrl.searchParams.set("context", "apps");
    editorUrl.searchParams.set("activateAppId", `${apiKey}/whatsapp-chat`);
    window.open(editorUrl.toString(), "_blank");
  }

  const cleanPhone = (previewPhone || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone
    ? cleanPhone.startsWith(previewCountryCode)
      ? cleanPhone
      : `${previewCountryCode}${cleanPhone.replace(/^0+/, "")}`
    : "";
  const waUrlPreview = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(previewMessage)}`
    : `https://wa.me/<your-phone>?text=${encodeURIComponent(previewMessage)}`;

  const isConfigured = Boolean(previewPhone.trim());

  return (
    <div className="whatsio-container">
      {/* Header Hero Banner */}
      <div className="whatsio-hero">
        <div className="whatsio-hero-left">
          <div className="whatsio-hero-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16.04 3C8.86 3 3.02 8.8 3.02 15.94c0 2.28.6 4.5 1.74 6.45L3 29l6.82-1.78a13.08 13.08 0 0 0 6.21 1.58h.01c7.18 0 13.02-5.8 13.02-12.94C29.06 8.8 23.22 3 16.04 3Zm0 23.62h-.01c-1.91 0-3.79-.51-5.43-1.47l-.39-.23-4.05 1.06 1.08-3.92-.25-.4a10.69 10.69 0 0 1-1.66-5.72c0-5.94 4.81-10.76 10.72-10.76 5.9 0 10.71 4.82 10.71 10.76 0 5.87-4.81 10.68-10.72 10.68Zm5.88-8.03c-.32-.16-1.91-.94-2.21-1.05-.3-.11-.51-.16-.73.16-.21.32-.83 1.05-1.02 1.26-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.59a9.67 9.67 0 0 1-1.79-2.22c-.19-.32-.02-.5.14-.66.15-.14.32-.37.49-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.74-1-2.39-.26-.63-.53-.54-.73-.55h-.62c-.22 0-.57.08-.86.4-.3.32-1.13 1.1-1.13 2.68 0 1.58 1.16 3.11 1.32 3.32.16.21 2.28 3.46 5.52 4.85.77.33 1.37.53 1.84.68.77.24 1.47.21 2.03.13.62-.09 1.91-.77 2.18-1.52.27-.74.27-1.37.19-1.5-.08-.14-.3-.22-.62-.38Z" />
            </svg>
          </div>
          <div>
            <h1 className="whatsio-hero-title">Whatsio WhatsApp Chat</h1>
            <p className="whatsio-hero-desc">
              Connect with your store visitors and turn conversations into sales with a zero-delay WhatsApp floating button.
            </p>
          </div>
        </div>
        <div>
          <span className="whatsio-hero-pill">
            <span className="whatsio-hero-pill-dot"></span>
            {isConfigured ? "Configured & Ready" : "Setup Required"}
          </span>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 20 }}>
          <s-banner heading="Something went wrong" tone="critical" dismissible>
            {error}
          </s-banner>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <s-spinner accessibilityLabel="Loading WhatsApp settings" size="large" />
          <p style={{ marginTop: 12, color: "#6d7175", fontSize: 14 }}>
            Loading your WhatsApp settings...
          </p>
        </div>
      ) : (
        <div className="whatsio-grid">
          {/* Left Column: Configuration Settings */}
          <div>
            <div className="whatsio-card">
              <div className="whatsio-card-header">
                <div>
                  <h2 className="whatsio-card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    Button & Chat Configuration
                  </h2>
                  <p className="whatsio-card-subtitle">
                    Customize your contact number, prewritten greetings, and storefront position.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <s-stack direction="block" gap="base">
                  {/* Country Calling Code */}
                  <s-text-field
                    label="Default country calling code"
                    name="countryCode"
                    value={previewCountryCode ? `+${previewCountryCode.replace(/\D/g, "")}` : "+1"}
                    placeholder="+1"
                    autocomplete="tel-country-code"
                    details="Used only when the WhatsApp number does not already include a country code."
                    onInput={(e) => {
                      const val = (e.target.value || "").replace(/\D/g, "");
                      setPreviewCountryCode(val);
                    }}
                    required
                  />

                  {/* WhatsApp Number */}
                  <s-text-field
                    label="WhatsApp phone number"
                    name="phone"
                    value={previewPhone}
                    placeholder="03*******70 or +13*******70"
                    autocomplete="tel"
                    details="Spaces, parentheses, and dashes are automatically cleaned."
                    onInput={(e) => {
                      setPreviewPhone(e.target.value || "");
                    }}
                    required
                  />

                  {/* Prewritten message presets & textarea */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#202223", display: "block", marginBottom: 4 }}>
                      Prewritten greeting message
                    </label>
                    <p style={{ fontSize: 12, color: "#6d7175", margin: "0 0 8px 0" }}>
                      Choose a quick preset or type your custom message:
                    </p>
                    <div className="whatsio-presets">
                      {MESSAGE_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="whatsio-preset-btn"
                          onClick={() => handlePresetClick(preset.text)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <s-text-area
                      ref={messageInputRef}
                      name="message"
                      value={previewMessage}
                      rows={3}
                      maxLength={500}
                      onInput={(e) => {
                        setPreviewMessage(e.target.value || "");
                      }}
                      details={`${previewMessage.length}/500 characters used.`}
                      required
                    />
                  </div>

                  {/* Button position with visual selector */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#202223", display: "block", marginBottom: 6 }}>
                      Storefront button position
                    </label>
                    <div className="whatsio-position-selector">
                      <div
                        className={`whatsio-pos-card ${previewPosition === "right" ? "active" : ""}`}
                        onClick={() => setPreviewPosition("right")}
                      >
                        <div className="whatsio-pos-indicator">
                          <div className="whatsio-pos-indicator-dot right"></div>
                        </div>
                        <span className="whatsio-pos-text">Bottom Right</span>
                      </div>

                      <div
                        className={`whatsio-pos-card ${previewPosition === "left" ? "active" : ""}`}
                        onClick={() => setPreviewPosition("left")}
                      >
                        <div className="whatsio-pos-indicator">
                          <div className="whatsio-pos-indicator-dot left"></div>
                        </div>
                        <span className="whatsio-pos-text">Bottom Left</span>
                      </div>
                    </div>
                    {/* Hidden input to ensure FormData picks up position */}
                    <input type="hidden" name="position" value={previewPosition} />
                  </div>

                  {/* Dynamic wa.me URL Preview */}
                  <div className="whatsio-link-preview">
                    <span>🔗</span>
                    <div>
                      <strong>Target WhatsApp Link: </strong>
                      <span className="whatsio-link-url">{waUrlPreview}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div style={{ marginTop: 12 }}>
                    <s-button type="submit" variant="primary" loading={saving}>
                      Save settings
                    </s-button>
                  </div>
                </s-stack>
              </form>
            </div>

            {/* Instruction Section: Add it to your storefront */}
            <div className="whatsio-card">
              <div className="whatsio-card-header">
                <div>
                  <h2 className="whatsio-card-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                    How to Activate on Your Storefront
                  </h2>
                  <p className="whatsio-card-subtitle">
                    Follow these simple steps in Shopify Admin to enable the WhatsApp button on your live theme.
                  </p>
                </div>
              </div>

              <div className="whatsio-steps-container">
                <div className="whatsio-step-item">
                  <div className="whatsio-step-badge">1</div>
                  <div className="whatsio-step-content">
                    <h3 className="whatsio-step-title">Navigate to Themes</h3>
                    <p className="whatsio-step-desc">
                      In your Shopify Admin left navigation, click on <kbd>Online Store</kbd> and then select <kbd>Themes</kbd>.
                    </p>
                  </div>
                </div>

                <div className="whatsio-step-item">
                  <div className="whatsio-step-badge">2</div>
                  <div className="whatsio-step-content">
                    <h3 className="whatsio-step-title">Open the Theme Editor</h3>
                    <p className="whatsio-step-desc">
                      Find your active/published theme and click the black <kbd>Customize</kbd> button.
                    </p>
                  </div>
                </div>

                <div className="whatsio-step-item">
                  <div className="whatsio-step-badge">3</div>
                  <div className="whatsio-step-content">
                    <h3 className="whatsio-step-title">Select App Embeds</h3>
                    <p className="whatsio-step-desc">
                      In the left sidebar of the theme customizer, click the <strong>App embeds</strong> icon (the third icon from the top, shaped like a puzzle block 🧩).
                    </p>
                  </div>
                </div>

                <div className="whatsio-step-item">
                  <div className="whatsio-step-badge">4</div>
                  <div className="whatsio-step-content">
                    <h3 className="whatsio-step-title">Enable WhatsApp Chat</h3>
                    <p className="whatsio-step-desc">
                      Under the <strong>Whatsio</strong> app section, toggle the switch beside <strong>WhatsApp chat</strong> to <strong>ON</strong>.
                    </p>
                  </div>
                </div>

                <div className="whatsio-step-item">
                  <div className="whatsio-step-badge">5</div>
                  <div className="whatsio-step-content">
                    <h3 className="whatsio-step-title">Save Theme Changes</h3>
                    <p className="whatsio-step-desc">
                      Click the green/black <kbd>Save</kbd> button in the top-right corner. The chat button will immediately be live on your store!
                    </p>
                  </div>
                </div>
              </div>

              <div className="whatsio-step-tip">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span>
                  <strong>Zero-Code Guarantee:</strong> App Embeds are isolated and completely safe. They won't alter or break your theme's Liquid code!
                </span>
              </div>

              {/* 
                THEME EDITOR DIRECT BUTTON (Commented out per user request - use step-by-step instructions above):
                
                <div style={{ marginTop: 16 }}>
                  <s-button
                    variant="secondary"
                    onClick={openThemeEditor}
                    disabled={loading || !settings.shop}
                  >
                    Open theme editor
                  </s-button>
                </div>
              */}
              <div className="whatsio-commented-code-notice">
                💡 Direct theme customizer button is paused. Follow the 5 quick steps above to activate.
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Storefront Preview */}
          <div className="whatsio-preview-wrapper">
            <div className="whatsio-card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#202223" }}>
                    Live Storefront Preview
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#6d7175" }}>
                    Real-time preview of how customers see your chat widget
                  </p>
                </div>

                <div className="whatsio-device-toggle">
                  <button
                    type="button"
                    className={`whatsio-device-btn ${previewDevice === "desktop" ? "active" : ""}`}
                    onClick={() => setPreviewDevice("desktop")}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    className={`whatsio-device-btn ${previewDevice === "mobile" ? "active" : ""}`}
                    onClick={() => setPreviewDevice("mobile")}
                  >
                    Mobile
                  </button>
                </div>
              </div>

              {/* Mock Browser / Phone Frame */}
              <div className={`whatsio-mockup-frame ${previewDevice === "mobile" ? "mobile-mode" : ""}`}>
                <div className="whatsio-mockup-header">
                  <div className="whatsio-mockup-dots">
                    <span className="whatsio-mockup-dot red"></span>
                    <span className="whatsio-mockup-dot yellow"></span>
                    <span className="whatsio-mockup-dot green"></span>
                  </div>
                  <div className="whatsio-mockup-address">
                    🔒 {settings.shop || "your-store.myshopify.com"}
                  </div>
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>
                    {previewDevice === "desktop" ? "100%" : "375px"}
                  </span>
                </div>

                <div className="whatsio-store-screen">
                  {/* Store Navigation Bar Mock */}
                  <div className="whatsio-store-nav">
                    <span className="whatsio-store-brand">MY STORE</span>
                    <div className="whatsio-store-links">
                      <span className="whatsio-store-link"></span>
                      <span className="whatsio-store-link"></span>
                      <span className="whatsio-store-link"></span>
                    </div>
                  </div>

                  {/* Store Hero Banner Mock */}
                  <div className="whatsio-store-hero">
                    <div className="whatsio-store-hero-pill"></div>
                    <div className="whatsio-store-hero-title">Welcome to Our Store</div>
                    <div className="whatsio-store-hero-sub">
                      Discover our new arrivals and connect with us on WhatsApp anytime!
                    </div>
                    <span className="whatsio-store-hero-cta">Shop Collection</span>
                  </div>

                  {/* Mock Product Grid */}
                  <div className="whatsio-store-grid">
                    <div className="whatsio-store-item">
                      <div className="whatsio-store-item-line"></div>
                      <div className="whatsio-store-item-price"></div>
                    </div>
                    <div className="whatsio-store-item">
                      <div className="whatsio-store-item-line"></div>
                      <div className="whatsio-store-item-price"></div>
                    </div>
                  </div>

                  {/* Simulated WhatsApp Speech Bubble */}
                  {showBubble && previewMessage && (
                    <div className={`whatsio-preview-bubble ${previewPosition}`}>
                      <div className="whatsio-preview-bubble-header">
                        <span>💬</span> Chat with us
                      </div>
                      <div>{previewMessage}</div>
                      <div className="whatsio-preview-bubble-tail"></div>
                    </div>
                  )}

                  {/* Floating WhatsApp Action Button */}
                  <div
                    className={`whatsio-preview-btn ${previewPosition}`}
                    onClick={() => setShowBubble(!showBubble)}
                    title="Click to toggle chat message preview"
                  >
                    <svg width="26" height="26" viewBox="0 0 32 32" fill="currentColor">
                      <path d="M16.04 3C8.86 3 3.02 8.8 3.02 15.94c0 2.28.6 4.5 1.74 6.45L3 29l6.82-1.78a13.08 13.08 0 0 0 6.21 1.58h.01c7.18 0 13.02-5.8 13.02-12.94C29.06 8.8 23.22 3 16.04 3Zm0 23.62h-.01c-1.91 0-3.79-.51-5.43-1.47l-.39-.23-4.05 1.06 1.08-3.92-.25-.4a10.69 10.69 0 0 1-1.66-5.72c0-5.94 4.81-10.76 10.72-10.76 5.9 0 10.71 4.82 10.71 10.76 0 5.87-4.81 10.68-10.72 10.68Zm5.88-8.03c-.32-.16-1.91-.94-2.21-1.05-.3-.11-.51-.16-.73.16-.21.32-.83 1.05-1.02 1.26-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.59a9.67 9.67 0 0 1-1.79-2.22c-.19-.32-.02-.5.14-.66.15-.14.32-.37.49-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.74-1-2.39-.26-.63-.53-.54-.73-.55h-.62c-.22 0-.57.08-.86.4-.3.32-1.13 1.1-1.13 2.68 0 1.58 1.16 3.11 1.32 3.32.16.21 2.28 3.46 5.52 4.85.77.33 1.37.53 1.84.68.77.24 1.47.21 2.03.13.62-.09 1.91-.77 2.18-1.52.27-.74.27-1.37.19-1.5-.08-.14-.3-.22-.62-.38Z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, textAlign: "center" }}>
                <span style={{ fontSize: 11.5, color: "#6d7175" }}>
                  💡 Position: <strong>{previewPosition === "right" ? "Bottom Right" : "Bottom Left"}</strong> • Click button in preview to toggle message
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}
