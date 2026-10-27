// Retrait au drive : le client signale son arrivée et la place où il s'est garé, l'équipe lui apporte
// ses courses. Partagé par la page de commande, la page d'arrivée et le back-office.

// Places numérotées du parking drive de chaque magasin
export const DRIVE_SPOTS = 12;

export function isDriveSpot(spot: number) {
  return Number.isInteger(spot) && spot >= 1 && spot <= DRIVE_SPOTS;
}

// Le client peut signaler son arrivée une fois ses courses prêtes, pour un retrait au drive
export function canCheckIn(order: { status: string; shippingAddressId: string | null }) {
  return order.status === "ready" && !order.shippingAddressId;
}
