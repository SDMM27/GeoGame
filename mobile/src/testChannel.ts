// The EAS Update channel of the running build (null outside a build with updates, e.g. Expo Go or a dev client).
import * as Updates from 'expo-updates'

export const updatesChannel: string | null = Updates.channel ?? null
