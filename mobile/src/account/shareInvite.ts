// Shares the invitation link: the system share sheet on the phone, the website's helper (share or copy) on the web app.
import { Platform, Share } from 'react-native'

import { shareInviteLink } from '@shared/utils/shareInvite'

// Resolves to 'shared' | 'copied' | 'cancelled' | 'failed'.
export async function shareInvite({ url, text }: { url: string; text: string }): Promise<string> {
  if (Platform.OS === 'web') return shareInviteLink({ url, text, title: 'GeoGame' })
  try {
    // Android only sends `message`, so the link goes in it too.
    const result = await Share.share({ message: `${text}\n${url}`, url })
    return result.action === Share.dismissedAction ? 'cancelled' : 'shared'
  } catch {
    return 'failed'
  }
}
