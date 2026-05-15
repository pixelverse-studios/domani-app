import type { BaseTranslationCatalog } from '../types'

export const sv: BaseTranslationCatalog = {
  common: {
    today: 'Idag',
    tomorrow: 'Imorgon',
    uncategorized: 'Utan kategori',
    custom: 'Anpassad',
    selectTime: 'Välj tid',
  },
  greetings: {
    morning: 'God morgon',
    afternoon: 'God eftermiddag',
    evening: 'God kväll',
  },
  categories: {
    system: {
      work: 'Arbete',
      personal: 'Personligt',
      wellness: 'Välmående',
      home: 'Hem',
    },
  },
  auth: {
    actions: {
      ok: 'OK',
      reactivate: 'Återaktivera',
      keepDeletion: 'Behåll borttagning',
    },
    errors: {
      signInTitle: 'Inloggningsfel',
      googleFallback: 'Det gick inte att logga in med Google',
      appleFallback: 'Det gick inte att logga in med Apple',
      accountExistsTitle: 'Kontot finns redan',
      accountExistsMessage: 'Det finns redan ett konto med den här e-postadressen.',
    },
    pendingDeletion: {
      title: 'Kontot är schemalagt för borttagning',
      message:
        'Ditt konto är schemalagt att tas bort den {{date}}. Vill du återaktivera det?',
    },
    login: {
      newUserEyebrow: 'Testa Domani gratis innan du köper',
      newUserTitle: 'Starta din kostnadsfria provperiod på 14 dagar',
      newUserSubtitle:
        'Full åtkomst först. Endast ett livstidsköp om du vill fortsätta.',
      stepStartLabel: 'Börja gratis idag',
      stepStartBody: 'Din fulla provperiod på 14 dagar börjar så snart du registrerar dig.',
      stepKeepLabelWithPrice: 'Behåll det för {{price}} en gång',
      stepKeepLabelFallback: 'Behåll det med ett engångsköp för livstid',
      stepKeepBody: 'Inget kreditkort i förväg. Ingen prenumeration efter provperioden.',
      returningEyebrow: 'Fortsätt där du slutade',
      returningTitle: 'Välkommen tillbaka',
      returningSubtitle: 'Logga in för att fortsätta planera din morgondag.',
      returningCardTitle: 'Dina planer väntar på dig.',
      returningCardBody: 'Logga in för att komma tillbaka till dina uppgifter, påminnelser och ditt momentum.',
      startTrialWithApple: 'Starta gratis provperiod med Apple',
      startTrialWithGoogle: 'Starta gratis provperiod med Google',
      continueWithApple: 'Fortsätt med Apple',
      continueWithGoogle: 'Fortsätt med Google',
      back: '← Tillbaka',
      trialConfirmEyebrow: 'Innan du fortsätter',
      trialConfirmTitle: 'Du startar en kostnadsfri provperiod på 14 dagar',
      trialConfirmBody:
        'När du fortsätter skapar du ditt konto och startar din kostnadsfria provperiod direkt.',
      trialConfirmPointTrial: 'Full åtkomst i 14 dagar',
      trialConfirmPointLifetimeWithPrice:
        'Sedan {{price}} en gång om du vill fortsätta med Domani',
      trialConfirmPointLifetimeFallback:
        'Sedan ett engångsköp för livstid om du vill fortsätta med Domani',
      trialConfirmPointNoCard: 'Inget kreditkort krävs i början',
      cancel: 'Avbryt',
    },
  },
  onboarding: {
    notificationSetup: {
      eyebrow: '14 dagars gratis provperiod',
      title: 'Din provperiod har startat',
      subtitle:
        'Utforska Domani med full åtkomst nu och bestäm senare om du vill ha livstidsåtkomst.',
      liveHeadline: 'Din provperiod med full åtkomst är aktiv nu',
      liveDetail: 'Ställ in din kvällspåminnelse och börja sedan planera morgondagen.',
      daysLeftHeadline: 'Du har {{count}} dagar kvar att utforska Domani',
      daysLeftDetail:
        'Din provperiod gäller till {{date}}. Ställ in din kvällspåminnelse och börja sedan planera morgondagen med full åtkomst.',
      oneDayHeadline: 'Du har 1 dag kvar av din provperiod',
      oneDayDetail:
        'Din provperiod gäller till {{date}}. Ställ in din kvällspåminnelse och få ut så mycket som möjligt av din sista hela dag med Domani.',
      endsTodayHeadline: 'Din provperiod slutar idag',
      endsTodayDetail:
        'Din provåtkomst gäller till {{date}}. Ställ in din kvällspåminnelse nu så att du inte missar din sista dag med full åtkomst.',
      planningReminderTitle: 'Planeringspåminnelse',
      planningReminderDescription: 'Välj när du vill bli påmind.',
      toggleLabel: 'Skicka mig en daglig påminnelse',
      taskRemindersTitle: 'Uppgiftspåminnelser',
      taskRemindersDescription:
        'Varje uppgift har sin egen påminnelse. Du kan ställa in individuella tider när du skapar eller redigerar uppgifter.',
      continue: 'Fortsätt till Domani',
    },
  },
  planning: {
    header: {
      planningFor: 'Planerar för',
    },
    reminder: {
      addReminder: 'Lägg till påminnelse',
      reminderOn: 'Påminnelse på',
      custom: 'Anpassad',
      pastTimeWarning: 'Den här tiden har redan passerat — ingen notis skickas',
    },
    rollover: {
      reminderTimes: 'Påminnelsetider',
      keepOriginalTimes: 'Behåll ursprungliga tider',
      setNewReminderTimes: 'Ställ in nya påminnelsetider',
    },
  },
  settings: {
    reminderShortcuts: {
      title: 'Påminelsegenvägar',
      customizeTitle: 'Anpassa genvägar',
      description:
        'Tryck för att ändra de förinställda tiderna som visas när du lägger till påminnelser',
      shortcutLabel: 'Genväg {{count}}',
    },
  },
  analytics: {
    completionRate: 'Slutförandegrad',
    tasksDone: '{{completed}} av {{total}} uppgifter klara',
    lastNDays: 'Senaste {{count}} dagarna',
    byCategory: 'Efter kategori',
    taskCount: '{{completed}}/{{total}} uppgifter',
  },
  legal: {
    termsOfService: 'Användarvillkor',
    privacyPolicy: 'Integritetspolicy',
    footer: ['Genom att fortsätta godkänner du våra ', '{terms}', ' och ', '{privacy}'],
    unableToOpenLinkTitle: 'Det gick inte att öppna länken',
    unableToOpenLinkMessage: 'Försök igen senare.',
  },
  welcome: {
    taglinePrimary: 'Planera din morgondag, ikväll.',
    taglineSecondary: 'Genomför med fokus.',
    startPlanning: 'Börja planera',
    returningCta: ['Har du redan ett konto? ', '{signIn}'],
    signIn: 'Logga in',
  },
  subscription: {
    preTrial: {
      title: 'Välkommen till Domani',
      body:
        'Starta din kostnadsfria provperiod på 14 dagar för att utforska allt Domani har att erbjuda. Ingen betalning krävs för att börja — du bestämmer om och när du vill uppgradera.',
      startTrial: 'Starta kostnadsfri provperiod på 14 dagar',
      error: 'Det gick inte att starta din kostnadsfria provperiod. Försök igen.',
      accountSettings: 'Kontoinställningar',
    },
    locked: {
      refundedTitle: 'Din åtkomst har återkallats',
      expiredTitle: 'Din provperiod har tagit slut',
      refundedBody:
        'Ditt tidigare köp återbetalades. Skaffa livstidsåtkomst för att fortsätta använda Domani.',
      expiredBody:
        'Skaffa livstidsåtkomst för att fortsätta planera dina dagar med Domani — ett köp, ditt för alltid.',
      getLifetimeAccess: 'Skaffa livstidsåtkomst',
      restorePurchases: 'Återställ köp',
      restoreNotFound: 'Inga tidigare köp hittades för detta konto.',
      restoreError: 'Det gick inte att återställa köp. Försök igen.',
      accountSettings: 'Kontoinställningar',
    },
    paywall: {
      discountLabelEarlyAdopter: 'Pris för tidiga användare',
      discountLabelFriendsFamily: 'Pris för vänner och familj',
      discountBadgeEarlyAdopter: '71 % rabatt',
      discountBadgeFriendsFamily: '86 % rabatt',
      valueProps: [
        'Obegränsade dagliga uppgifter',
        'Planera morgondagen, ikväll',
        'Alla funktioner, för alltid',
        'Inga prenumerationer, någonsin',
      ],
      successProps: [
        'Planera morgondagen, ikväll',
        'Små dagliga vinster bygger bestående vanor',
        'Byggd för att hålla dig fokuserad, inte upptagen',
        'Strategin som toppresterare svär vid',
      ],
      successTitle: 'Allt är klart!',
      successBody: 'Livstidsåtkomst upplåst. Välkommen till Domani.',
      successPrimaryCta: 'Börja planera',
      dismiss: 'Stäng',
      close: 'Stäng',
      title: 'Skaffa livstidsåtkomst',
      subtitle: 'Ett köp. Ditt för alltid.',
      purchaseCtaWithPrice: 'Skaffa livstidsåtkomst — {{price}}',
      purchaseCta: 'Skaffa livstidsåtkomst',
      purchaseErrorRetry: 'Något gick fel med ditt köp. Försök igen.',
      purchaseErrorSupport:
        'Det här fortsätter att hända. Kontakta support om problemet kvarstår.',
      restoreNotFound: 'Inga tidigare köp hittades för detta konto.',
      restoreError: 'Det gick inte att återställa köp. Försök igen.',
      contactSupport: 'Kontakta support',
      oneTimePurchaseNote: 'Engångsköp. Inga återkommande avgifter.',
      restorePurchases: 'Återställ köp',
    },
    settings: {
      sectionTitle: 'Din plan',
      currentPlan: 'Nuvarande plan',
      statusBeta: 'Betatestare',
      statusGracePeriod: 'Betaperiod',
      statusPreTrial: 'Ingen aktiv plan',
      statusExpired: 'Provperioden slut',
      statusRefunded: 'Återbetalad',
      statusTrialing: 'Provperiod',
      statusLifetime: 'Livstid',
      betaBody:
        'Du har full åtkomst till allt under betan. Tack för att du hjälper till att testa Domani!',
      gracePeriodOneDay: '1 dag kvar i betaperioden',
      gracePeriodManyDays: '{{count}} dagar kvar i betaperioden',
      gracePeriodBodyWithDate:
        'Din kostnadsfria betaåtkomst slutar den {{date}}. Köp livstidsåtkomst för att fortsätta använda Domani efter det.',
      gracePeriodBodyNoDate:
        'Din kostnadsfria betaåtkomst slutar snart. Köp livstidsåtkomst för att fortsätta använda Domani.',
      preTrialBody: 'Utforska allt Domani har att erbjuda',
      startTrial: 'Starta kostnadsfri provperiod på 14 dagar',
      expiredBody: 'Din provperiod är slut — uppgradera för att fortsätta använda Domani',
      refundedBody:
        'Ditt köp återbetalades — skaffa livstidsåtkomst för att fortsätta använda Domani',
      trialingDaysRemaining: '{{count}} dagar kvar i provperioden',
      trialingBodyWithDate: 'Obegränsade uppgifter - Alla funktioner upplåsta till {{date}}',
      trialingBodyNoDate: 'Obegränsade uppgifter - Alla funktioner upplåsta',
      lifetimeBody: 'Obegränsade uppgifter - Alla funktioner upplåsta för alltid',
      getLifetimeAccess: 'Skaffa livstidsåtkomst',
      restorePurchases: 'Återställ köp',
    },
  },
}
