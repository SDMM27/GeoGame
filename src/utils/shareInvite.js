// Shares the invitation link with the system share sheet, or copies it where there is none.
// Resolves to 'shared' | 'copied' | 'cancelled' | 'failed'.
export async function shareInviteLink({ url, text, title }) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled'
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
