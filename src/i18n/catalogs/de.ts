import type { TranslationCatalog } from '../types'

export const de: TranslationCatalog = {
  common: {
    today: 'Heute',
    tomorrow: 'Morgen',
    uncategorized: 'Ohne Kategorie',
    custom: 'Benutzerdefiniert',
    selectTime: 'Zeit auswählen',
  },
  greetings: {
    morning: 'Guten Morgen',
    afternoon: 'Guten Tag',
    evening: 'Guten Abend',
  },
  categories: {
    system: {
      work: 'Arbeit',
      personal: 'Persönlich',
      wellness: 'Wohlbefinden',
      home: 'Zuhause',
    },
  },
  auth: {
    actions: {
      ok: 'OK',
      reactivate: 'Reaktivieren',
      keepDeletion: 'Löschung beibehalten',
    },
    errors: {
      signInTitle: 'Anmeldefehler',
      googleFallback: 'Anmeldung mit Google fehlgeschlagen',
      appleFallback: 'Anmeldung mit Apple fehlgeschlagen',
      accountExistsTitle: 'Konto existiert bereits',
      accountExistsMessage: 'Es existiert bereits ein Konto mit dieser E-Mail-Adresse.',
    },
    pendingDeletion: {
      title: 'Konto zur Löschung vorgemerkt',
      message:
        'Dein Konto ist für die Löschung am {{date}} vorgesehen. Möchtest du es reaktivieren?',
    },
    login: {
      newUserEyebrow: 'Teste Domani kostenlos, bevor du es kaufst',
      newUserTitle: 'Starte deine 14-tägige kostenlose Testphase',
      newUserSubtitle:
        'Zuerst voller Zugriff. Nur ein lebenslanger Kauf, wenn du weitermachen möchtest.',
      stepStartLabel: 'Heute kostenlos starten',
      stepStartBody: 'Deine volle 14-tägige Testphase beginnt sofort nach der Anmeldung.',
      stepKeepLabelWithPrice: 'Behalte es für einmalig {{price}}',
      stepKeepLabelFallback: 'Behalte es mit einem einmaligen lebenslangen Kauf',
      stepKeepBody: 'Keine Kreditkarte vorab. Kein Abo nach der Testphase.',
      returningEyebrow: 'Mach dort weiter, wo du aufgehört hast',
      returningTitle: 'Willkommen zurück',
      returningSubtitle: 'Melde dich an, um dein Morgen weiter zu planen.',
      returningCardTitle: 'Deine Pläne warten auf dich.',
      returningCardBody: 'Melde dich an, um zu deinen Aufgaben, Erinnerungen und deinem Flow zurückzukehren.',
      startTrialWithApple: 'Kostenlose Testphase mit Apple starten',
      startTrialWithGoogle: 'Kostenlose Testphase mit Google starten',
      continueWithApple: 'Mit Apple fortfahren',
      continueWithGoogle: 'Mit Google fortfahren',
      back: '← Zurück',
      trialConfirmEyebrow: 'Bevor du fortfährst',
      trialConfirmTitle: 'Du startest eine 14-tägige kostenlose Testphase',
      trialConfirmBody:
        'Wenn du fortfährst, erstellst du dein Konto und startest sofort deine kostenlose Testphase.',
      trialConfirmPointTrial: 'Voller Zugriff für 14 Tage',
      trialConfirmPointLifetimeWithPrice:
        'Danach einmalig {{price}}, wenn du Domani behalten möchtest',
      trialConfirmPointLifetimeFallback:
        'Danach ein einmaliger lebenslanger Kauf, wenn du Domani behalten möchtest',
      trialConfirmPointNoCard: 'Keine Kreditkarte zu Beginn erforderlich',
      cancel: 'Abbrechen',
    },
  },
  onboarding: {
    notificationSetup: {
      eyebrow: '14-tägige kostenlose Testphase',
      title: 'Deine Testphase hat begonnen',
      subtitle:
        'Entdecke Domani jetzt mit vollem Zugriff und entscheide später, ob du lebenslangen Zugriff möchtest.',
      liveHeadline: 'Deine Testphase mit vollem Zugriff ist jetzt aktiv',
      liveDetail: 'Stelle deine Abend-Erinnerung ein und beginne dann mit der Planung von morgen.',
      daysLeftHeadline: 'Du hast noch {{count}} Tage, um Domani zu entdecken',
      daysLeftDetail:
        'Deine Testphase läuft bis {{date}}. Stelle deine Abend-Erinnerung ein und beginne dann mit vollem Zugriff die Planung von morgen.',
      oneDayHeadline: 'Du hast noch 1 Tag in deiner Testphase',
      oneDayDetail:
        'Deine Testphase läuft bis {{date}}. Stelle deine Abend-Erinnerung ein und nutze deinen letzten vollen Tag mit Domani optimal.',
      endsTodayHeadline: 'Deine Testphase endet heute',
      endsTodayDetail:
        'Dein Testzugang läuft bis {{date}}. Stelle jetzt deine Abend-Erinnerung ein, damit du deinen letzten Tag mit vollem Zugriff nicht verpasst.',
      planningReminderTitle: 'Planungs-Erinnerung',
      planningReminderDescription: 'Wähle, wann du erinnert werden möchtest.',
      toggleLabel: 'Sende mir täglich eine Erinnerung',
      taskRemindersTitle: 'Aufgaben-Erinnerungen',
      taskRemindersDescription:
        'Jede Aufgabe hat ihre eigene Erinnerung. Du kannst beim Erstellen oder Bearbeiten von Aufgaben individuelle Zeiten festlegen.',
      continue: 'Weiter zu Domani',
    },
  },
  planning: {
    header: {
      planningFor: 'Planung für',
    },
    reminder: {
      addReminder: 'Erinnerung hinzufügen',
      reminderOn: 'Erinnerung aktiviert',
      custom: 'Benutzerdefiniert',
      pastTimeWarning: 'Diese Zeit ist bereits vorbei — es wird keine Benachrichtigung gesendet',
    },
    rollover: {
      reminderTimes: 'Erinnerungszeiten',
      keepOriginalTimes: 'Ursprüngliche Zeiten beibehalten',
      setNewReminderTimes: 'Neue Erinnerungszeiten festlegen',
    },
  },
  settings: {
    reminderShortcuts: {
      title: 'Erinnerungs-Shortcuts',
      customizeTitle: 'Shortcuts anpassen',
      description:
        'Tippe, um die voreingestellten Zeiten zu ändern, die beim Hinzufügen von Erinnerungen angezeigt werden',
      shortcutLabel: 'Shortcut {{count}}',
    },
  },
  analytics: {
    completionRate: 'Erledigungsquote',
    tasksDone: '{{completed}} von {{total}} Aufgaben erledigt',
    lastNDays: 'Letzte {{count}} Tage',
    byCategory: 'Nach Kategorie',
    taskCount: '{{completed}}/{{total}} Aufgaben',
  },
  legal: {
    termsOfService: 'Nutzungsbedingungen',
    privacyPolicy: 'Datenschutzrichtlinie',
    footer: ['Indem du fortfährst, stimmst du unseren ', '{terms}', ' und ', '{privacy}'],
    unableToOpenLinkTitle: 'Link konnte nicht geöffnet werden',
    unableToOpenLinkMessage: 'Bitte versuche es später erneut.',
  },
  welcome: {
    taglinePrimary: 'Plane dein Morgen heute Abend.',
    taglineSecondary: 'Setze mit Fokus um.',
    startPlanning: 'Planung starten',
    returningCta: ['Du hast bereits ein Konto? ', '{signIn}'],
    signIn: 'Anmelden',
  },
  subscription: {
    preTrial: {
      title: 'Willkommen bei Domani',
      body:
        'Starte deine 14-tägige kostenlose Testphase, um alles zu entdecken, was Domani zu bieten hat. Zum Start ist keine Zahlung erforderlich — du entscheidest, ob und wann du upgraden möchtest.',
      startTrial: '14-tägige kostenlose Testphase starten',
      error: 'Deine kostenlose Testphase konnte nicht gestartet werden. Bitte versuche es erneut.',
      accountSettings: 'Kontoeinstellungen',
    },
    locked: {
      refundedTitle: 'Dein Zugriff wurde widerrufen',
      expiredTitle: 'Deine Testphase ist beendet',
      refundedBody:
        'Dein vorheriger Kauf wurde erstattet. Hol dir lebenslangen Zugriff, um Domani weiter zu nutzen.',
      expiredBody:
        'Hol dir lebenslangen Zugriff, um deine Tage weiter mit Domani zu planen — ein Kauf, für immer deins.',
      getLifetimeAccess: 'Lebenslangen Zugriff erhalten',
      restorePurchases: 'Käufe wiederherstellen',
      restoreNotFound: 'Für dieses Konto wurden keine früheren Käufe gefunden.',
      restoreError: 'Käufe konnten nicht wiederhergestellt werden. Bitte versuche es erneut.',
      accountSettings: 'Kontoeinstellungen',
    },
    paywall: {
      discountLabelEarlyAdopter: 'Early-Adopter-Preis',
      discountLabelFriendsFamily: 'Freunde-und-Familie-Preis',
      discountBadgeEarlyAdopter: '71 % Rabatt',
      discountBadgeFriendsFamily: '86 % Rabatt',
      valueProps: [
        'Unbegrenzte tägliche Aufgaben',
        'Plane morgen schon heute Abend',
        'Alle Funktionen, für immer',
        'Nie wieder Abos',
      ],
      successProps: [
        'Plane morgen schon heute Abend',
        'Kleine tägliche Erfolge schaffen dauerhafte Gewohnheiten',
        'Gemacht, um dich fokussiert zu halten, nicht beschäftigt',
        'Die Strategie, auf die Top-Performer schwören',
      ],
      successTitle: 'Alles erledigt!',
      successBody: 'Lebenslanger Zugriff freigeschaltet. Willkommen bei Domani.',
      successPrimaryCta: 'Planung starten',
      dismiss: 'Schließen',
      close: 'Schließen',
      title: 'Lebenslangen Zugriff erhalten',
      subtitle: 'Ein Kauf. Für immer deins.',
      purchaseCtaWithPrice: 'Lebenslangen Zugriff erhalten — {{price}}',
      purchaseCta: 'Lebenslangen Zugriff erhalten',
      purchaseErrorRetry: 'Beim Kauf ist etwas schiefgelaufen. Bitte versuche es erneut.',
      purchaseErrorSupport:
        'Das passiert weiterhin. Bitte kontaktiere den Support, wenn das Problem bestehen bleibt.',
      restoreNotFound: 'Für dieses Konto wurden keine früheren Käufe gefunden.',
      restoreError: 'Käufe konnten nicht wiederhergestellt werden. Bitte versuche es erneut.',
      contactSupport: 'Support kontaktieren',
      oneTimePurchaseNote: 'Einmaliger Kauf. Keine wiederkehrenden Kosten.',
      restorePurchases: 'Käufe wiederherstellen',
    },
    settings: {
      sectionTitle: 'Dein Plan',
      currentPlan: 'Aktueller Plan',
      statusBeta: 'Beta-Tester',
      statusGracePeriod: 'Beta-Nachfrist',
      statusPreTrial: 'Kein aktiver Plan',
      statusExpired: 'Testphase beendet',
      statusRefunded: 'Erstattet',
      statusTrialing: 'Testphase',
      statusLifetime: 'Lebenslang',
      betaBody:
        'Du hast während der Beta vollen Zugriff auf alles. Danke, dass du Domani testest!',
      gracePeriodOneDay: 'Noch 1 Tag in der Beta-Nachfrist',
      gracePeriodManyDays: 'Noch {{count}} Tage in der Beta-Nachfrist',
      gracePeriodBodyWithDate:
        'Dein kostenloser Beta-Zugang endet am {{date}}. Kaufe lebenslangen Zugriff, um Domani danach weiter zu nutzen.',
      gracePeriodBodyNoDate:
        'Dein kostenloser Beta-Zugang endet bald. Kaufe lebenslangen Zugriff, um Domani weiter zu nutzen.',
      preTrialBody: 'Entdecke alles, was Domani zu bieten hat',
      startTrial: '14-tägige kostenlose Testphase starten',
      expiredBody: 'Deine Testphase ist beendet — upgrade, um Domani weiter zu nutzen',
      refundedBody:
        'Dein Kauf wurde erstattet — hol dir lebenslangen Zugriff, um Domani weiter zu nutzen',
      trialingDaysRemaining: '{{count}} Tage in der Testphase verbleibend',
      trialingBodyWithDate: 'Unbegrenzte Aufgaben - Alle Funktionen bis {{date}} freigeschaltet',
      trialingBodyNoDate: 'Unbegrenzte Aufgaben - Alle Funktionen freigeschaltet',
      lifetimeBody: 'Unbegrenzte Aufgaben - Alle Funktionen für immer freigeschaltet',
      getLifetimeAccess: 'Lebenslangen Zugriff erhalten',
      restorePurchases: 'Käufe wiederherstellen',
    },
  },
}
