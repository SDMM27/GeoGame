// The community directory became the weekly league: old links and installed web builds land there.
import { Redirect } from 'expo-router'

export default function CommunityScreen() {
  return <Redirect href="/league" />
}
