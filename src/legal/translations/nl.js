// Legal pages in Dutch (see ../documents.js for the format and when to update them).
export default {
  privacy: {
    title: 'Privacybeleid',
    intro: [
      'GeoGame is een gratis aardrijkskundespel op de website {site} en in de GeoGame-app. Deze pagina legt uit welke gegevens we verwerken, waarom, hoe lang en hoe je je rechten uitoefent.',
      'We verzamelen zo weinig mogelijk gegevens: geen advertenties, geen verkoop van gegevens, geen profilering.',
    ],
    sections: [
      {
        id: 'controller',
        title: 'Verwerkingsverantwoordelijke',
        blocks: ['{editor}, bereikbaar op {email}.'],
      },
      {
        id: 'data',
        title: 'Welke gegevens we verwerken',
        blocks: [
          'Zonder account kun je vrij spelen. We ontvangen dan alleen wat je zelf publiceert: de naam en de score die je in een ranglijst opslaat, de naam die je in een multiplayerkamer gebruikt en je meldingen (met een willekeurige id die op je apparaat wordt aangemaakt).',
          'Met een account verwerken we daarnaast:',
          {
            list: [
              'je e-mailadres als je je met een e-mailadres registreert of inlogt met Google. Firebase Authentication beheert het wachtwoord van accounts die met een e-mailadres zijn aangemaakt. Als je inlogt met Google, ontvangen we ook het ID van je Google-account (Google kan ook je naam en profielfoto doorgeven, die wij niet gebruiken);',
              'als je een account met een gebruikersnaam en wachtwoord aanmaakt, vragen we geen e-mailadres. Onze server verwerkt je wachtwoord kortstondig. Amazon Cognito bewaart de gegevens die nodig zijn om het te controleren. GeoGame bewaart alleen een hash van je herstelcode;',
              'je gebruikersnaam, de aanmaakdatum van het account en je inloggegevens;',
              'je spelgeschiedenis (spel, modus, score, tijd, datum) en je scores in de ranglijsten, inclusief de geprobeerde antwoorden bij de dagelijkse uitdagingen;',
              'je vriendschapsverzoeken, je vrienden en de kameruitnodigingen die je verstuurt of ontvangt;',
              'als je meldingen toestaat, in de app of in de webapp op je beginscherm: een meldings-id van het apparaat (Expo-token of web-pushabonnement), je taal, je type apparaat en je keuze voor de dagelijkse herinnering.',
            ],
          },
          'Als je het wachtwoord van een account zonder e-mailadres instelt of opnieuw instelt, controleren we of het in bekende datalekken voorkomt. Alleen de eerste vijf tekens van de SHA-1-hash worden naar Pwned Passwords gestuurd. We gebruiken gepseudonimiseerde tellers om het aantal pogingen te beperken.',
          'Voor iedereen verwerken onze hostingproviders bovendien het IP-adres en technische gegevens van elk verzoek (browser, apparaat) om de dienst te laten werken en te beveiligen. Op de website meet Vercel Web Analytics het bereik zonder cookies en levert alleen samengevatte bezoekcijfers, en Firebase App Check gebruikt Google reCAPTCHA Enterprise, dat browsersignalen analyseert om te controleren of verzoeken echt van het spel komen.',
        ],
      },
      {
        id: 'public',
        title: 'Wat openbaar is',
        blocks: [
          'Je gebruikersnaam, je scores in de ranglijsten en je profielpagina (inschrijfdatum, statistieken, spelgeschiedenis) zijn voor iedereen zichtbaar. Je e-mailadres, je vrienden en je uitnodigingen zijn nooit openbaar. Als je liever anoniem blijft, kies dan een gebruikersnaam die niet verraadt wie je bent.',
        ],
      },
      {
        id: 'purposes',
        title: 'Doeleinden en rechtsgronden',
        blocks: [
          {
            list: [
              'De werking van het spel, je account, de ranglijsten, je geschiedenis, de vrienden en de multiplayermodus: uitvoering van de [gebruiksvoorwaarden](/terms) die je accepteert door GeoGame te gebruiken (art. 6, lid 1, onder b AVG).',
              'Het versturen van meldingen (kameruitnodigingen, vriendschapsverzoeken, herinnering aan de dagelijkse uitdaging): je toestemming, die je geeft door meldingen toe te staan en die je op elk moment kunt intrekken in de instellingen van je apparaat. De dagelijkse herinnering kun je ook uitschakelen in je profiel.',
              'De bescherming van de dienst tegen fraude en misbruik (App Check, meldingen, naamfilter) en anonieme bereiksmeting: ons gerechtvaardigd belang om een betrouwbaar spel aan te bieden en te verbeteren (art. 6, lid 1, onder f AVG).',
            ],
          },
          'We tonen geen advertenties, doen niet aan profilering, nemen geen geautomatiseerde besluiten over jou en verkopen geen gegevens.',
        ],
      },
      {
        id: 'recipients',
        title: 'Ontvangers en dienstverleners',
        blocks: [
          'Je gegevens zijn alleen toegankelijk voor de uitgever en voor de volgende technische dienstverleners, die ze namens ons verwerken:',
          {
            list: [
              'Google (Firebase Authentication, Cloud Firestore, App Check, reCAPTCHA Enterprise): accounts, database en bescherming tegen misbruik;',
              'Amazon Web Services (Amazon Cognito): authenticatie voor accounts zonder e-mailadres;',
              'Vercel Inc.: hosting van de website en de serverfuncties, bereiksmeting;',
              'Expo (650 Industries, Inc.): bezorging van meldingen en app-updates;',
              'Pushdiensten van browsers (afhankelijk van het apparaat Apple, Google, Mozilla of Microsoft): bezorging van de meldingen van de webapp;',
              'Flagpedia (flagcdn.com): enkele vlagafbeeldingen van de website.',
            ],
          },
          'Sommige van deze dienstverleners zijn gevestigd buiten de Europese Unie, met name in de Verenigde Staten. Deze doorgiften zijn beveiligd door het EU-VS-gegevensprivacykader of door de modelcontractbepalingen van de Europese Commissie.',
        ],
      },
      {
        id: 'retention',
        title: 'Hoe lang we gegevens bewaren',
        blocks: [
          {
            list: [
              'Account en bijbehorende gegevens: zolang het account bestaat. Een account dat 3 jaar niet wordt gebruikt (geen login, geen spel) wordt automatisch verwijderd, met alle gegevens.',
              'Gepseudonimiseerde tellers om het aantal pogingen te beperken: verlopen tellers worden tijdens een dagelijkse opschoning verwijderd.',
              'Scores die zonder account zijn opgeslagen: zolang de ranglijst bestaat. Je kunt vragen ze te verwijderen.',
              'Multiplayerkamers: worden automatisch verwijderd wanneer ze verlopen, uiterlijk 10 dagen na het aanmaken. Uitnodigingen: ten hoogste één dag.',
              'Meldingstokens: tot het apparaat zich afmeldt, het account wordt verwijderd of het apparaat geen meldingen meer kan ontvangen.',
              'Meldingen: zolang de afhandeling duurt.',
              'Technische logs van de hostingproviders: een beperkte periode die de provider bepaalt, meestal enkele dagen.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        title: 'Cookies en opslag op je apparaat',
        blocks: [
          'GeoGame gebruikt geen advertentie- of analysecookies. Het spel bewaart op je apparaat wat het nodig heeft om te werken: je inlogsessie, je naam, je taal, recente kamers, je voortgang in de dagelijkse uitdagingen en een willekeurige bezoekers-id voor meldingen. reCAPTCHA kan een technische cookie plaatsen die nodig is voor de bescherming tegen misbruik.',
          'Deze elementen zijn strikt noodzakelijk voor de dienst en vereisen daarom geen toestemming. Je kunt ze op elk moment wissen via de instellingen van je browser of door de app te verwijderen.',
        ],
      },
      {
        id: 'rights',
        title: 'Je rechten',
        blocks: [
          'Je hebt het recht op inzage, rectificatie en verwijdering van je gegevens, op beperking van de verwerking, op bezwaar en op overdraagbaarheid van gegevens.',
          'Je kunt je account en alle bijbehorende gegevens op elk moment zelf verwijderen: zie [Mijn account verwijderen](/delete-account). Voor alle andere verzoeken (een kopie van je gegevens, een wijziging van je gebruikersnaam, het verwijderen van een score die zonder account is opgeslagen …) schrijf je naar {email}. We antwoorden binnen een maand.',
          'Als je vindt dat je rechten niet worden gerespecteerd, kun je een klacht indienen bij je toezichthoudende autoriteit voor gegevensbescherming, in Frankrijk de CNIL ([cnil.fr](https://www.cnil.fr)).',
        ],
      },
      {
        id: 'minors',
        title: 'Minderjarigen',
        blocks: [
          'Iedereen kan GeoGame zonder account spelen. Een account kunnen alleen personen vanaf 13 jaar aanmaken, tussen 13 en 15 jaar alleen met toestemming van een ouder. Ouders die merken dat hun kind zonder toestemming een account heeft aangemaakt, kunnen ons schrijven zodat we het verwijderen.',
        ],
      },
      {
        id: 'security',
        title: 'Beveiliging',
        blocks: [
          'Alle communicatie is versleuteld (HTTPS). De toegang tot de database wordt beheerd met beveiligingsregels: ieder kan alleen lezen wat openbaar is of hemzelf betreft, en alleen zijn eigen gegevens wijzigen.',
        ],
      },
      {
        id: 'changes',
        title: 'Wijzigingen',
        blocks: [
          'We kunnen dit beleid bijwerken; de datum bovenaan de pagina geeft de huidige versie aan. Bij belangrijke wijzigingen informeren we je in het spel.',
        ],
      },
    ],
  },

  terms: {
    title: 'Gebruiksvoorwaarden',
    intro: [
      'Deze voorwaarden regelen het gebruik van GeoGame op de website {site} en in de app. Door GeoGame te gebruiken, accepteer je ze.',
    ],
    sections: [
      {
        id: 'access',
        title: 'Toegang tot het spel',
        blocks: [
          'GeoGame is gratis en speelbaar zonder account. Met een account kun je bovendien een gebruikersnaam reserveren, een geschiedenis bijhouden, vrienden toevoegen en uitnodigingen ontvangen. De kosten van je internettoegang zijn voor je eigen rekening.',
          'Het spel wordt geleverd zoals het is. We kunnen het wijzigen, spellen toevoegen of verwijderen of het onderbreken, bijvoorbeeld voor onderhoud, zonder voorafgaande kennisgeving.',
        ],
      },
      {
        id: 'account',
        title: 'Account',
        blocks: [
          'Een account kunnen alleen personen vanaf 13 jaar aanmaken, tussen 13 en 15 jaar alleen met toestemming van een ouder. Als je een e-mailadres opgeeft, moet het geldig zijn. Houd je wachtwoord en eventuele herstelcode geheim. Je kunt je account op elk moment verwijderen ([Mijn account verwijderen](/delete-account)).',
        ],
      },
      {
        id: 'conduct',
        title: 'Gedragsregels',
        blocks: [
          'Door GeoGame te gebruiken, verbind je je ertoe om niet:',
          {
            list: [
              'een gebruikersnaam te kiezen die beledigend, haatdragend, discriminerend of seksueel is, zich voordoet als iemand anders of persoonlijke gegevens over iemand anders onthult;',
              'vals te spelen: scores te wijzigen of te vervalsen, spellen te automatiseren, een fout uit te buiten;',
              'de dienst te verstoren of te proberen toegang te krijgen tot gegevens die niet jou betreffen;',
              'andere spelers lastig te vallen, bijvoorbeeld met herhaalde uitnodigingen of vriendschapsverzoeken.',
            ],
          },
        ],
      },
      {
        id: 'moderation',
        title: 'Moderatie',
        blocks: [
          'Iedereen kan een score of een gebruikersnaam melden via de vlag in de ranglijsten. We kunnen een score, een gebruikersnaam of een account dat deze regels overtreedt verwijderen, in duidelijke gevallen zonder voorafgaande kennisgeving.',
        ],
      },
      {
        id: 'ip',
        title: 'Intellectueel eigendom',
        blocks: [
          'De naam, de code, het ontwerp en de teksten van GeoGame zijn eigendom van de uitgever. Verveelvoudiging zonder toestemming is verboden. De bronvermeldingen voor inhoud van derden (kaarten, lettertypen) staan in de [juridische vermeldingen](/legal).',
        ],
      },
      {
        id: 'liability',
        title: 'Aansprakelijkheid',
        blocks: [
          'De geografische informatie in het spel (grenzen, namen, hoofdsteden, cijfers) is bedoeld voor het spel en kan fouten of vereenvoudigingen bevatten. Ze drukt geen politiek standpunt uit.',
          'Voor zover de wet het toestaat, is de uitgever niet aansprakelijk voor onderbrekingen van de dienst, noch voor het verlies van scores of speldata.',
        ],
      },
      {
        id: 'privacy',
        title: 'Persoonsgegevens',
        blocks: ['Hoe je gegevens worden verwerkt, staat in het [privacybeleid](/privacy).'],
      },
      {
        id: 'changes',
        title: 'Wijzigingen en toepasselijk recht',
        blocks: [
          'We kunnen deze voorwaarden wijzigen; de datum bovenaan de pagina geeft de huidige versie aan. Als je GeoGame na een wijziging blijft gebruiken, accepteer je die.',
          'Deze voorwaarden vallen onder het Franse recht. Bij een geschil vragen we je eerst te schrijven naar {email}, om een minnelijke oplossing te zoeken.',
        ],
      },
    ],
  },

  legal: {
    title: 'Juridische vermeldingen',
    intro: [],
    sections: [
      {
        id: 'editor',
        title: 'Uitgever',
        blocks: ['GeoGame wordt uitgegeven door {editor}.', 'Contact: {email}', 'Verantwoordelijke voor de inhoud: {editor}.'],
      },
      {
        id: 'hosting',
        title: 'Hosting',
        blocks: [
          {
            list: [
              'Website en serverfuncties: Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, Verenigde Staten ([vercel.com](https://vercel.com)).',
              'Accounts en database: Google Firebase, Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ierland ([firebase.google.com](https://firebase.google.com)).',
            ],
          },
        ],
      },
      {
        id: 'credits',
        title: 'Bronvermeldingen',
        blocks: [
          {
            list: [
              'Vlaggen: [Flagpedia](https://flagpedia.net).',
              'Lettertype Inter: Rasmus Andersson, onder de SIL Open Font License.',
              'Gedetailleerde omtrekken van kleine gebieden: [geoBoundaries](https://www.geoboundaries.org) (CC BY) en © bijdragers van [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL).',
              'Omtrekken die uit OpenStreetMap zijn overgenomen blijven onder de ODbL-licentie: ze zitten in de geometriebestanden van de website en de app en mogen onder de voorwaarden van die licentie worden hergebruikt.',
            ],
          },
        ],
      },
      {
        id: 'report',
        title: 'Inhoud melden',
        blocks: [
          'Om onwettige inhoud te melden, zoals een beledigende gebruikersnaam, gebruik je de meldvlag in de ranglijsten of schrijf je naar {email}.',
        ],
      },
      {
        id: 'links',
        title: 'Zie ook',
        blocks: ['[Privacybeleid](/privacy) · [Gebruiksvoorwaarden](/terms)'],
      },
    ],
  },

  deleteAccount: {
    title: 'Je account verwijderen',
    intro: ['Je kunt je GeoGame-account op elk moment gratis verwijderen. De verwijdering is onmiddellijk en definitief.'],
    sections: [
      {
        id: 'app',
        title: 'In de app',
        blocks: ['Open het tabblad Profiel, tik onderaan op “Mijn account verwijderen” en bevestig met je wachtwoord of met Google.'],
      },
      {
        id: 'site',
        title: 'Op de website',
        blocks: ['Log in op de pagina [Mijn account](/account), klik op “Mijn account verwijderen” en bevestig.'],
      },
      {
        id: 'email',
        title: 'Als je niet meer kunt inloggen',
        blocks: [
          'Als je voor een account zonder e-mailadres je wachtwoord bent vergeten, stel het dan opnieuw in met je herstelcode. Log daarna in om je account te verwijderen.',
          'Schrijf voor andere verwijderingsverzoeken naar {email} en vermeld je gebruikersnaam. Als er een e-mailadres aan het account is gekoppeld, schrijf dan vanaf dat adres. We kunnen je vragen te bewijzen dat het account van jou is. Deel nooit je wachtwoord of herstelcode.',
        ],
      },
      {
        id: 'deleted',
        title: 'Wat wordt verwijderd',
        blocks: [
          {
            list: [
              'je account, de bijbehorende inloggegevens en je e-mailadres als het aan het account is gekoppeld;',
              'je gebruikersnaam, die weer beschikbaar komt;',
              'je spelgeschiedenis en je statistieken;',
              'je scores in alle ranglijsten;',
              'je vrienden en uitnodigingen;',
              'de apparaten die voor meldingen zijn geregistreerd;',
              'je meldingen en de meldingen over je scores.',
            ],
          },
        ],
      },
      {
        id: 'kept',
        title: 'Wat kan blijven bestaan',
        blocks: [
          {
            list: [
              'je naam in een multiplayerkamer, tot de kamer verloopt (maximaal 10 dagen);',
              'scores die je uitgelogd hebt opgeslagen en die niet aan je account zijn gekoppeld: vraag per e-mail om ze te verwijderen;',
              'technische logs van de hostingproviders, die na enkele dagen worden gewist.',
            ],
          },
        ],
      },
    ],
  },
}
