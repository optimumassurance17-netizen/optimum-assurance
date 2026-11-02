type LoginAlertUser = {
  id?: string | null
  email?: string | null
  name?: string | null
}

/**
 * Alerte automatique désactivée.
 * Une connexion à l'espace client ne prévient plus info@.
 */
export async function notifyClientSpaceLogin(user: LoginAlertUser): Promise<boolean> {
  void user
  return false
}
