export function normalizeCountryCode(value) {
  const input = String(value || "").trim();

  if (!/^\+?\d{1,3}$/.test(input)) {
    return "";
  }

  const digits = input.replace(/\D/g, "");
  return /^[1-9]\d{0,2}$/.test(digits) ? digits : "";
}

export function normalizePhone(value, countryCode) {
  const input = String(value || "").trim();
  const callingCode = normalizeCountryCode(countryCode);

  if (!callingCode || !/^[+\d\s().-]+$/.test(input)) {
    return "";
  }

  const digits = input.replace(/\D/g, "");
  let internationalNumber = digits;

  if (!input.startsWith("+") && !digits.startsWith(callingCode)) {
    internationalNumber = `${callingCode}${digits.replace(/^0+/, "")}`;
  }

  return /^[1-9]\d{6,14}$/.test(internationalNumber) ? internationalNumber : "";
}
