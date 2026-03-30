/** URL publique du site (sans slash final). Liens absolus pour PDF et documents. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.BASE_URL ||
  "https://optimum-assurance.fr"
).replace(/\/$/, "")
