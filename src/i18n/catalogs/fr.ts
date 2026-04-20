import type { TranslationCatalog } from '../types'

export const fr: TranslationCatalog = {
  common: {
    today: "Aujourd'hui",
    tomorrow: 'Demain',
    uncategorized: 'Sans catégorie',
    custom: 'Personnalisé',
    selectTime: "Choisir l'heure",
  },
  greetings: {
    morning: 'Bonjour',
    afternoon: 'Bon après-midi',
    evening: 'Bonsoir',
  },
  categories: {
    system: {
      work: 'Travail',
      personal: 'Personnel',
      wellness: 'Bien-être',
      home: 'Maison',
    },
  },
  auth: {
    actions: {
      ok: 'OK',
      reactivate: 'Réactiver',
      keepDeletion: 'Maintenir la suppression',
    },
    errors: {
      signInTitle: 'Erreur de connexion',
      googleFallback: 'Impossible de se connecter avec Google',
      appleFallback: "Impossible de se connecter avec Apple",
      accountExistsTitle: 'Le compte existe déjà',
      accountExistsMessage: 'Un compte avec cette adresse e-mail existe déjà.',
    },
    pendingDeletion: {
      title: 'Compte programmé pour suppression',
      message:
        'Votre compte est programmé pour être supprimé le {{date}}. Voulez-vous le réactiver ?',
    },
    login: {
      newUserEyebrow: 'Essayez Domani gratuitement avant de l’acheter',
      newUserTitle: 'Commencez votre essai gratuit de 14 jours',
      newUserSubtitle:
        "Accès complet d'abord. Un seul achat à vie si vous voulez continuer.",
      stepStartLabel: "Commencer gratuitement aujourd'hui",
      stepStartBody: 'Votre essai complet de 14 jours commence dès votre inscription.',
      stepKeepLabelWithPrice: 'Gardez-le pour {{price}} une seule fois',
      stepKeepLabelFallback: 'Gardez-le avec un achat unique à vie',
      stepKeepBody: 'Aucune carte bancaire requise au départ. Aucun abonnement après l’essai.',
      returningEyebrow: 'Reprenez là où vous vous êtes arrêté',
      returningTitle: 'Bon retour',
      returningSubtitle: 'Connectez-vous pour continuer à planifier votre demain.',
      returningCardTitle: 'Vos plans vous attendent.',
      returningCardBody: 'Connectez-vous pour retrouver vos tâches, rappels et votre élan.',
      startTrialWithApple: "Commencer l’essai gratuit avec Apple",
      startTrialWithGoogle: "Commencer l’essai gratuit avec Google",
      continueWithApple: 'Continuer avec Apple',
      continueWithGoogle: 'Continuer avec Google',
      back: '← Retour',
      trialConfirmEyebrow: 'Avant de continuer',
      trialConfirmTitle: 'Vous démarrez un essai gratuit de 14 jours',
      trialConfirmBody:
        'En continuant, vous créez votre compte et démarrez immédiatement votre essai gratuit.',
      trialConfirmPointTrial: 'Accès complet pendant 14 jours',
      trialConfirmPointLifetimeWithPrice:
        'Puis {{price}} une seule fois si vous voulez garder Domani',
      trialConfirmPointLifetimeFallback:
        'Puis un achat unique à vie si vous voulez garder Domani',
      trialConfirmPointNoCard: 'Aucune carte bancaire requise au départ',
      cancel: 'Annuler',
    },
  },
  onboarding: {
    notificationSetup: {
      eyebrow: 'Essai gratuit de 14 jours',
      title: 'Votre essai a commencé',
      subtitle:
        'Explorez Domani avec un accès complet maintenant, puis décidez plus tard si vous voulez un accès à vie.',
      liveHeadline: 'Votre essai avec accès complet est actif',
      liveDetail: 'Définissez votre rappel du soir, puis commencez à planifier demain.',
      daysLeftHeadline: 'Il vous reste {{count}} jours pour explorer Domani',
      daysLeftDetail:
        'Votre essai dure jusqu’au {{date}}. Définissez votre rappel du soir, puis commencez à planifier demain avec un accès complet.',
      oneDayHeadline: 'Il vous reste 1 jour dans votre essai',
      oneDayDetail:
        'Votre essai dure jusqu’au {{date}}. Définissez votre rappel du soir et profitez au maximum de votre dernière journée complète avec Domani.',
      endsTodayHeadline: 'Votre essai se termine aujourd’hui',
      endsTodayDetail:
        'Votre accès d’essai dure jusqu’au {{date}}. Définissez votre rappel du soir maintenant pour ne pas manquer votre dernière journée avec accès complet.',
      planningReminderTitle: 'Rappel de planification',
      planningReminderDescription: 'Choisissez quand vous souhaitez être rappelé.',
      toggleLabel: 'Envoyez-moi un rappel quotidien',
      taskRemindersTitle: 'Rappels de tâche',
      taskRemindersDescription:
        'Chaque tâche a son propre rappel. Vous pouvez définir des heures de rappel individuelles lors de la création ou de la modification des tâches.',
      continue: 'Continuer vers Domani',
    },
  },
  planning: {
    header: {
      planningFor: 'Planification pour',
    },
    reminder: {
      addReminder: 'Ajouter un rappel',
      reminderOn: 'Rappel activé',
      custom: 'Personnalisé',
      pastTimeWarning: "Cette heure est passée — aucune notification ne sera envoyée",
    },
    rollover: {
      reminderTimes: 'Heures de rappel',
      keepOriginalTimes: 'Conserver les heures d’origine',
      setNewReminderTimes: 'Définir de nouvelles heures de rappel',
    },
  },
  settings: {
    reminderShortcuts: {
      title: 'Raccourcis de rappel',
      customizeTitle: 'Personnaliser les raccourcis',
      description:
        'Touchez pour modifier les heures prédéfinies affichées lors de l’ajout de rappels',
      shortcutLabel: 'Raccourci {{count}}',
    },
  },
  analytics: {
    completionRate: 'Taux de réalisation',
    tasksDone: '{{completed}} tâches sur {{total}} terminées',
    lastNDays: '{{count}} derniers jours',
    byCategory: 'Par catégorie',
    taskCount: '{{completed}}/{{total}} tâches',
  },
  legal: {
    termsOfService: "Conditions d’utilisation",
    privacyPolicy: 'Politique de confidentialité',
    footer: ['En continuant, vous acceptez nos ', '{terms}', ' et notre ', '{privacy}'],
    unableToOpenLinkTitle: "Impossible d’ouvrir le lien",
    unableToOpenLinkMessage: 'Veuillez réessayer plus tard.',
  },
  welcome: {
    taglinePrimary: 'Planifiez votre demain, ce soir.',
    taglineSecondary: 'Exécutez avec concentration.',
    startPlanning: 'Commencer à planifier',
    returningCta: ['Vous avez déjà un compte ? ', '{signIn}'],
    signIn: 'Se connecter',
  },
  subscription: {
    preTrial: {
      title: 'Bienvenue sur Domani',
      body:
        'Commencez votre essai gratuit de 14 jours pour explorer tout ce que Domani a à offrir. Aucun paiement n’est nécessaire pour commencer — vous décidez si et quand passer à la version supérieure.',
      startTrial: 'Commencer l’essai gratuit de 14 jours',
      error: "Impossible de démarrer votre essai gratuit. Veuillez réessayer.",
      accountSettings: 'Paramètres du compte',
    },
    locked: {
      refundedTitle: 'Votre accès a été révoqué',
      expiredTitle: 'Votre essai est terminé',
      refundedBody:
        'Votre achat précédent a été remboursé. Obtenez un accès à vie pour continuer à utiliser Domani.',
      expiredBody:
        'Obtenez un accès à vie pour continuer à planifier vos journées avec Domani — un achat, à vous pour toujours.',
      getLifetimeAccess: 'Obtenir un accès à vie',
      restorePurchases: 'Restaurer les achats',
      restoreNotFound: 'Aucun achat précédent trouvé pour ce compte.',
      restoreError: 'Impossible de restaurer les achats. Veuillez réessayer.',
      accountSettings: 'Paramètres du compte',
    },
    paywall: {
      discountLabelEarlyAdopter: 'Tarif early adopter',
      discountLabelFriendsFamily: 'Tarif amis et famille',
      discountBadgeEarlyAdopter: '71 % de réduction',
      discountBadgeFriendsFamily: '86 % de réduction',
      valueProps: [
        'Tâches quotidiennes illimitées',
        'Planifiez demain, ce soir',
        'Toutes les fonctionnalités, pour toujours',
        'Aucun abonnement, jamais',
      ],
      successProps: [
        'Planifiez demain, ce soir',
        'Les petites victoires quotidiennes créent des habitudes durables',
        'Conçu pour vous garder concentré, pas occupé',
        'La stratégie à laquelle les meilleurs font confiance',
      ],
      successTitle: 'C’est prêt !',
      successBody: 'Accès à vie débloqué. Bienvenue sur Domani.',
      successPrimaryCta: 'Commencer à planifier',
      dismiss: 'Ignorer',
      close: 'Fermer',
      title: 'Obtenir un accès à vie',
      subtitle: 'Un achat. À vous pour toujours.',
      purchaseCtaWithPrice: 'Obtenir un accès à vie — {{price}}',
      purchaseCta: 'Obtenir un accès à vie',
      purchaseErrorRetry: 'Un problème est survenu avec votre achat. Veuillez réessayer.',
      purchaseErrorSupport:
        'Cela continue à se produire. Veuillez contacter le support si le problème persiste.',
      restoreNotFound: 'Aucun achat précédent trouvé pour ce compte.',
      restoreError: 'Impossible de restaurer les achats. Veuillez réessayer.',
      contactSupport: 'Contacter le support',
      oneTimePurchaseNote: 'Achat unique. Aucun frais récurrent.',
      restorePurchases: 'Restaurer les achats',
    },
    settings: {
      sectionTitle: 'Votre forfait',
      currentPlan: 'Forfait actuel',
      statusBeta: 'Bêta-testeur',
      statusGracePeriod: 'Période bêta',
      statusPreTrial: 'Aucun forfait actif',
      statusExpired: 'Essai terminé',
      statusRefunded: 'Remboursé',
      statusTrialing: 'Essai',
      statusLifetime: 'À vie',
      betaBody:
        'Vous avez un accès complet à tout pendant la bêta. Merci de nous aider à tester Domani !',
      gracePeriodOneDay: '1 jour restant dans la période bêta',
      gracePeriodManyDays: '{{count}} jours restants dans la période bêta',
      gracePeriodBodyWithDate:
        'Votre accès bêta gratuit se termine le {{date}}. Achetez un accès à vie pour continuer à utiliser Domani après cela.',
      gracePeriodBodyNoDate:
        'Votre accès bêta gratuit se termine bientôt. Achetez un accès à vie pour continuer à utiliser Domani.',
      preTrialBody: 'Explorez tout ce que Domani a à offrir',
      startTrial: 'Commencer l’essai gratuit de 14 jours',
      expiredBody: 'Votre essai est terminé — passez à la version supérieure pour continuer à utiliser Domani',
      refundedBody:
        'Votre achat a été remboursé — obtenez un accès à vie pour continuer à utiliser Domani',
      trialingDaysRemaining: '{{count}} jours restants dans l’essai',
      trialingBodyWithDate: 'Tâches illimitées - Toutes les fonctionnalités débloquées jusqu’au {{date}}',
      trialingBodyNoDate: 'Tâches illimitées - Toutes les fonctionnalités débloquées',
      lifetimeBody: 'Tâches illimitées - Toutes les fonctionnalités débloquées pour toujours',
      getLifetimeAccess: 'Obtenir un accès à vie',
      restorePurchases: 'Restaurer les achats',
    },
  },
}
