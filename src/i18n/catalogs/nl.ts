import type { TranslationCatalog } from '../types'

export const nl: TranslationCatalog = {
  common: {
    today: 'Vandaag',
    tomorrow: 'Morgen',
    uncategorized: 'Zonder categorie',
    custom: 'Aangepast',
    selectTime: 'Tijd selecteren',
  },
  greetings: {
    morning: 'Goedemorgen',
    afternoon: 'Goedemiddag',
    evening: 'Goedenavond',
  },
  categories: {
    system: {
      work: 'Werk',
      personal: 'Persoonlijk',
      wellness: 'Welzijn',
      home: 'Thuis',
    },
  },
  auth: {
    actions: {
      ok: 'OK',
      reactivate: 'Opnieuw activeren',
      keepDeletion: 'Verwijdering behouden',
    },
    errors: {
      signInTitle: 'Aanmeldfout',
      googleFallback: 'Inloggen met Google is mislukt',
      appleFallback: 'Inloggen met Apple is mislukt',
      accountExistsTitle: 'Account bestaat al',
      accountExistsMessage: 'Er bestaat al een account met dit e-mailadres.',
    },
    pendingDeletion: {
      title: 'Account gepland voor verwijdering',
      message:
        'Je account staat gepland om te worden verwijderd op {{date}}. Wil je het opnieuw activeren?',
    },
    login: {
      newUserEyebrow: 'Probeer Domani gratis voordat je het koopt',
      newUserTitle: 'Start je gratis proefperiode van 14 dagen',
      newUserSubtitle:
        'Eerst volledige toegang. Slechts één levenslange aankoop als je wilt blijven.',
      stepStartLabel: 'Begin vandaag gratis',
      stepStartBody: 'Je volledige proefperiode van 14 dagen begint zodra je je aanmeldt.',
      stepKeepLabelWithPrice: 'Behoud het voor {{price}} eenmalig',
      stepKeepLabelFallback: 'Behoud het met een eenmalige levenslange aankoop',
      stepKeepBody: 'Geen creditcard vooraf. Geen abonnement na de proefperiode.',
      returningEyebrow: 'Ga verder waar je gebleven was',
      returningTitle: 'Welkom terug',
      returningSubtitle: 'Meld je aan om verder te gaan met het plannen van morgen.',
      returningCardTitle: 'Je plannen wachten op je.',
      returningCardBody: 'Meld je aan om terug te gaan naar je taken, herinneringen en momentum.',
      startTrialWithApple: 'Start gratis proefperiode met Apple',
      startTrialWithGoogle: 'Start gratis proefperiode met Google',
      continueWithApple: 'Ga verder met Apple',
      continueWithGoogle: 'Ga verder met Google',
      back: '← Terug',
      trialConfirmEyebrow: 'Voordat je verdergaat',
      trialConfirmTitle: 'Je start een gratis proefperiode van 14 dagen',
      trialConfirmBody:
        'Door verder te gaan maak je je account aan en start je direct je gratis proefperiode.',
      trialConfirmPointTrial: 'Volledige toegang voor 14 dagen',
      trialConfirmPointLifetimeWithPrice:
        'Daarna {{price}} eenmalig als je Domani wilt behouden',
      trialConfirmPointLifetimeFallback:
        'Daarna een eenmalige levenslange aankoop als je Domani wilt behouden',
      trialConfirmPointNoCard: 'Geen creditcard vooraf vereist',
      cancel: 'Annuleren',
    },
  },
  onboarding: {
    notificationSetup: {
      eyebrow: 'Gratis proefperiode van 14 dagen',
      title: 'Je proefperiode is gestart',
      subtitle:
        'Ontdek Domani nu met volledige toegang en beslis later of je levenslange toegang wilt.',
      liveHeadline: 'Je proefperiode met volledige toegang is nu actief',
      liveDetail: 'Stel je avondherinnering in en begin daarna met het plannen van morgen.',
      daysLeftHeadline: 'Je hebt nog {{count}} dagen om Domani te ontdekken',
      daysLeftDetail:
        'Je proefperiode loopt tot {{date}}. Stel je avondherinnering in en begin daarna met volledige toegang aan morgen.',
      oneDayHeadline: 'Je hebt nog 1 dag over in je proefperiode',
      oneDayDetail:
        'Je proefperiode loopt tot {{date}}. Stel je avondherinnering in en haal het meeste uit je laatste volledige dag met Domani.',
      endsTodayHeadline: 'Je proefperiode eindigt vandaag',
      endsTodayDetail:
        'Je proefperiode loopt tot {{date}}. Stel nu je avondherinnering in zodat je je laatste dag met volledige toegang niet mist.',
      planningReminderTitle: 'Planningsherinnering',
      planningReminderDescription: 'Kies wanneer je herinnerd wilt worden.',
      toggleLabel: 'Stuur me dagelijks een herinnering',
      taskRemindersTitle: 'Taakherinneringen',
      taskRemindersDescription:
        'Elke taak heeft zijn eigen herinnering. Je kunt individuele tijden instellen bij het maken of bewerken van taken.',
      continue: 'Doorgaan naar Domani',
    },
  },
  planning: {
    header: {
      planningFor: 'Plannen voor',
    },
    reminder: {
      addReminder: 'Herinnering toevoegen',
      reminderOn: 'Herinnering aan',
      custom: 'Aangepast',
      pastTimeWarning: 'Deze tijd is verstreken — er wordt geen melding verzonden',
    },
    rollover: {
      reminderTimes: 'Herinneringstijden',
      keepOriginalTimes: 'Originele tijden behouden',
      setNewReminderTimes: 'Nieuwe herinneringstijden instellen',
    },
  },
  settings: {
    reminderShortcuts: {
      title: 'Herinneringssnelkoppelingen',
      customizeTitle: 'Snelkoppelingen aanpassen',
      description:
        'Tik om de standaardtijden te wijzigen die worden getoond bij het toevoegen van herinneringen',
      shortcutLabel: 'Snelkoppeling {{count}}',
    },
  },
  analytics: {
    completionRate: 'Voltooiingspercentage',
    tasksDone: '{{completed}} van {{total}} taken voltooid',
    lastNDays: 'Afgelopen {{count}} dagen',
    byCategory: 'Per categorie',
    taskCount: '{{completed}}/{{total}} taken',
  },
  legal: {
    termsOfService: 'Servicevoorwaarden',
    privacyPolicy: 'Privacybeleid',
    footer: ['Door verder te gaan ga je akkoord met onze ', '{terms}', ' en ', '{privacy}'],
    unableToOpenLinkTitle: 'Kan link niet openen',
    unableToOpenLinkMessage: 'Probeer het later opnieuw.',
  },
  welcome: {
    taglinePrimary: 'Plan je morgen, vanavond.',
    taglineSecondary: 'Voer uit met focus.',
    startPlanning: 'Begin met plannen',
    returningCta: ['Heb je al een account? ', '{signIn}'],
    signIn: 'Inloggen',
  },
  subscription: {
    preTrial: {
      title: 'Welkom bij Domani',
      body:
        'Start je gratis proefperiode van 14 dagen om alles te ontdekken wat Domani te bieden heeft. Er is geen betaling nodig om te beginnen — jij beslist of en wanneer je wilt upgraden.',
      startTrial: 'Gratis proefperiode van 14 dagen starten',
      error: 'Je gratis proefperiode kon niet worden gestart. Probeer het opnieuw.',
      accountSettings: 'Accountinstellingen',
    },
    locked: {
      refundedTitle: 'Je toegang is ingetrokken',
      expiredTitle: 'Je proefperiode is afgelopen',
      refundedBody:
        'Je eerdere aankoop is terugbetaald. Neem levenslange toegang om Domani te blijven gebruiken.',
      expiredBody:
        'Neem levenslange toegang om je dagen te blijven plannen met Domani — één aankoop, voor altijd van jou.',
      getLifetimeAccess: 'Levenslange toegang krijgen',
      restorePurchases: 'Aankopen herstellen',
      restoreNotFound: 'Geen eerdere aankopen gevonden voor dit account.',
      restoreError: 'Aankopen konden niet worden hersteld. Probeer het opnieuw.',
      accountSettings: 'Accountinstellingen',
    },
    paywall: {
      discountLabelEarlyAdopter: 'Prijs voor vroege gebruikers',
      discountLabelFriendsFamily: 'Vrienden- en familieprijs',
      discountBadgeEarlyAdopter: '71% korting',
      discountBadgeFriendsFamily: '86% korting',
      valueProps: [
        'Onbeperkte dagelijkse taken',
        'Plan morgen, vanavond',
        'Alle functies, voor altijd',
        'Nooit abonnementen',
      ],
      successProps: [
        'Plan morgen, vanavond',
        'Kleine dagelijkse overwinningen bouwen blijvende gewoonten op',
        'Gemaakt om je gefocust te houden, niet bezig',
        'De strategie waar toppresteerders op vertrouwen',
      ],
      successTitle: 'Je bent helemaal klaar!',
      successBody: 'Levenslange toegang ontgrendeld. Welkom bij Domani.',
      successPrimaryCta: 'Begin met plannen',
      dismiss: 'Sluiten',
      close: 'Sluiten',
      title: 'Levenslange toegang krijgen',
      subtitle: 'Eén aankoop. Voor altijd van jou.',
      purchaseCtaWithPrice: 'Levenslange toegang krijgen — {{price}}',
      purchaseCta: 'Levenslange toegang krijgen',
      purchaseErrorRetry: 'Er ging iets mis met je aankoop. Probeer het opnieuw.',
      purchaseErrorSupport:
        'Dit blijft gebeuren. Neem contact op met ondersteuning als het probleem aanhoudt.',
      restoreNotFound: 'Geen eerdere aankopen gevonden voor dit account.',
      restoreError: 'Aankopen konden niet worden hersteld. Probeer het opnieuw.',
      contactSupport: 'Contact opnemen met ondersteuning',
      oneTimePurchaseNote: 'Eenmalige aankoop. Geen terugkerende kosten.',
      restorePurchases: 'Aankopen herstellen',
    },
    settings: {
      sectionTitle: 'Je plan',
      currentPlan: 'Huidig plan',
      statusBeta: 'Bèta-tester',
      statusGracePeriod: 'Bèta-verlenging',
      statusPreTrial: 'Geen actief plan',
      statusExpired: 'Proefperiode afgelopen',
      statusRefunded: 'Terugbetaald',
      statusTrialing: 'Proefperiode',
      statusLifetime: 'Levenslang',
      betaBody:
        'Je hebt volledige toegang tot alles tijdens de bèta. Bedankt voor het helpen testen van Domani!',
      gracePeriodOneDay: 'Nog 1 dag over in de bèta-verlenging',
      gracePeriodManyDays: 'Nog {{count}} dagen over in de bèta-verlenging',
      gracePeriodBodyWithDate:
        'Je gratis bètatoegang eindigt op {{date}}. Koop levenslange toegang om Domani daarna te blijven gebruiken.',
      gracePeriodBodyNoDate:
        'Je gratis bètatoegang eindigt binnenkort. Koop levenslange toegang om Domani te blijven gebruiken.',
      preTrialBody: 'Ontdek alles wat Domani te bieden heeft',
      startTrial: 'Gratis proefperiode van 14 dagen starten',
      expiredBody: 'Je proefperiode is afgelopen — upgrade om Domani te blijven gebruiken',
      refundedBody:
        'Je aankoop is terugbetaald — neem levenslange toegang om Domani te blijven gebruiken',
      trialingDaysRemaining: '{{count}} dagen over in de proefperiode',
      trialingBodyWithDate: 'Onbeperkte taken - Alle functies ontgrendeld tot {{date}}',
      trialingBodyNoDate: 'Onbeperkte taken - Alle functies ontgrendeld',
      lifetimeBody: 'Onbeperkte taken - Alle functies voor altijd ontgrendeld',
      getLifetimeAccess: 'Levenslange toegang krijgen',
      restorePurchases: 'Aankopen herstellen',
    },
  },
}
