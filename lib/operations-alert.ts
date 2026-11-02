type OperationsAlertParams = {
  subject: string
  lines: string[]
}

/**
 * Alerte automatique désactivée.
 * Les crons n'envoient plus de mail interne. Les relances envoyées aux clients restent en place.
 */
export async function sendOperationsAlert(params: OperationsAlertParams): Promise<boolean> {
  void params
  return false
}
