// Carte Trinity : règles du programme de fidélité, partagées entre serveur et client

export const POINTS_PER_EURO = 1;
export const POINTS_PER_VOUCHER = 100;
export const VOUCHER_VALUE = 5000; // 5 € en millièmes d'euro

// Points gagnés pour un montant payé (en millièmes d'euro) : 1 point par euro entier
export function pointsForAmount(amount: number) {
  return Math.floor((amount / 1000) * POINTS_PER_EURO);
}

// Nombre de bons de 5 € utilisables : limité par le solde et par le montant de la commande
export function maxVouchers(points: number, orderTotal: number) {
  return Math.max(0, Math.min(Math.floor(points / POINTS_PER_VOUCHER), Math.floor(orderTotal / VOUCHER_VALUE)));
}

// Numéro EAN-13 : préfixe 2 (usage interne, comme les cartes de fidélité), 11 chiffres, clé de contrôle
export function ean13CheckDigit(first12: string) {
  const sum = [...first12].reduce((acc, digit, index) => acc + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

export function generateCardNumber() {
  let digits = "299";
  while (digits.length < 12) digits += Math.floor(Math.random() * 10);
  return digits + ean13CheckDigit(digits);
}

export function formatCardNumber(number: string) {
  return `${number.slice(0, 1)} ${number.slice(1, 7)} ${number.slice(7)}`;
}

const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

// Motif des 95 modules d'un code-barres EAN-13 (« 1 » = barre noire)
export function ean13Pattern(number: string) {
  const digits = [...number].map(Number);
  const parity = PARITY[digits[0]];
  const left = digits
    .slice(1, 7)
    .map((digit, index) => (parity[index] === "L" ? L[digit] : G[digit]))
    .join("");
  const right = digits
    .slice(7)
    .map((digit) => R[digit])
    .join("");
  return `101${left}01010${right}101`;
}
