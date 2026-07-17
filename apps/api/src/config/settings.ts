/**
 * Constantes métier par défaut — miroir de la table `app_settings`.
 * À terme, chargées depuis la BDD (avec cache) ; pour l'instant en dur.
 */
export const SETTINGS = {
  cancellationWindowMinutes: 120,
  paymentHoldMinutes: 10,
  defaultCommissionBps: 1500,
  co2ePerBagG: 2700,
  /** Nombre de no-shows avant désactivation du paiement cash pour un client. */
  cashNoShowStrikeLimit: 3,
} as const;
