// Legal pages in Brazilian Portuguese (see ../documents.js for the format and when to update them).
export default {
  privacy: {
    title: 'Política de privacidade',
    intro: [
      'O GeoGame é um jogo de geografia gratuito, no site {site} e no app GeoGame. Esta página explica quais dados tratamos, por quê, por quanto tempo e como exercer seus direitos.',
      'Coletamos o mínimo de dados possível: sem publicidade, sem venda de dados, sem criação de perfis.',
    ],
    sections: [
      {
        id: 'controller',
        title: 'Controlador dos dados',
        blocks: ['{editor}, que pode ser contatado pelo e-mail {email}.'],
      },
      {
        id: 'data',
        title: 'Os dados que tratamos',
        blocks: [
          'Sem conta, você pode jogar livremente. Nesse caso, só recebemos o que você decide publicar: o nome e a pontuação que você salva em um ranking, o nome usado em uma sala multijogador e as denúncias que você faz (com um identificador aleatório criado no seu aparelho).',
          'Com uma conta, tratamos também:',
          {
            list: [
              'seu endereço de e-mail e sua senha, que o Firebase Authentication guarda criptografada: nunca temos acesso a ela. Se você entrar com o Google, recebemos o endereço de e-mail e o identificador da sua conta Google (o Google também pode enviar seu nome e sua foto de perfil, que não usamos);',
              'seu nome de usuário, a data de criação da conta e as datas de login;',
              'o histórico das suas partidas (jogo, modo, pontuação, tempo, data) e suas pontuações nos rankings, incluindo as respostas tentadas nos desafios do dia;',
              'seus pedidos de amizade, seus amigos e os convites para salas que você envia ou recebe;',
              'se você permitir notificações, no app ou no web app adicionado à tela inicial: um identificador de notificações do aparelho (token Expo ou assinatura Web Push), seu idioma, seu tipo de aparelho e sua escolha para o lembrete diário.',
            ],
          },
          'Para todos, nossos provedores de hospedagem também tratam o endereço IP e as informações técnicas de cada solicitação (navegador, aparelho) para fazer o serviço funcionar e protegê-lo. No site, o Vercel Web Analytics mede a audiência sem cookies e só fornece estatísticas agregadas de visitas, e o Firebase App Check usa o Google reCAPTCHA Enterprise, que analisa sinais do navegador para verificar se as solicitações vêm mesmo do jogo.',
        ],
      },
      {
        id: 'public',
        title: 'O que é público',
        blocks: [
          'Seu nome de usuário, suas pontuações nos rankings e sua página de perfil (data de cadastro, estatísticas, histórico de partidas) são visíveis para todos. Seu e-mail, seus amigos e seus convites nunca são públicos. Se preferir ficar anônimo, escolha um nome de usuário que não revele quem você é.',
        ],
      },
      {
        id: 'purposes',
        title: 'Por quê, e com qual base legal',
        blocks: [
          {
            list: [
              'Fazer funcionar o jogo, sua conta, os rankings, seu histórico, os amigos e o multijogador: execução dos [termos de uso](/terms) que você aceita ao usar o GeoGame (artigo 6(1)(b) do RGPD).',
              'Enviar notificações (convites para salas, pedidos de amizade, lembrete do desafio do dia): seu consentimento, dado ao permitir as notificações e que você pode retirar a qualquer momento nas configurações do aparelho. O lembrete diário também pode ser desativado no seu perfil.',
              'Proteger o serviço contra trapaças e abusos (App Check, denúncias, filtro de nomes) e medir a audiência de forma anônima: nosso legítimo interesse em oferecer um jogo confiável e melhorá-lo (artigo 6(1)(f) do RGPD).',
            ],
          },
          'Não fazemos publicidade, criação de perfis nem decisões automatizadas sobre você, e não vendemos nenhum dado.',
        ],
      },
      {
        id: 'recipients',
        title: 'Destinatários e provedores',
        blocks: [
          'Seus dados só são acessíveis ao editor e aos seguintes provedores técnicos, que os tratam em nosso nome:',
          {
            list: [
              'Google (Firebase Authentication, Cloud Firestore, App Check, reCAPTCHA Enterprise): contas, banco de dados e proteção contra abusos;',
              'Vercel Inc.: hospedagem do site e das funções de servidor, medição de audiência;',
              'Expo (650 Industries, Inc.): envio de notificações e atualizações do app;',
              'serviços push dos navegadores (Apple, Google, Mozilla ou Microsoft, conforme o aparelho): envio das notificações do web app;',
              'Flagpedia (flagcdn.com): algumas imagens de bandeiras do site.',
            ],
          },
          'Alguns desses provedores ficam fora da União Europeia, especialmente nos Estados Unidos. Essas transferências são cobertas pelo Quadro de Privacidade de Dados UE-EUA ou pelas cláusulas contratuais padrão da Comissão Europeia.',
        ],
      },
      {
        id: 'retention',
        title: 'Por quanto tempo guardamos os dados',
        blocks: [
          {
            list: [
              'Conta e dados associados: enquanto a conta existir. Uma conta sem uso por 3 anos (sem login nem partidas) é excluída automaticamente com todos os seus dados.',
              'Pontuações salvas sem conta: enquanto o ranking existir. Você pode pedir a exclusão.',
              'Salas multijogador: excluídas automaticamente quando expiram, no máximo 10 dias após a criação. Convites: um dia no máximo.',
              'Tokens de notificação: até o aparelho sair da conta, a conta ser excluída ou o aparelho não poder mais recebê-las.',
              'Denúncias: o tempo necessário para tratá-las.',
              'Registros técnicos dos provedores de hospedagem: um período limitado definido pelo provedor, geralmente alguns dias.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        title: 'Cookies e armazenamento no seu aparelho',
        blocks: [
          'O GeoGame não usa cookies de publicidade nem de medição de audiência. O jogo guarda no seu aparelho o que precisa para funcionar: sua sessão, seu nome, seu idioma, as salas recentes, seu progresso nos desafios do dia e um identificador aleatório de visitante para as denúncias. O reCAPTCHA pode instalar um cookie técnico necessário para a proteção contra abusos.',
          'Esses itens são estritamente necessários ao serviço e, por isso, não exigem consentimento. Você pode apagá-los a qualquer momento nas configurações do navegador ou desinstalando o app.',
        ],
      },
      {
        id: 'rights',
        title: 'Seus direitos',
        blocks: [
          'Você tem direito de acessar, corrigir e apagar seus dados, de limitar ou se opor ao tratamento deles e à portabilidade dos dados.',
          'Você mesmo pode excluir sua conta e todos os seus dados a qualquer momento: veja [Excluir minha conta](/delete-account). Para qualquer outro pedido (uma cópia dos seus dados, uma mudança de nome de usuário, a exclusão de uma pontuação salva sem conta…), escreva para {email}. Respondemos em até um mês.',
          'Se você achar que seus direitos não estão sendo respeitados, pode apresentar uma reclamação à autoridade de proteção de dados, na França a CNIL ([cnil.fr](https://www.cnil.fr)).',
        ],
      },
      {
        id: 'minors',
        title: 'Menores de idade',
        blocks: [
          'Qualquer pessoa pode jogar GeoGame sem conta. A criação de conta é reservada a pessoas com 13 anos ou mais e, entre 13 e 15 anos, a quem tiver a autorização de um responsável. Um responsável que descobrir que uma criança criou uma conta sem autorização pode nos escrever para que ela seja excluída.',
        ],
      },
      {
        id: 'security',
        title: 'Segurança',
        blocks: [
          'Todas as comunicações são criptografadas (HTTPS). O acesso ao banco de dados é controlado por regras de segurança: cada pessoa só pode ler o que é público ou o que diz respeito a ela, e só pode alterar os próprios dados.',
        ],
      },
      {
        id: 'changes',
        title: 'Alterações',
        blocks: [
          'Podemos atualizar esta política; a data no topo da página indica a versão mais recente. Se algo importante mudar, vamos avisar no jogo.',
        ],
      },
    ],
  },

  terms: {
    title: 'Termos de uso',
    intro: [
      'Estes termos regem o uso do GeoGame, no site {site} e no app. Ao usar o GeoGame, você os aceita.',
    ],
    sections: [
      {
        id: 'access',
        title: 'Acesso ao jogo',
        blocks: [
          'O GeoGame é gratuito e pode ser jogado sem conta. Uma conta também permite reservar um nome de usuário, guardar um histórico, adicionar amigos e receber convites. O acesso à internet fica por sua conta.',
          'O jogo é oferecido no estado em que se encontra. Podemos alterá-lo, adicionar ou remover jogos ou interrompê-lo, especialmente para manutenção, sem aviso prévio.',
        ],
      },
      {
        id: 'account',
        title: 'Conta',
        blocks: [
          'A criação de conta é reservada a pessoas com 13 anos ou mais e, entre 13 e 15 anos, a quem tiver a autorização de um responsável. Você se compromete a informar um e-mail válido e a manter sua senha em sigilo. Você pode excluir sua conta a qualquer momento ([Excluir minha conta](/delete-account)).',
        ],
      },
      {
        id: 'conduct',
        title: 'Regras de conduta',
        blocks: [
          'Ao usar o GeoGame, você se compromete a não:',
          {
            list: [
              'escolher um nome de usuário ofensivo, de ódio, discriminatório ou sexual, que se passe por outra pessoa ou que revele informações pessoais de alguém;',
              'trapacear: alterar ou falsificar pontuações, automatizar partidas, explorar um bug;',
              'perturbar o serviço ou tentar acessar dados que não dizem respeito a você;',
              'assediar outros jogadores, por exemplo com convites ou pedidos de amizade repetidos.',
            ],
          },
        ],
      },
      {
        id: 'moderation',
        title: 'Moderação',
        blocks: [
          'Qualquer pessoa pode denunciar uma pontuação ou um nome de usuário com a bandeira exibida nos rankings. Podemos excluir uma pontuação, um nome de usuário ou uma conta que desrespeite estas regras, sem aviso prévio nos casos evidentes.',
        ],
      },
      {
        id: 'ip',
        title: 'Propriedade intelectual',
        blocks: [
          'O nome, o código, o design e os textos do GeoGame pertencem ao editor. É proibido reproduzi-los sem autorização. Os créditos dos conteúdos de terceiros (mapas, fontes) estão nas [informações legais](/legal).',
        ],
      },
      {
        id: 'liability',
        title: 'Responsabilidade',
        blocks: [
          'As informações geográficas do jogo (fronteiras, nomes, capitais, números) são fornecidas para jogar e podem conter erros ou simplificações. Elas não expressam nenhuma posição política.',
          'Na medida permitida pela lei, o editor não se responsabiliza por interrupções do serviço nem pela perda de pontuações ou dados de jogo.',
        ],
      },
      {
        id: 'privacy',
        title: 'Dados pessoais',
        blocks: ['O tratamento dos seus dados está descrito na [política de privacidade](/privacy).'],
      },
      {
        id: 'changes',
        title: 'Alterações e lei aplicável',
        blocks: [
          'Podemos alterar estes termos; a data no topo da página indica a versão mais recente. Continuar usando o GeoGame após uma alteração significa que você a aceita.',
          'Estes termos são regidos pela lei francesa. Em caso de desacordo, escreva primeiro para {email} para buscarmos uma solução amigável.',
        ],
      },
    ],
  },

  legal: {
    title: 'Informações legais',
    intro: [],
    sections: [
      {
        id: 'editor',
        title: 'Editor',
        blocks: ['O GeoGame é editado por {editor}.', 'Contato: {email}', 'Diretor de publicação: {editor}.'],
      },
      {
        id: 'hosting',
        title: 'Hospedagem',
        blocks: [
          {
            list: [
              'Site e funções de servidor: Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, Estados Unidos ([vercel.com](https://vercel.com)).',
              'Contas e banco de dados: Google Firebase, Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irlanda ([firebase.google.com](https://firebase.google.com)).',
            ],
          },
        ],
      },
      {
        id: 'credits',
        title: 'Créditos',
        blocks: [
          {
            list: [
              'Bandeiras: [Flagpedia](https://flagpedia.net).',
              'Fonte Inter: Rasmus Andersson, sob a licença SIL Open Font License.',
              'Contornos detalhados dos pequenos territórios: [geoBoundaries](https://www.geoboundaries.org) (CC BY) e © colaboradores do [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL).',
            ],
          },
        ],
      },
      {
        id: 'report',
        title: 'Denunciar um conteúdo',
        blocks: [
          'Para denunciar um conteúdo ilícito, como um nome de usuário ofensivo, use a bandeira de denúncia dos rankings ou escreva para {email}.',
        ],
      },
      {
        id: 'links',
        title: 'Veja também',
        blocks: ['[Política de privacidade](/privacy) · [Termos de uso](/terms)'],
      },
    ],
  },

  deleteAccount: {
    title: 'Excluir sua conta',
    intro: ['Você pode excluir sua conta do GeoGame a qualquer momento, gratuitamente. A exclusão é imediata e definitiva.'],
    sections: [
      {
        id: 'app',
        title: 'Pelo app',
        blocks: ['Abra a aba Perfil, toque em “Excluir minha conta” na parte de baixo da tela e confirme com sua senha ou com o Google.'],
      },
      {
        id: 'site',
        title: 'Pelo site',
        blocks: ['Entre na página [Minha conta](/account), clique em “Excluir minha conta” e confirme.'],
      },
      {
        id: 'email',
        title: 'Se você não consegue mais entrar',
        blocks: [
          'Escreva para {email} a partir do e-mail da sua conta, informando seu nome de usuário. Excluímos a conta em até 30 dias e confirmamos para você.',
        ],
      },
      {
        id: 'deleted',
        title: 'O que é excluído',
        blocks: [
          {
            list: [
              'sua conta e seu endereço de e-mail;',
              'seu nome de usuário, que volta a ficar disponível;',
              'seu histórico de partidas e suas estatísticas;',
              'suas pontuações em todos os rankings;',
              'seus amigos e seus convites;',
              'os aparelhos cadastrados para as notificações;',
              'as denúncias que você fez e as que envolvem suas pontuações.',
            ],
          },
        ],
      },
      {
        id: 'kept',
        title: 'O que pode permanecer',
        blocks: [
          {
            list: [
              'seu nome em uma sala multijogador, até a sala expirar (10 dias no máximo);',
              'as pontuações salvas sem login, que não estão ligadas à sua conta: peça a exclusão por e-mail;',
              'os registros técnicos dos provedores de hospedagem, apagados depois de alguns dias.',
            ],
          },
        ],
      },
    ],
  },
}
