// Profile tab: sign in or create an account (shared with the website), then the account itself.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { router } from 'expo-router'
import { openBrowserAsync } from 'expo-web-browser'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, TextInput, View, type TextInputProps } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  accountErrorKey,
  chooseUsername,
  deleteAccount,
  resetPassword,
  signIn,
  signOut,
  signUp,
  USERNAME_MAX,
} from '@shared/utils/account'
import { useFriendships } from '@shared/hooks/usePlayerProfile'
import { LEGAL_PATHS } from '@shared/legal/legalInfo'

import { auth, useAccount, type Account } from '@/account/auth'
import { reauthenticateWithGoogle, signInWithGoogle } from '@/account/google'
import { API_ORIGIN, legalUrl } from '@/links'
import { Avatar, ProfileBody, SectionTitle } from '@/components/profile/ProfileSections'
import { Button, Pill, Segmented, Text, Touchable } from '@/components/ui'
import { forgetDevice, useDailyReminder, useWebPushPermission } from '@/notifications/push'
import { colors, fonts, radius, space } from '@/theme'

// This device stops receiving the account's invite notifications.
const signOutDevice = () => forgetDevice().then(() => signOut(auth))

type Mode = 'signin' | 'signup'

const openLegal = (path: string) => openBrowserAsync(legalUrl(path)).catch(() => {})

// Shown wherever an account gets created (email form, or username choice after a first Google sign-in).
function SignupNotice() {
  const link = (path: string) => <Text variant="caption" color={colors.accent} onPress={() => openLegal(path)} />
  return (
    <Text variant="caption">
      <Trans i18nKey="legal.signup_notice" components={{ terms: link(LEGAL_PATHS.terms), privacy: link(LEGAL_PATHS.privacy) }} />
    </Text>
  )
}

// Privacy policy, terms, legal notice and account deletion, on the website.
function LegalLinks() {
  const { t } = useTranslation()
  const pages = [
    [LEGAL_PATHS.privacy, 'legal.privacy'],
    [LEGAL_PATHS.terms, 'legal.terms'],
    [LEGAL_PATHS.legal, 'legal.legal'],
  ]
  return (
    <View style={styles.legalLinks}>
      {pages.map(([path, key]) => (
        <Touchable key={path} accessibilityRole="link" onPress={() => openLegal(path)} style={{ padding: space.xs }}>
          <Text variant="caption">{t(key)}</Text>
        </Touchable>
      ))}
    </View>
  )
}

function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{label}</Text>
      <TextInput placeholderTextColor={colors.textFaint} autoCorrect={false} style={styles.input} {...props} />
      {hint ? <Text variant="caption">{hint}</Text> : null}
    </View>
  )
}

function Message({ text, kind }: { text: string; kind: 'error' | 'notice' }) {
  const color = kind === 'error' ? colors.danger : colors.accent
  return (
    <View style={[styles.message, { backgroundColor: `${color}1F` }]}>
      <Text variant="caption" color={color}>
        {text}
      </Text>
    </View>
  )
}

// Only where Google sign-in is available (web and Android builds, see account/google.ts).
function GoogleButton({ onError }: { onError: (key: string | null) => void }) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  if (!signInWithGoogle) return null
  const signIn = signInWithGoogle

  const onPress = async () => {
    setPending(true)
    onError(null)
    try {
      await signIn(auth)
    } catch (err) {
      const key = accountErrorKey(err)
      if (key !== 'cancelled') onError(key)
      setPending(false)
    }
  }

  return (
    <>
      <Button
        label={t('account.google')}
        variant="secondary"
        onPress={onPress}
        loading={pending}
        icon={<MaterialCommunityIcons name="google" size={20} color={colors.text} />}
      />
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text variant="caption">{t('account.or')}</Text>
        <View style={styles.dividerLine} />
      </View>
    </>
  )
}

function AuthForm() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('signin')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  const onSubmit = async () => {
    setSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'signup') await signUp(auth, { email, password, username })
      else await signIn(auth, { email, password })
    } catch (err) {
      setError(accountErrorKey(err))
      setSubmitting(false)
    }
  }

  const onForgot = async () => {
    setError(null)
    setNotice(null)
    try {
      await resetPassword(auth, email)
      setNotice(t('account.reset_sent', { email: email.trim() }))
    } catch (err) {
      setError(accountErrorKey(err))
    }
  }

  const canSubmit = email.trim() !== '' && password !== '' && (mode === 'signin' || username.trim() !== '')

  return (
    <View style={styles.card}>
      <Segmented<Mode>
        value={mode}
        onChange={switchMode}
        options={[
          { value: 'signin', label: t('account.signin_tab') },
          { value: 'signup', label: t('account.signup_tab') },
        ]}
      />
      <Text variant="caption">{t(`account.${mode}_intro`)}</Text>

      <GoogleButton onError={setError} />

      {mode === 'signup' && (
        <Field
          label={t('account.username')}
          hint={t('account.username_hint')}
          value={username}
          onChangeText={setUsername}
          placeholder={t('account.username_placeholder')}
          maxLength={USERNAME_MAX}
          autoCapitalize="none"
          autoComplete="username-new"
          textContentType="nickname"
        />
      )}
      <Field
        label={t('account.email')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('account.email_placeholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <Field
        label={t('account.password')}
        value={password}
        onChangeText={setPassword}
        placeholder={mode === 'signup' ? t('account.password_placeholder') : undefined}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        textContentType={mode === 'signup' ? 'newPassword' : 'password'}
        returnKeyType="go"
        onSubmitEditing={() => canSubmit && onSubmit()}
      />

      {error && <Message kind="error" text={t(`account.errors.${error}`)} />}
      {notice && <Message kind="notice" text={notice} />}
      {mode === 'signup' && <SignupNotice />}

      <Button
        label={t(mode === 'signup' ? 'account.signup' : 'account.signin')}
        onPress={onSubmit}
        loading={submitting}
        disabled={!canSubmit}
      />
      {mode === 'signin' && (
        <Touchable accessibilityRole="button" onPress={onForgot} style={styles.link}>
          <Text variant="bodyStrong" color={colors.accent} style={{ fontSize: 14 }}>
            {t('account.forgot')}
          </Text>
        </Touchable>
      )}
    </View>
  )
}

// Google's name, trimmed to what a username allows, as a starting suggestion.
const suggestUsername = () =>
  (auth.currentUser?.displayName ?? '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, USERNAME_MAX)

function ChooseUsername() {
  const { t } = useTranslation()
  const [username, setUsername] = useState(suggestUsername)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await chooseUsername(auth, username)
    } catch (err) {
      setError(accountErrorKey(err))
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.card}>
      <Text variant="heading">{t('account.choose_title')}</Text>
      <Text variant="caption">{t('account.choose_intro')}</Text>
      <Field
        label={t('account.username')}
        hint={t('account.username_hint')}
        value={username}
        onChangeText={setUsername}
        placeholder={t('account.username_placeholder')}
        maxLength={USERNAME_MAX}
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={() => username.trim() && onSubmit()}
      />
      {error && <Message kind="error" text={t(`account.errors.${error}`)} />}
      <SignupNotice />
      <Button label={t('account.choose_submit')} onPress={onSubmit} loading={submitting} disabled={!username.trim()} />
      <Touchable accessibilityRole="button" onPress={signOutDevice} style={styles.link}>
        <Text variant="bodyStrong" color={colors.textMuted} style={{ fontSize: 14 }}>
          {t('account.signout')}
        </Text>
      </Touchable>
    </View>
  )
}

function AccountSettings({ account }: { account: Account }) {
  const { t } = useTranslation()
  const [deleting, setDeleting] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onDelete = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await forgetDevice()
      const proof = account.hasPassword ? { password } : { reauthenticate: reauthenticateWithGoogle }
      await deleteAccount(auth, { ...proof, apiOrigin: API_ORIGIN })
    } catch (err) {
      const key = accountErrorKey(err)
      if (key !== 'cancelled') setError(key)
      setSubmitting(false)
    }
  }

  return (
    <View style={{ gap: space.md }}>
      <SectionTitle title={t('profile.settings_title')} />
      <View style={styles.card}>
        <View style={{ gap: 2 }}>
          <Text variant="label">{t('account.signed_in_as')}</Text>
          <Text variant="bodyStrong">{account.email}</Text>
        </View>
        <Text variant="caption">{t('account.prefill_hint')}</Text>
        <Button
          label={t('account.signout')}
          variant="secondary"
          onPress={signOutDevice}
          icon={<MaterialCommunityIcons name="logout" size={20} color={colors.text} />}
        />
      </View>

      <NotificationsCard uid={account.uid} />

      {deleting ? (
        <View style={styles.card}>
          <Text variant="caption">{t(account.hasPassword ? 'account.delete_confirm' : 'account.delete_confirm_google')}</Text>
          {account.hasPassword && (
            <Field
              label={t('account.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
            />
          )}
          {error && <Message kind="error" text={t(`account.errors.${error}`)} />}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label={t('account.cancel')} variant="ghost" onPress={() => setDeleting(false)} style={{ flex: 1 }} />
            <Button
              label={t('account.delete_button')}
              variant="danger"
              onPress={onDelete}
              loading={submitting}
              disabled={account.hasPassword && !password}
              style={{ flex: 1, paddingHorizontal: space.md }}
            />
          </View>
        </View>
      ) : (
        <Touchable accessibilityRole="button" onPress={() => setDeleting(true)} style={styles.link}>
          <Text variant="bodyStrong" color={colors.danger} style={{ fontSize: 14 }}>
            {t('account.delete')}
          </Text>
        </Touchable>
      )}
    </View>
  )
}

// Notifications of this device. The web app turns them on here, since Safari asks for the permission only from a tap;
// the daily challenge reminder can be turned off once they're on (the app asks for the permission by itself).
function NotificationsCard({ uid }: { uid: string }) {
  const { t } = useTranslation()
  const { state, enable } = useWebPushPermission(uid)
  const daily = useDailyReminder()
  const [enabling, setEnabling] = useState(false)
  const web = state !== 'unsupported'
  if (!web && daily.enabled === null) return null
  return (
    <View style={styles.card}>
      <Text variant="bodyStrong">{t('mobile.invites.push_title')}</Text>
      {web && <Text variant="caption">{t(`mobile.invites.push_${state}`)}</Text>}
      {state === 'default' && (
        <Button
          label={t('mobile.invites.push_enable')}
          variant="secondary"
          loading={enabling}
          onPress={() => {
            setEnabling(true)
            enable().finally(() => setEnabling(false))
          }}
          icon={<MaterialCommunityIcons name="bell-ring-outline" size={20} color={colors.text} />}
        />
      )}
      {daily.enabled !== null && (
        <View style={styles.switchRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="body">{t('mobile.invites.daily_reminder')}</Text>
            <Text variant="caption">{t('mobile.invites.daily_reminder_hint')}</Text>
          </View>
          <Switch
            value={daily.enabled}
            onValueChange={daily.setEnabled}
            trackColor={{ false: colors.surfaceHigh, true: colors.accent }}
            accessibilityLabel={t('mobile.invites.daily_reminder')}
          />
        </View>
      )}
    </View>
  )
}

function FriendsCard({ count, pending }: { count: number; pending: number }) {
  const { t } = useTranslation()
  return (
    <Touchable accessibilityRole="button" onPress={() => router.push('/friends')} style={[styles.card, styles.friendsCard]}>
      <View style={styles.friendsIcon}>
        <MaterialCommunityIcons name="account-multiple-outline" size={24} color={colors.highlight} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{t('friends.title')}</Text>
        <Text variant="caption">{count > 0 ? t('friends.count', { count }) : t('friends.add_title')}</Text>
      </View>
      {pending > 0 && <Pill label={t('friends.pending_badge', { count: pending })} color={colors.onAccent} background={colors.accent} />}
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textFaint} />
    </Touchable>
  )
}

function Profile({ account }: { account: Account }) {
  const { t, i18n } = useTranslation()
  const friendships = useFriendships(account.uid)
  const username = account.username ?? '?'

  return (
    <View style={{ gap: space.xl }}>
      <View style={styles.header}>
        <Avatar username={username} size={72} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" numberOfLines={1} adjustsFontSizeToFit>
            {username}
          </Text>
          {account.createdAt && (
            <Text variant="caption">
              {t('profile.member_since', { date: new Date(account.createdAt).toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' }) })}
            </Text>
          )}
        </View>
      </View>
      <FriendsCard count={friendships.friends.length} pending={friendships.incoming.length} />
      <ProfileBody
        uid={account.uid}
        friendsCount={friendships.loading ? undefined : friendships.friends.length}
        onSeeHistory={() => router.push({ pathname: '/history', params: { uid: account.uid } })}
      />
      <AccountSettings account={account} />
    </View>
  )
}

export default function ProfileScreen() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { loading, account } = useAccount()
  const signedIn = !!account && !account.needsUsername

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + space.lg, paddingHorizontal: space.lg, paddingBottom: space.xxl * 2, gap: space.xl }}>
        {!signedIn && !loading && (
          <View style={{ gap: space.xs }}>
            <Text variant="title">{t('profile.sign_in_title')}</Text>
            <Text variant="caption">{t('profile.sign_in_pitch')}</Text>
          </View>
        )}
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />
        ) : (
          <Animated.View key={!account ? 'form' : account.needsUsername ? 'choose' : 'profile'} entering={FadeIn.duration(200)}>
            {!account ? <AuthForm /> : account.needsUsername ? <ChooseUsername /> : <Profile account={account} />}
          </Animated.View>
        )}
        {!loading && <LegalLinks />}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  card: { gap: space.lg, padding: space.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  input: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
  },
  message: { borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: space.sm },
  link: { alignSelf: 'center', paddingVertical: space.sm, paddingHorizontal: space.md },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  friendsCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md },
  friendsIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: `${colors.highlight}1F`, alignItems: 'center', justifyContent: 'center' },
})
