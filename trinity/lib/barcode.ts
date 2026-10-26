// Code-barres GTIN (EAN-8, EAN-13…) : 14 chiffres au plus, ce qui reste dans les limites d'un BigInt en base
export function isBarcode(value: string) {
  return /^\d{1,14}$/.test(value);
}
