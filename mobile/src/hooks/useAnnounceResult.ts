// Speaks the result of a round or game once, when it turns complete (not when a finished one is reopened).
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { announce } from '@/a11y'

export function useAnnounceResult(isComplete: boolean, isSolved: boolean, answer: string) {
  const { t } = useTranslation()
  const wasComplete = useRef(isComplete)
  useEffect(() => {
    if (isComplete && !wasComplete.current) announce(isSolved ? t('mobile.a11y.correct') : t('mobile.a11y.wrong_answer', { answer }))
    wasComplete.current = isComplete
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete])
}
