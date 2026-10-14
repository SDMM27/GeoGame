// Legal pages in German (see ../documents.js for the format and when to update them).
export default {
  privacy: {
    title: 'Datenschutzerklärung',
    intro: [
      'GeoGame ist ein kostenloses Geografie-Spiel auf der Website {site} und in der GeoGame-App. Diese Seite erklärt, welche Daten wir verarbeiten, warum, wie lange und wie du deine Rechte ausübst.',
      'Wir erheben so wenige Daten wie möglich: keine Werbung, kein Verkauf von Daten, kein Profiling.',
    ],
    sections: [
      {
        id: 'controller',
        title: 'Verantwortlicher',
        blocks: ['{editor}, erreichbar unter {email}.'],
      },
      {
        id: 'data',
        title: 'Welche Daten wir verarbeiten',
        blocks: [
          'Ohne Konto kannst du frei spielen. Wir erhalten dann nur, was du selbst veröffentlichst: den Namen und die Punktzahl, die du in einer Rangliste speicherst, den Namen, den du in einem Mehrspieler-Raum verwendest, und deine Meldungen (mit einer zufälligen Kennung, die auf deinem Gerät erzeugt wird).',
          'Mit einem Konto verarbeiten wir zusätzlich:',
          {
            list: [
              'deine E-Mail-Adresse und dein Passwort, das Firebase Authentication verschlüsselt speichert: Wir haben nie Zugriff darauf. Wenn du dich mit Google anmeldest, erhalten wir die E-Mail-Adresse und die Kennung deines Google-Kontos (Google kann auch deinen Namen und dein Profilbild übermitteln, die wir nicht verwenden);',
              'deinen Benutzernamen, das Erstellungsdatum des Kontos und deine Anmeldedaten;',
              'deinen Spielverlauf (Spiel, Modus, Punktzahl, Zeit, Datum) und deine Punktzahlen in den Ranglisten, einschließlich der probierten Antworten bei den Tageschallenges;',
              'deine Freundschaftsanfragen, deine Freunde und die Raumeinladungen, die du sendest oder erhältst;',
              'wenn du Benachrichtigungen erlaubst, in der App oder in der Web-App auf deinem Startbildschirm: eine Benachrichtigungskennung des Geräts (Expo-Token oder Web-Push-Abonnement), deine Sprache, deinen Gerätetyp und deine Wahl für die tägliche Erinnerung.',
            ],
          },
          'Für alle verarbeiten unsere Hosting-Anbieter außerdem die IP-Adresse und technische Informationen jeder Anfrage (Browser, Gerät), um den Dienst zu betreiben und abzusichern. Auf der Website misst Vercel Web Analytics die Reichweite ohne Cookies und liefert nur zusammengefasste Besuchsstatistiken, und Firebase App Check nutzt Google reCAPTCHA Enterprise, das Browsersignale auswertet, um zu prüfen, ob Anfragen wirklich vom Spiel stammen.',
        ],
      },
      {
        id: 'public',
        title: 'Was öffentlich ist',
        blocks: [
          'Dein Benutzername, deine Ranglisten-Punktzahlen und deine Profilseite (Registrierungsdatum, Statistiken, Spielverlauf) sind für alle sichtbar. Deine E-Mail-Adresse, deine Freunde und deine Einladungen sind nie öffentlich. Wenn du lieber anonym bleibst, wähle einen Benutzernamen, der nicht verrät, wer du bist.',
        ],
      },
      {
        id: 'purposes',
        title: 'Zwecke und Rechtsgrundlagen',
        blocks: [
          {
            list: [
              'Betrieb des Spiels, deines Kontos, der Ranglisten, deines Verlaufs, der Freunde und des Mehrspielermodus: Erfüllung der [Nutzungsbedingungen](/terms), die du mit der Nutzung von GeoGame akzeptierst (Art. 6 Abs. 1 lit. b DSGVO).',
              'Versand von Benachrichtigungen (Raumeinladungen, Freundschaftsanfragen, Erinnerung an die Tageschallenge): deine Einwilligung, die du mit dem Erlauben von Benachrichtigungen gibst und jederzeit in den Geräteeinstellungen widerrufen kannst. Die tägliche Erinnerung lässt sich auch in deinem Profil abschalten.',
              'Schutz des Dienstes vor Betrug und Missbrauch (App Check, Meldungen, Namensfilter) und anonyme Reichweitenmessung: unser berechtigtes Interesse, ein verlässliches Spiel anzubieten und zu verbessern (Art. 6 Abs. 1 lit. f DSGVO).',
            ],
          },
          'Wir betreiben keine Werbung, kein Profiling und keine automatisierten Entscheidungen über dich, und wir verkaufen keine Daten.',
        ],
      },
      {
        id: 'recipients',
        title: 'Empfänger und Dienstleister',
        blocks: [
          'Deine Daten sind nur für den Herausgeber und für die folgenden technischen Dienstleister zugänglich, die sie in unserem Auftrag verarbeiten:',
          {
            list: [
              'Google (Firebase Authentication, Cloud Firestore, App Check, reCAPTCHA Enterprise): Konten, Datenbank und Missbrauchsschutz;',
              'Vercel Inc.: Hosting der Website und der Serverfunktionen, Reichweitenmessung;',
              'Expo (650 Industries, Inc.): Zustellung von Benachrichtigungen und App-Updates;',
              'Push-Dienste der Browser (je nach Gerät Apple, Google, Mozilla oder Microsoft): Zustellung der Benachrichtigungen der Web-App;',
              'Flagpedia (flagcdn.com): einige Flaggenbilder der Website.',
            ],
          },
          'Einige dieser Dienstleister befinden sich außerhalb der Europäischen Union, insbesondere in den Vereinigten Staaten. Diese Übermittlungen sind durch den EU-US-Datenschutzrahmen oder durch die Standardvertragsklauseln der Europäischen Kommission abgesichert.',
        ],
      },
      {
        id: 'retention',
        title: 'Wie lange wir Daten speichern',
        blocks: [
          {
            list: [
              'Konto und zugehörige Daten: solange das Konto besteht. Ein Konto, das 3 Jahre lang nicht genutzt wird (keine Anmeldung, kein Spiel), wird automatisch mit allen Daten gelöscht.',
              'Ohne Konto gespeicherte Punktzahlen: solange die Rangliste besteht. Du kannst ihre Löschung verlangen.',
              'Mehrspieler-Räume: werden beim Ablauf automatisch gelöscht, spätestens 10 Tage nach ihrer Erstellung. Einladungen: höchstens einen Tag.',
              'Benachrichtigungs-Token: bis sich das Gerät abmeldet, das Konto gelöscht wird oder das Gerät keine Benachrichtigungen mehr empfangen kann.',
              'Meldungen: so lange, wie ihre Bearbeitung dauert.',
              'Technische Protokolle der Hosting-Anbieter: ein vom Anbieter festgelegter begrenzter Zeitraum, meist einige Tage.',
            ],
          },
        ],
      },
      {
        id: 'storage',
        title: 'Cookies und Speicherung auf deinem Gerät',
        blocks: [
          'GeoGame verwendet keine Werbe- oder Analyse-Cookies. Das Spiel speichert auf deinem Gerät, was es zum Funktionieren braucht: deine Anmeldesitzung, deinen Namen, deine Sprache, letzte Räume, deinen Fortschritt bei den Tageschallenges und eine zufällige Besucherkennung für Meldungen. reCAPTCHA kann ein für den Missbrauchsschutz notwendiges technisches Cookie setzen.',
          'Diese Elemente sind für den Dienst unbedingt erforderlich und benötigen daher keine Einwilligung. Du kannst sie jederzeit in den Browsereinstellungen oder durch Deinstallation der App löschen.',
        ],
      },
      {
        id: 'rights',
        title: 'Deine Rechte',
        blocks: [
          'Du hast das Recht auf Auskunft, Berichtigung und Löschung deiner Daten, auf Einschränkung der Verarbeitung, auf Widerspruch und auf Datenübertragbarkeit.',
          'Du kannst dein Konto und alle zugehörigen Daten jederzeit selbst löschen: siehe [Mein Konto löschen](/delete-account). Für alle anderen Anliegen (eine Kopie deiner Daten, eine Änderung des Benutzernamens, die Löschung einer ohne Konto gespeicherten Punktzahl …) schreib an {email}. Wir antworten innerhalb eines Monats.',
          'Wenn du der Meinung bist, dass deine Rechte nicht gewahrt werden, kannst du dich bei deiner Datenschutzaufsichtsbehörde beschweren, in Frankreich bei der CNIL ([cnil.fr](https://www.cnil.fr)).',
        ],
      },
      {
        id: 'minors',
        title: 'Minderjährige',
        blocks: [
          'Jeder kann GeoGame ohne Konto spielen. Ein Konto dürfen nur Personen ab 13 Jahren erstellen, zwischen 13 und 15 Jahren nur mit Zustimmung eines Elternteils. Eltern, die feststellen, dass ihr Kind ohne Zustimmung ein Konto erstellt hat, können uns schreiben, damit wir es löschen.',
        ],
      },
      {
        id: 'security',
        title: 'Sicherheit',
        blocks: [
          'Die gesamte Kommunikation ist verschlüsselt (HTTPS). Der Zugriff auf die Datenbank wird durch Sicherheitsregeln kontrolliert: Jeder kann nur lesen, was öffentlich ist oder ihn selbst betrifft, und nur seine eigenen Daten ändern.',
        ],
      },
      {
        id: 'changes',
        title: 'Änderungen',
        blocks: [
          'Wir können diese Erklärung aktualisieren; das Datum oben auf der Seite zeigt die aktuelle Fassung. Bei wichtigen Änderungen informieren wir im Spiel darüber.',
        ],
      },
    ],
  },

  terms: {
    title: 'Nutzungsbedingungen',
    intro: [
      'Diese Bedingungen regeln die Nutzung von GeoGame auf der Website {site} und in der App. Mit der Nutzung von GeoGame akzeptierst du sie.',
    ],
    sections: [
      {
        id: 'access',
        title: 'Zugang zum Spiel',
        blocks: [
          'GeoGame ist kostenlos und ohne Konto spielbar. Ein Konto ermöglicht zusätzlich, einen Benutzernamen zu reservieren, einen Verlauf zu behalten, Freunde hinzuzufügen und Einladungen zu erhalten. Die Kosten für den Internetzugang trägst du selbst.',
          'Das Spiel wird so bereitgestellt, wie es ist. Wir können es ändern, Spiele hinzufügen oder entfernen oder es unterbrechen, insbesondere für Wartungsarbeiten, ohne Vorankündigung.',
        ],
      },
      {
        id: 'account',
        title: 'Konto',
        blocks: [
          'Ein Konto dürfen nur Personen ab 13 Jahren erstellen, zwischen 13 und 15 Jahren nur mit Zustimmung eines Elternteils. Du verpflichtest dich, eine gültige E-Mail-Adresse anzugeben und dein Passwort geheim zu halten. Du kannst dein Konto jederzeit löschen ([Mein Konto löschen](/delete-account)).',
        ],
      },
      {
        id: 'conduct',
        title: 'Verhaltensregeln',
        blocks: [
          'Mit der Nutzung von GeoGame verpflichtest du dich, Folgendes zu unterlassen:',
          {
            list: [
              'einen Benutzernamen zu wählen, der beleidigend, hasserfüllt, diskriminierend oder sexuell ist, sich als eine andere Person ausgibt oder persönliche Informationen über jemand anderen preisgibt;',
              'zu betrügen: Punktzahlen zu verändern oder zu fälschen, Spiele zu automatisieren, einen Fehler auszunutzen;',
              'den Dienst zu stören oder zu versuchen, auf Daten zuzugreifen, die dich nicht betreffen;',
              'andere Spieler zu belästigen, zum Beispiel mit wiederholten Einladungen oder Freundschaftsanfragen.',
            ],
          },
        ],
      },
      {
        id: 'moderation',
        title: 'Moderation',
        blocks: [
          'Jeder kann eine Punktzahl oder einen Benutzernamen über die Flagge in den Ranglisten melden. Wir können eine Punktzahl, einen Benutzernamen oder ein Konto, das gegen diese Regeln verstößt, löschen, in eindeutigen Fällen ohne Vorankündigung.',
        ],
      },
      {
        id: 'ip',
        title: 'Geistiges Eigentum',
        blocks: [
          'Name, Code, Design und Texte von GeoGame gehören dem Herausgeber. Eine Vervielfältigung ohne Erlaubnis ist untersagt. Die Nachweise für Inhalte Dritter (Karten, Schriftarten) stehen im [Impressum](/legal).',
        ],
      },
      {
        id: 'liability',
        title: 'Haftung',
        blocks: [
          'Die geografischen Informationen im Spiel (Grenzen, Namen, Hauptstädte, Zahlen) dienen dem Spiel und können Fehler oder Vereinfachungen enthalten. Sie drücken keine politische Haltung aus.',
          'Soweit gesetzlich zulässig, haftet der Herausgeber weder für Unterbrechungen des Dienstes noch für den Verlust von Punktzahlen oder Spieldaten.',
        ],
      },
      {
        id: 'privacy',
        title: 'Personenbezogene Daten',
        blocks: ['Wie deine Daten verarbeitet werden, steht in der [Datenschutzerklärung](/privacy).'],
      },
      {
        id: 'changes',
        title: 'Änderungen und anwendbares Recht',
        blocks: [
          'Wir können diese Bedingungen ändern; das Datum oben auf der Seite zeigt die aktuelle Fassung. Wenn du GeoGame nach einer Änderung weiter nutzt, akzeptierst du sie.',
          'Diese Bedingungen unterliegen französischem Recht. Bei Meinungsverschiedenheiten schreib uns bitte zuerst an {email}, um eine gütliche Lösung zu finden.',
        ],
      },
    ],
  },

  legal: {
    title: 'Impressum',
    intro: [],
    sections: [
      {
        id: 'editor',
        title: 'Herausgeber',
        blocks: ['GeoGame wird herausgegeben von {editor}.', 'Kontakt: {email}', 'Verantwortlich für den Inhalt: {editor}.'],
      },
      {
        id: 'hosting',
        title: 'Hosting',
        blocks: [
          {
            list: [
              'Website und Serverfunktionen: Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, Vereinigte Staaten ([vercel.com](https://vercel.com)).',
              'Konten und Datenbank: Google Firebase, Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland ([firebase.google.com](https://firebase.google.com)).',
            ],
          },
        ],
      },
      {
        id: 'credits',
        title: 'Nachweise',
        blocks: [
          {
            list: [
              'Flaggen: [Flagpedia](https://flagpedia.net).',
              'Schriftart Inter: Rasmus Andersson, unter der SIL Open Font License.',
              'Detaillierte Umrisse kleiner Gebiete: [geoBoundaries](https://www.geoboundaries.org) (CC BY) und © [OpenStreetMap](https://www.openstreetmap.org/copyright)-Mitwirkende (ODbL).',
            ],
          },
        ],
      },
      {
        id: 'report',
        title: 'Inhalte melden',
        blocks: [
          'Um rechtswidrige Inhalte zu melden, etwa einen beleidigenden Benutzernamen, nutze die Melde-Flagge in den Ranglisten oder schreib an {email}.',
        ],
      },
      {
        id: 'links',
        title: 'Siehe auch',
        blocks: ['[Datenschutzerklärung](/privacy) · [Nutzungsbedingungen](/terms)'],
      },
    ],
  },

  deleteAccount: {
    title: 'Dein Konto löschen',
    intro: ['Du kannst dein GeoGame-Konto jederzeit kostenlos löschen. Die Löschung erfolgt sofort und endgültig.'],
    sections: [
      {
        id: 'app',
        title: 'In der App',
        blocks: ['Öffne den Tab Profil, tippe unten auf „Mein Konto löschen“ und bestätige mit deinem Passwort oder mit Google.'],
      },
      {
        id: 'site',
        title: 'Auf der Website',
        blocks: ['Melde dich auf der Seite [Mein Konto](/account) an, klicke auf „Mein Konto löschen“ und bestätige.'],
      },
      {
        id: 'email',
        title: 'Wenn du dich nicht mehr anmelden kannst',
        blocks: [
          'Schreib an {email} von der E-Mail-Adresse deines Kontos aus und nenne deinen Benutzernamen. Wir löschen das Konto innerhalb von höchstens 30 Tagen und bestätigen es dir.',
        ],
      },
      {
        id: 'deleted',
        title: 'Was gelöscht wird',
        blocks: [
          {
            list: [
              'dein Konto und deine E-Mail-Adresse;',
              'dein Benutzername, der wieder frei wird;',
              'dein Spielverlauf und deine Statistiken;',
              'deine Punktzahlen in allen Ranglisten;',
              'deine Freunde und Einladungen;',
              'die für Benachrichtigungen registrierten Geräte;',
              'deine Meldungen und die Meldungen zu deinen Punktzahlen.',
            ],
          },
        ],
      },
      {
        id: 'kept',
        title: 'Was bleiben kann',
        blocks: [
          {
            list: [
              'dein Name in einem Mehrspieler-Raum, bis der Raum abläuft (höchstens 10 Tage);',
              'Punktzahlen, die du abgemeldet gespeichert hast und die nicht mit deinem Konto verknüpft sind: Bitte per E-Mail um ihre Löschung;',
              'technische Protokolle der Hosting-Anbieter, die nach einigen Tagen gelöscht werden.',
            ],
          },
        ],
      },
    ],
  },
}
