// Questions écrites pour les tests des hooks du quiz (même forme que les questions « curated »).
export function makeQuestion(id, { difficulty = 'Moyen', answer = 'Paris', wrong = ['Lyon', 'Marseille', 'Nice'] } = {}) {
  const correct = { id: 'answer', kind: 'text', value: { fr: answer } }
  const wrongChoices = wrong.map((w, i) => ({ id: `wrong${i}`, kind: 'text', value: { fr: w } }))
  return {
    type: 'curated',
    key: `curated:${id}`,
    usedKeys: [`curated:${id}`],
    difficulty,
    params: {},
    choices: [correct, ...wrongChoices],
    correctId: 'answer',
    accepted: [correct],
    accept: [],
    text: { fr: `Question ${id}` },
  }
}
