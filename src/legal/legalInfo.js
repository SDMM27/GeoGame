// Who publishes GeoGame and how to reach them: used by the legal pages (src/legal/documents.js, LegalPage).
// TO FILL IN before publishing: `editor` and `email` are required by law (LCEN in France, GDPR) and by the stores.
// A private individual may keep their name off the site (LCEN art. 6-III-2) by writing "Particulier" as the editor,
// provided the host (Vercel) has their identity: then `editor` stays generic, but `email` must still work.
export const LEGAL_INFO = {
  editor: 'À COMPLÉTER : DON Sacha',
  email: 'donsacha27@gmail.com',
  // Date of the last change to the texts in documents.js (YYYY-MM-DD).
  updated: '2026-10-12',
}

// Paths of the legal pages, shared by the site's routes and the app's links (mobile/src/links.ts).
export const LEGAL_PATHS = {
  privacy: '/privacy',
  terms: '/terms',
  legal: '/legal',
  deleteAccount: '/delete-account',
}
