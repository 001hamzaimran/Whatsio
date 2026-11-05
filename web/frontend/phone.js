export function formatWhatsAppPhone(value, countryCode) {
  const input = String(value || "").trim();
  const callingCode = String(countryCode || "").replace(/\D/g, "");
  const digits = input.replace(/\D/g, "");

  if (!callingCode || !digits) {
    return "";
  }

  if (input.startsWith("+") || digits.startsWith(callingCode)) {
    return digits;
  }

  return `${callingCode}${digits.replace(/^0+/, "")}`;
}
