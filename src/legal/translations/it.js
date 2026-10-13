// Legal pages in Italian (see ../documents.js for the format and when to update them).
export default {
  privacy: {
    title: 'Informativa sulla privacy',
    intro: [
      "GeoGame è un gioco di geografia gratuito, sul sito {site} e nell'app GeoGame. Questa pagina spiega quali dati trattiamo, perché, per quanto tempo e come esercitare i tuoi diritti.",
      'Raccogliamo meno dati possibile: niente pubblicità, niente vendita di dati, niente profilazione.',
    ],
    sections: [
      {
        id: 'controller',
        title: 'Titolare del trattamento',
        blocks: ["{editor}, contattabile all'indirizzo {email}."],
      },
      {
        id: 'data',
        title: 'I dati che trattiamo',
        blocks: [
          'Senza account puoi giocare liberamente. In questo caso riceviamo solo ciò che scegli di pubblicare: il nome e il punteggio che salvi in una classifica, il nome che usi in una stanza multigiocatore e le segnalazioni che fai (con un identificatore casuale creato sul tuo dispositivo).',
          'Con un account trattiamo inoltre:',
          {
            list: [
              'il tuo indirizzo email e la tua password, che Firebase Authentication conserva cifrata: non vi abbiamo mai accesso. Se accedi con Google, riceviamo l\'indirizzo email e l\'identificatore del tuo account Google (Google può anche trasmettere il tuo nome e la tua foto profilo, che non usiamo);',
              "il tuo nome utente, la data di creazione dell'account e le date di accesso;",
              'la cronologia delle tue partite (gioco, modalità, punteggio, tempo, data) e i tuoi punteggi nelle classifiche, comprese le risposte provate nelle sfide del giorno;',
              'le tue richieste di amicizia, i tuoi amici e gli inviti alle stanze che invii o ricevi;',
              "se consenti le notifiche, nell'app o nella web app aggiunta alla schermata Home: un identificatore di notifica del dispositivo (token Expo o iscrizione Web Push), la tua lingua, il tipo di dispositivo e la tua scelta per il promemoria giornaliero.",
            ],
          },
          "Per tutti, i nostri fornitori di hosting trattano anche l'indirizzo IP e le informazioni tecniche di ogni richiesta (browser, dispositivo) per far funzionare e proteggere il servizio. Sul sito, Vercel Web Analytics misura il pubblico senza cookie e fornisce solo statistiche aggregate sulle visite, e Firebase App Check usa Google reCAPTCHA Enterprise, che analizza segnali del browser per verificare che le richieste provengano davvero dal gioco.",
        ],
      },
      {
        id: 'public',
        title: 'Cosa è pubblico',
        blocks: [
          "Il tuo nome utente, i tuoi punteggi in classifica e la tua pagina profilo (data di iscrizione, statistiche, cronologia delle partite) sono visibili a tutti. Il tuo indirizzo email, i tuoi amici e i tuoi inviti non sono mai pubblici. Se preferisci restare anonimo, scegli un nome utente che non riveli chi sei.",
        ],
      },
      {
        id: 'purposes',
        title: 'Perché e su quale base giuridica',
        blocks: [
          {
            list: [
              "Far funzionare il gioco, il tuo account, le classifiche, la cronologia, gli amici e il multigiocatore: esecuzione delle [condizioni d'uso](/terms) che accetti usando GeoGame (articolo 6, paragrafo 1, lettera b del GDPR).",
              'Inviare notifiche (inviti alle stanze, richieste di amicizia, promemoria della sfida del giorno): il tuo consenso, dato consentendo le notifiche e revocabile in qualsiasi momento nelle impostazioni del dispositivo. Il promemoria giornaliero si può disattivare anche dal tuo profilo.',
              'Proteggere il servizio da imbrogli e abusi (App Check, segnalazioni, filtro dei nomi) e misurare il pubblico in forma anonima: il nostro legittimo interesse a offrire un gioco affidabile e a migliorarlo (articolo 6, paragrafo 1, lettera f del GDPR).',
            ],
          },
          'Non facciamo pubblicità, profilazione né decisioni automatizzate che ti riguardano, e non vendiamo alcun dato.',
        ],
      },
      {
        id: 'recipients',
        title: 'Destinatari e fornitori',
        blocks: [
          "I tuoi dati sono accessibili solo all'editore e ai seguenti fornitori tecnici, che li trattano per nostro conto:",
          {
            list: [
              'Google (Firebase Authentication, Cloud Firestore, App Check, reCAPTCHA Enterprise): account, database e protezione dagli abusi;',
              'Vercel Inc.: hosting del sito e delle funzioni server, misurazione del pubblico;',
              "Expo (650 Industries, Inc.): invio delle notifiche e degli aggiornamenti dell'app;",
              'servizi push dei browser (Apple, Google, Mozilla o Microsoft a seconda del dispositivo): invio delle notifiche della web app;',
              'Flagpedia (flagcdn.com): alcune immagini delle bandiere del sito.',
            ],
          },
          "Alcuni di questi fornitori si trovano al di fuori dell'Unione europea, in particolare negli Stati Uniti. Questi trasferimenti sono coperti dal Quadro UE-USA per la protezione dei dati personali o dalle clausole contrattuali tipo della Commissione europea.",
        ],
      },
      {
        id: 'retention',
        title: 'Per quanto tempo conserviamo i dati',
        blocks: [
          {
            list: [
              "Account e dati collegati: finché l'account esiste. Un account inutilizzato per 3 anni (nessun accesso, nessuna partita) viene eliminato automaticamente con tutti i suoi dati.",
              'Punteggi salvati senza account: finché esiste la classifica. Puoi chiederne la cancellazione.',
              'Stanze multigiocatore: eliminate automaticamente alla scadenza, al massimo 10 giorni dopo la creazione. Inviti: al massimo un giorno.',
              "Token di notifica: finché il dispositivo non esce dall'account, l'account non viene eliminato o il dispositivo non può più riceverle.",
              'Segnalazioni: il tempo necessario per gestirle.',
              'Log tecnici dei fornitori di hosting: un periodo limitato stabilito dal fornitore, di solito qualche giorno.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        title: 'Cookie e archiviazione sul tuo dispositivo',
        blocks: [
          'GeoGame non usa cookie pubblicitari né di misurazione del pubblico. Il gioco salva sul tuo dispositivo ciò che gli serve per funzionare: la tua sessione, il tuo nome, la tua lingua, le stanze recenti, i tuoi progressi nelle sfide del giorno e un identificatore casuale del visitatore per le segnalazioni. reCAPTCHA può impostare un cookie tecnico necessario alla protezione dagli abusi.',
          "Questi elementi sono strettamente necessari al servizio e quindi non richiedono consenso. Puoi cancellarli in qualsiasi momento dalle impostazioni del browser o disinstallando l'app.",
        ],
      },
      {
        id: 'rights',
        title: 'I tuoi diritti',
        blocks: [
          'Hai il diritto di accedere ai tuoi dati, rettificarli e cancellarli, di limitarne il trattamento o di opporti, e alla portabilità dei dati.',
          "Puoi eliminare tu stesso il tuo account e tutti i suoi dati in qualsiasi momento: vedi [Elimina il mio account](/delete-account). Per qualsiasi altra richiesta (una copia dei tuoi dati, un cambio di nome utente, la cancellazione di un punteggio salvato senza account…), scrivi a {email}. Rispondiamo entro un mese.",
          "Se ritieni che i tuoi diritti non siano rispettati, puoi presentare un reclamo all'autorità per la protezione dei dati, in Francia la CNIL ([cnil.fr](https://www.cnil.fr)).",
        ],
      },
      {
        id: 'minors',
        title: 'Minori',
        blocks: [
          "Chiunque può giocare a GeoGame senza account. La creazione di un account è riservata a chi ha almeno 13 anni e, tra i 13 e i 15 anni, a chi ha il consenso di un genitore. Un genitore che scopre che il figlio ha creato un account senza il suo consenso può scriverci per farlo eliminare.",
        ],
      },
      {
        id: 'security',
        title: 'Sicurezza',
        blocks: [
          'Tutte le comunicazioni sono cifrate (HTTPS). L\'accesso al database è controllato da regole di sicurezza: ognuno può leggere solo ciò che è pubblico o che lo riguarda, e può modificare solo i propri dati.',
        ],
      },
      {
        id: 'changes',
        title: 'Modifiche',
        blocks: [
          "Possiamo aggiornare questa informativa; la data in cima alla pagina indica l'ultima versione. In caso di cambiamenti importanti, li annunceremo nel gioco.",
        ],
      },
    ],
  },

  terms: {
    title: "Condizioni d'uso",
    intro: [
      "Queste condizioni regolano l'uso di GeoGame, sul sito {site} e nell'app. Usando GeoGame, le accetti.",
    ],
    sections: [
      {
        id: 'access',
        title: 'Accesso al gioco',
        blocks: [
          "GeoGame è gratuito e si può giocare senza account. Un account permette inoltre di riservare un nome utente, conservare una cronologia, aggiungere amici e ricevere inviti. L'accesso a Internet è a tuo carico.",
          'Il gioco è fornito così com\'è. Possiamo modificarlo, aggiungere o rimuovere giochi o interromperlo, in particolare per manutenzione, senza preavviso.',
        ],
      },
      {
        id: 'account',
        title: 'Account',
        blocks: [
          "La creazione di un account è riservata a chi ha almeno 13 anni e, tra i 13 e i 15 anni, a chi ha il consenso di un genitore. Ti impegni a fornire un indirizzo email valido e a mantenere riservata la tua password. Puoi eliminare il tuo account in qualsiasi momento ([Elimina il mio account](/delete-account)).",
        ],
      },
      {
        id: 'conduct',
        title: 'Regole di comportamento',
        blocks: [
          'Usando GeoGame, ti impegni a non:',
          {
            list: [
              "scegliere un nome utente offensivo, d'odio, discriminatorio o sessuale, che si spacci per un'altra persona o che riveli informazioni personali su qualcun altro;",
              'imbrogliare: modificare o falsificare punteggi, automatizzare partite, sfruttare un bug;',
              'disturbare il servizio o tentare di accedere a dati che non ti riguardano;',
              'molestare altri giocatori, ad esempio con inviti o richieste di amicizia ripetuti.',
            ],
          },
        ],
      },
      {
        id: 'moderation',
        title: 'Moderazione',
        blocks: [
          'Chiunque può segnalare un punteggio o un nome utente con la bandierina mostrata nelle classifiche. Possiamo eliminare un punteggio, un nome utente o un account che viola queste regole, senza preavviso nei casi evidenti.',
        ],
      },
      {
        id: 'ip',
        title: 'Proprietà intellettuale',
        blocks: [
          "Il nome, il codice, il design e i testi di GeoGame appartengono all'editore. È vietato riprodurli senza autorizzazione. I crediti dei contenuti di terzi (mappe, caratteri) si trovano nelle [note legali](/legal).",
        ],
      },
      {
        id: 'liability',
        title: 'Responsabilità',
        blocks: [
          'Le informazioni geografiche del gioco (confini, nomi, capitali, cifre) sono fornite per giocare e possono contenere errori o semplificazioni. Non esprimono alcuna posizione politica.',
          "Nei limiti consentiti dalla legge, l'editore non è responsabile delle interruzioni del servizio né della perdita di punteggi o dati di gioco.",
        ],
      },
      {
        id: 'privacy',
        title: 'Dati personali',
        blocks: ["Il trattamento dei tuoi dati è descritto nell'[informativa sulla privacy](/privacy)."],
      },
      {
        id: 'changes',
        title: 'Modifiche e legge applicabile',
        blocks: [
          "Possiamo modificare queste condizioni; la data in cima alla pagina indica l'ultima versione. Continuare a usare GeoGame dopo una modifica significa accettarla.",
          'Queste condizioni sono regolate dalla legge francese. In caso di disaccordo, scrivici prima a {email} per cercare una soluzione amichevole.',
        ],
      },
    ],
  },

  legal: {
    title: 'Note legali',
    intro: [],
    sections: [
      {
        id: 'editor',
        title: 'Editore',
        blocks: ['GeoGame è pubblicato da {editor}.', 'Contatto: {email}', 'Direttore della pubblicazione: {editor}.'],
      },
      {
        id: 'hosting',
        title: 'Hosting',
        blocks: [
          {
            list: [
              'Sito e funzioni server: Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, Stati Uniti ([vercel.com](https://vercel.com)).',
              'Account e database: Google Firebase, Google Ireland Limited, Gordon House, Barrow Street, Dublino 4, Irlanda ([firebase.google.com](https://firebase.google.com)).',
            ],
          },
        ],
      },
      {
        id: 'credits',
        title: 'Crediti',
        blocks: [
          {
            list: [
              'Bandiere: [Flagpedia](https://flagpedia.net).',
              'Carattere Inter: Rasmus Andersson, con licenza SIL Open Font License.',
            ],
          },
        ],
      },
      {
        id: 'report',
        title: 'Segnalare un contenuto',
        blocks: [
          'Per segnalare un contenuto illecito, come un nome utente offensivo, usa la bandierina di segnalazione nelle classifiche oppure scrivi a {email}.',
        ],
      },
      {
        id: 'links',
        title: 'Vedi anche',
        blocks: ["[Informativa sulla privacy](/privacy) · [Condizioni d'uso](/terms)"],
      },
    ],
  },

  deleteAccount: {
    title: 'Eliminare il tuo account',
    intro: ['Puoi eliminare il tuo account GeoGame in qualsiasi momento, gratuitamente. La cancellazione è immediata e definitiva.'],
    sections: [
      {
        id: 'app',
        title: "Dall'app",
        blocks: ['Apri la scheda Profilo, tocca «Elimina il mio account» in fondo allo schermo, poi conferma con la tua password o con Google.'],
      },
      {
        id: 'site',
        title: 'Dal sito',
        blocks: ['Accedi alla pagina [Il mio account](/account), clicca su «Elimina il mio account», poi conferma.'],
      },
      {
        id: 'email',
        title: 'Se non riesci più ad accedere',
        blocks: [
          "Scrivi a {email} dall'indirizzo email del tuo account, indicando il tuo nome utente. Eliminiamo l'account entro 30 giorni al massimo e te lo confermiamo.",
        ],
      },
      {
        id: 'deleted',
        title: 'Cosa viene eliminato',
        blocks: [
          {
            list: [
              'il tuo account e il tuo indirizzo email;',
              'il tuo nome utente, che torna disponibile;',
              'la cronologia delle tue partite e le tue statistiche;',
              'i tuoi punteggi in tutte le classifiche;',
              'i tuoi amici e i tuoi inviti;',
              'i dispositivi registrati per le notifiche;',
              'le segnalazioni che hai fatto e quelle che riguardano i tuoi punteggi.',
            ],
          },
        ],
      },
      {
        id: 'kept',
        title: 'Cosa può restare',
        blocks: [
          {
            list: [
              'il tuo nome in una stanza multigiocatore, fino alla scadenza della stanza (al massimo 10 giorni);',
              "i punteggi salvati senza aver effettuato l'accesso, che non sono collegati al tuo account: chiedine la cancellazione via email;",
              'i log tecnici dei fornitori di hosting, cancellati dopo qualche giorno.',
            ],
          },
        ],
      },
    ],
  },
}
