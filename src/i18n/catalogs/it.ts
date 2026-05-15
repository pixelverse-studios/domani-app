import type { BaseTranslationCatalog } from '../types'

export const it: BaseTranslationCatalog = {
  common: {
    today: 'Oggi',
    tomorrow: 'Domani',
    uncategorized: 'Senza categoria',
    custom: 'Personalizzato',
    selectTime: 'Seleziona orario',
  },
  greetings: {
    morning: 'Buongiorno',
    afternoon: 'Buon pomeriggio',
    evening: 'Buonasera',
  },
  categories: {
    system: {
      work: 'Lavoro',
      personal: 'Personale',
      wellness: 'Benessere',
      home: 'Casa',
    },
  },
  auth: {
    actions: {
      ok: 'OK',
      reactivate: 'Riattiva',
      keepDeletion: 'Mantieni eliminazione',
    },
    errors: {
      signInTitle: 'Errore di accesso',
      googleFallback: 'Accesso con Google non riuscito',
      appleFallback: 'Accesso con Apple non riuscito',
      accountExistsTitle: "L'account esiste già",
      accountExistsMessage: 'Esiste già un account con questa e-mail.',
    },
    pendingDeletion: {
      title: 'Account programmato per l’eliminazione',
      message:
        'Il tuo account è programmato per essere eliminato il {{date}}. Vuoi riattivarlo?',
    },
    login: {
      newUserEyebrow: 'Prova Domani gratis prima di acquistarlo',
      newUserTitle: 'Inizia la tua prova gratuita di 14 giorni',
      newUserSubtitle:
        'Prima accesso completo. Un solo acquisto a vita solo se vuoi continuare.',
      stepStartLabel: 'Inizia gratis oggi',
      stepStartBody: 'La tua prova completa di 14 giorni inizia non appena ti registri.',
      stepKeepLabelWithPrice: 'Tienilo per {{price}} una sola volta',
      stepKeepLabelFallback: 'Tienilo con un acquisto singolo a vita',
      stepKeepBody: 'Nessuna carta di credito in anticipo. Nessun abbonamento dopo la prova.',
      returningEyebrow: 'Riprendi da dove avevi lasciato',
      returningTitle: 'Bentornato',
      returningSubtitle: 'Accedi per continuare a pianificare il tuo domani.',
      returningCardTitle: 'I tuoi piani ti aspettano.',
      returningCardBody: 'Accedi per tornare alle tue attività, ai promemoria e al tuo slancio.',
      startTrialWithApple: 'Avvia prova gratuita con Apple',
      startTrialWithGoogle: 'Avvia prova gratuita con Google',
      continueWithApple: 'Continua con Apple',
      continueWithGoogle: 'Continua con Google',
      back: '← Indietro',
      trialConfirmEyebrow: 'Prima di continuare',
      trialConfirmTitle: 'Stai iniziando una prova gratuita di 14 giorni',
      trialConfirmBody:
        'Continuando, creerai il tuo account e inizierai subito la prova gratuita.',
      trialConfirmPointTrial: 'Accesso completo per 14 giorni',
      trialConfirmPointLifetimeWithPrice:
        'Poi {{price}} una sola volta se vuoi continuare con Domani',
      trialConfirmPointLifetimeFallback:
        'Poi un acquisto singolo a vita se vuoi continuare con Domani',
      trialConfirmPointNoCard: 'Nessuna carta di credito richiesta all’inizio',
      cancel: 'Annulla',
    },
  },
  onboarding: {
    notificationSetup: {
      eyebrow: 'Prova gratuita di 14 giorni',
      title: 'La tua prova è iniziata',
      subtitle:
        'Esplora Domani con accesso completo ora e decidi più tardi se vuoi l’accesso a vita.',
      liveHeadline: 'La tua prova con accesso completo è attiva ora',
      liveDetail: 'Imposta il promemoria serale, poi inizia a pianificare il domani.',
      daysLeftHeadline: 'Hai {{count}} giorni per esplorare Domani',
      daysLeftDetail:
        'La tua prova dura fino al {{date}}. Imposta il promemoria serale, poi inizia a pianificare il domani con accesso completo.',
      oneDayHeadline: 'Ti resta 1 giorno di prova',
      oneDayDetail:
        'La tua prova dura fino al {{date}}. Imposta il promemoria serale e sfrutta al massimo il tuo ultimo giorno completo con Domani.',
      endsTodayHeadline: 'La tua prova termina oggi',
      endsTodayDetail:
        'Il tuo accesso di prova dura fino al {{date}}. Imposta subito il promemoria serale per non perdere il tuo ultimo giorno con accesso completo.',
      planningReminderTitle: 'Promemoria di pianificazione',
      planningReminderDescription: 'Scegli quando vuoi ricevere il promemoria.',
      toggleLabel: 'Inviami un promemoria giornaliero',
      taskRemindersTitle: 'Promemoria attività',
      taskRemindersDescription:
        'Ogni attività ha il suo promemoria. Puoi impostare orari individuali quando crei o modifichi le attività.',
      continue: 'Continua su Domani',
    },
  },
  planning: {
    header: {
      planningFor: 'Pianificazione per',
    },
    reminder: {
      addReminder: 'Aggiungi promemoria',
      reminderOn: 'Promemoria attivo',
      custom: 'Personalizzato',
      pastTimeWarning: 'Questo orario è già passato — non verrà inviata alcuna notifica',
    },
    rollover: {
      reminderTimes: 'Orari dei promemoria',
      keepOriginalTimes: 'Mantieni orari originali',
      setNewReminderTimes: 'Imposta nuovi orari dei promemoria',
    },
  },
  settings: {
    reminderShortcuts: {
      title: 'Scorciatoie promemoria',
      customizeTitle: 'Personalizza scorciatoie',
      description:
        'Tocca per cambiare gli orari preimpostati mostrati quando aggiungi promemoria',
      shortcutLabel: 'Scorciatoia {{count}}',
    },
  },
  analytics: {
    completionRate: 'Tasso di completamento',
    tasksDone: '{{completed}} attività su {{total}} completate',
    lastNDays: 'Ultimi {{count}} giorni',
    byCategory: 'Per categoria',
    taskCount: '{{completed}}/{{total}} attività',
  },
  legal: {
    termsOfService: 'Termini di servizio',
    privacyPolicy: 'Informativa sulla privacy',
    footer: ['Continuando, accetti i nostri ', '{terms}', ' e ', '{privacy}'],
    unableToOpenLinkTitle: 'Impossibile aprire il link',
    unableToOpenLinkMessage: 'Riprova più tardi.',
  },
  welcome: {
    taglinePrimary: 'Pianifica il tuo domani, stasera.',
    taglineSecondary: 'Esegui con concentrazione.',
    startPlanning: 'Inizia a pianificare',
    returningCta: ['Hai già un account? ', '{signIn}'],
    signIn: 'Accedi',
  },
  subscription: {
    preTrial: {
      title: 'Benvenuto su Domani',
      body:
        'Inizia la tua prova gratuita di 14 giorni per esplorare tutto ciò che Domani ha da offrire. Nessun pagamento richiesto per iniziare: decidi tu se e quando fare l’upgrade.',
      startTrial: 'Avvia prova gratuita di 14 giorni',
      error: 'Impossibile avviare la prova gratuita. Riprova.',
      accountSettings: 'Impostazioni account',
    },
    locked: {
      refundedTitle: 'Il tuo accesso è stato revocato',
      expiredTitle: 'La tua prova è terminata',
      refundedBody:
        'Il tuo acquisto precedente è stato rimborsato. Ottieni l’accesso a vita per continuare a usare Domani.',
      expiredBody:
        'Ottieni l’accesso a vita per continuare a pianificare le tue giornate con Domani — un acquisto, tuo per sempre.',
      getLifetimeAccess: 'Ottieni accesso a vita',
      restorePurchases: 'Ripristina acquisti',
      restoreNotFound: 'Nessun acquisto precedente trovato per questo account.',
      restoreError: 'Impossibile ripristinare gli acquisti. Riprova.',
      accountSettings: 'Impostazioni account',
    },
    paywall: {
      discountLabelEarlyAdopter: 'Prezzo early adopter',
      discountLabelFriendsFamily: 'Prezzo amici e famiglia',
      discountBadgeEarlyAdopter: '71% di sconto',
      discountBadgeFriendsFamily: '86% di sconto',
      valueProps: [
        'Attività giornaliere illimitate',
        'Pianifica il domani, stasera',
        'Tutte le funzioni, per sempre',
        'Nessun abbonamento, mai',
      ],
      successProps: [
        'Pianifica il domani, stasera',
        'Le piccole vittorie quotidiane costruiscono abitudini durature',
        'Creato per mantenerti concentrato, non occupato',
        'La strategia su cui giurano i migliori',
      ],
      successTitle: 'È tutto pronto!',
      successBody: 'Accesso a vita sbloccato. Benvenuto su Domani.',
      successPrimaryCta: 'Inizia a pianificare',
      dismiss: 'Chiudi',
      close: 'Chiudi',
      title: 'Ottieni accesso a vita',
      subtitle: 'Un acquisto. Tuo per sempre.',
      purchaseCtaWithPrice: 'Ottieni accesso a vita — {{price}}',
      purchaseCta: 'Ottieni accesso a vita',
      purchaseErrorRetry: 'Qualcosa è andato storto con il tuo acquisto. Riprova.',
      purchaseErrorSupport:
        'Continua a succedere. Contatta il supporto se il problema persiste.',
      restoreNotFound: 'Nessun acquisto precedente trovato per questo account.',
      restoreError: 'Impossibile ripristinare gli acquisti. Riprova.',
      contactSupport: 'Contatta il supporto',
      oneTimePurchaseNote: 'Acquisto una tantum. Nessun addebito ricorrente.',
      restorePurchases: 'Ripristina acquisti',
    },
    settings: {
      sectionTitle: 'Il tuo piano',
      currentPlan: 'Piano attuale',
      statusBeta: 'Beta tester',
      statusGracePeriod: 'Periodo beta',
      statusPreTrial: 'Nessun piano attivo',
      statusExpired: 'Prova terminata',
      statusRefunded: 'Rimborsato',
      statusTrialing: 'Prova',
      statusLifetime: 'A vita',
      betaBody:
        'Hai accesso completo a tutto durante la beta. Grazie per aver aiutato a testare Domani!',
      gracePeriodOneDay: '1 giorno rimasto nel periodo beta',
      gracePeriodManyDays: '{{count}} giorni rimasti nel periodo beta',
      gracePeriodBodyWithDate:
        'Il tuo accesso beta gratuito termina il {{date}}. Acquista l’accesso a vita per continuare a usare Domani dopo quella data.',
      gracePeriodBodyNoDate:
        'Il tuo accesso beta gratuito sta per terminare. Acquista l’accesso a vita per continuare a usare Domani.',
      preTrialBody: 'Esplora tutto ciò che Domani ha da offrire',
      startTrial: 'Avvia prova gratuita di 14 giorni',
      expiredBody: 'La tua prova è terminata — fai l’upgrade per continuare a usare Domani',
      refundedBody:
        'Il tuo acquisto è stato rimborsato — ottieni l’accesso a vita per continuare a usare Domani',
      trialingDaysRemaining: '{{count}} giorni rimasti di prova',
      trialingBodyWithDate: 'Attività illimitate - Tutte le funzioni sbloccate fino al {{date}}',
      trialingBodyNoDate: 'Attività illimitate - Tutte le funzioni sbloccate',
      lifetimeBody: 'Attività illimitate - Tutte le funzioni sbloccate per sempre',
      getLifetimeAccess: 'Ottieni accesso a vita',
      restorePurchases: 'Ripristina acquisti',
    },
  },
}
