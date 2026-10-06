// Mobile stand-in for react-router-dom, used by the shared game hooks in ../src.
// Only the navigation surface the hooks need is implemented, backed by expo-router.
import { router, useGlobalSearchParams, useLocalSearchParams, usePathname } from 'expo-router'

type NavigateTarget = string | number

export function navigate(to: NavigateTarget) {
  if (typeof to === 'number') {
    if (router.canGoBack()) router.back()
    return
  }
  if (to === '/') {
    if (router.canDismiss()) router.dismissAll()
    else router.replace('/')
    return
  }
  router.push(to as never)
}

export function useNavigate() {
  return navigate
}

export function useLocation() {
  const pathname = usePathname()
  const params = useGlobalSearchParams()
  const search = new URLSearchParams(params as Record<string, string>).toString()
  return { pathname, search: search ? `?${search}` : '', state: null, hash: '' }
}

export function useParams() {
  return useLocalSearchParams()
}

export function useSearchParams() {
  const params = useGlobalSearchParams()
  const searchParams = new URLSearchParams(params as Record<string, string>)
  const setSearchParams = (next: Record<string, string>) => router.setParams(next)
  return [searchParams, setSearchParams] as const
}
