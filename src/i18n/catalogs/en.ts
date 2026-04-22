export const en = {
  auth: {
    actions: {
      ok: 'OK',
      reactivate: 'Reactivate',
      keepDeletion: 'Keep Deletion',
    },
    errors: {
      signInTitle: 'Sign In Error',
      googleFallback: 'Failed to sign in with Google',
      appleFallback: 'Failed to sign in with Apple',
      accountExistsTitle: 'Account Already Exists',
      accountExistsMessage: 'An account with this email already exists.',
    },
    pendingDeletion: {
      title: 'Account Scheduled for Deletion',
      message:
        'Your account is scheduled to be deleted on {{date}}. Would you like to reactivate it?',
    },
    login: {
      newUserEyebrow: 'Try Domani free before you buy it',
      newUserTitle: 'Start your 14-day free trial',
      newUserSubtitle: 'Full access first. One lifetime purchase only if you want to keep it.',
      stepStartLabel: 'Start free today',
      stepStartBody: 'Your full 14-day trial begins as soon as you sign up.',
      stepKeepLabelWithPrice: 'Keep it for {{price}} once',
      stepKeepLabelFallback: 'Keep it with one lifetime purchase',
      stepKeepBody: 'No credit card up front. No subscription after the trial.',
      returningEyebrow: 'Pick up where you left off',
      returningTitle: 'Welcome Back',
      returningSubtitle: 'Sign in to continue planning your tomorrow.',
      returningCardTitle: 'Your plans are waiting for you.',
      returningCardBody: 'Sign in to get back to your tasks, reminders, and momentum.',
      startTrialWithApple: 'Start Free Trial with Apple',
      startTrialWithGoogle: 'Start Free Trial with Google',
      continueWithApple: 'Continue with Apple',
      continueWithGoogle: 'Continue with Google',
      back: '← Back',
      trialConfirmEyebrow: 'Before you continue',
      trialConfirmTitle: 'You’re starting a 14-day free trial',
      trialConfirmBody:
        'By continuing, you’re creating your account and starting your free trial right away.',
      trialConfirmPointTrial: 'Full access for 14 days',
      trialConfirmPointLifetimeWithPrice: 'Then {{price}} one time if you want to keep Domani',
      trialConfirmPointLifetimeFallback: 'Then one lifetime purchase if you want to keep Domani',
      trialConfirmPointNoCard: 'No credit card required up front',
      cancel: 'Cancel',
    },
  },
  onboarding: {
    notificationSetup: {
      eyebrow: '14-day free trial',
      title: 'Your trial has started',
      subtitle: 'Everything is unlocked. Explore freely for 14 days, then decide.',
      planningReminderTitle: 'Remind me to plan',
      planningReminderDescription: 'Choose when you want to be reminded.',
      toggleLabel: 'Remind me to plan',
      taskRemindersTitle: 'Task Reminders',
      taskRemindersDescription:
        'Set individual reminders on each task when creating or editing.',
      continue: 'Continue to Domani',
    },
  },
  legal: {
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    footer: ['By continuing, you agree to our ', '{terms}', ' and ', '{privacy}'],
    unableToOpenLinkTitle: 'Unable to open link',
    unableToOpenLinkMessage: 'Please try again later.',
  },
  welcome: {
    taglinePrimary: 'Plan your tomorrow, tonight.',
    taglineSecondary: 'Execute with focus.',
    startPlanning: 'Start Planning',
    returningCta: ['Already have an account? ', '{signIn}'],
    signIn: 'Sign in',
  },
  subscription: {
    preTrial: {
      title: 'Welcome to Domani',
      body: 'Start your 14-day free trial to explore everything Domani has to offer. No payment required to begin — you decide if and when to upgrade.',
      startTrial: 'Start 14-Day Free Trial',
      error: 'Could not start your free trial. Please try again.',
      accountSettings: 'Account Settings',
    },
    locked: {
      refundedTitle: 'Your access has been revoked',
      expiredTitle: 'Your trial has ended',
      refundedBody:
        'Your previous purchase was refunded. Get lifetime access to continue using Domani.',
      expiredBody:
        'Get lifetime access to keep planning your days with Domani — one purchase, yours forever.',
      getLifetimeAccess: 'Get Lifetime Access',
      restorePurchases: 'Restore Purchases',
      restoreNotFound: 'No previous purchases found for this account.',
      restoreError: 'Could not restore purchases. Please try again.',
      accountSettings: 'Account Settings',
    },
    paywall: {
      discountLabelEarlyAdopter: 'Early adopter pricing',
      discountLabelFriendsFamily: 'Friends & family pricing',
      discountBadgeEarlyAdopter: '71% off',
      discountBadgeFriendsFamily: '86% off',
      valueProps: [
        'Unlimited daily tasks',
        'Evening planning, morning clarity.',
        'All features, forever',
        'No subscriptions, ever',
      ],
      successProps: [
        'Small daily wins build lasting habits',
        'Built to keep you focused, not busy',
        'The strategy top performers swear by',
      ],
      successTitle: 'You’re All Set!',
      successBodyLine1: 'Lifetime access unlocked.',
      successBodyWelcomePrefix: 'Welcome to ',
      successPrimaryCta: 'Start Planning',
      dismiss: 'Dismiss',
      close: 'Close',
      title: 'Get Lifetime Access',
      subtitle: 'One purchase. Yours forever.',
      purchaseCtaWithPrice: 'Get Lifetime Access — {{price}}',
      purchaseCta: 'Get Lifetime Access',
      purchaseErrorRetry: 'Something went wrong with your purchase. Please try again.',
      purchaseErrorSupport: 'This keeps happening. Please contact support if the issue persists.',
      restoreNotFound: 'No previous purchases found for this account.',
      restoreError: 'Could not restore purchases. Please try again.',
      contactSupport: 'Contact Support',
      oneTimePurchaseNote: 'One-time purchase. No recurring charges.',
      restorePurchases: 'Restore Purchases',
    },
    purchaseHelp: {
      title: 'Purchase Help',
      subtitle:
        'Get to the right next step for refunds, restores, and billing questions from one shared Domani screen.',
      iosEyebrow: 'Apple Purchase',
      iosTitle: 'Looking for a refund?',
      iosBody:
        'Refunds for iPhone purchases are handled by Apple. We can take you straight into Apple’s refund flow for your Domani purchase.',
      iosUnavailableBody:
        'We could not find an active Apple purchase on this device or account to submit for refund right now.',
      iosNoteTitle: 'What happens next',
      iosNoteBody:
        'Apple reviews refund requests directly. Approval is not instant, and they typically follow up later with the decision.',
      iosUnavailableNoteTitle: 'Refund request unavailable',
      iosUnavailableNoteBody:
        'This usually means there is no active App Store purchase currently linked for this account or device. Support can help you sort out the purchase state.',
      iosRefundCta: 'Request Refund',
      iosSupportBody:
        'Use support if the Apple refund sheet does not open or your purchase situation looks incorrect.',
      iosUnavailableSupportBody:
        'Contact support if this account should have an active Apple purchase or you need help re-linking the right purchase state.',
      iosRefundSuccessTitle: 'Refund request opened',
      iosRefundSuccessBody:
        'Apple is now handling your refund request. They will review it and follow up with the result.',
      iosSubmittedTitle: 'Refund request submitted',
      iosSubmittedBody:
        'Apple is reviewing your request now. If it is approved, Domani access will be updated once the refund is processed.',
      iosSubmittedNoteTitle: 'What to expect',
      iosSubmittedNoteBody:
        'Refund decisions are handled by Apple. You may not see the result immediately, and access can take a little time to update after their decision.',
      iosSubmittedDoneCta: 'Back to Settings',
      iosSubmittedSupportBody:
        'Contact support if your access does not update later or you need help understanding the refund result.',
      iosPendingTitle: 'Refund request already in review',
      iosPendingBody:
        'Apple is still reviewing this refund request, or it has already reached a decision that is still propagating.',
      iosPendingNoteTitle: 'What this means',
      iosPendingNoteBody:
        'You do not need to submit another refund request right now. Apple will continue the review flow from the original request.',
      iosPendingSupportBody:
        'Contact support if this status looks wrong or your Domani access does not update after Apple finishes the review.',
      iosApprovedTitle: 'Refund completed',
      iosApprovedBody:
        'Apple has already completed this refund. If your access has not updated yet, it should refresh shortly.',
      iosApprovedNoteTitle: 'What this means',
      iosApprovedNoteBody:
        'You do not need to request another refund. If you want to use Domani again after access is removed, you can purchase lifetime access again.',
      iosApprovedDoneCta: 'Back to Settings',
      iosApprovedSupportBody:
        'Contact support if your access still looks incorrect after the refund has already been completed.',
      iosRefundErrorTitle: 'Could not open Apple refund flow',
      iosRefundErrorBody:
        'We could not open Apple’s refund request right now. Try again or contact support if you still need help.',
      iosRefundedEyebrow: 'Purchase Refunded',
      iosRefundedTitle: 'Your access was removed',
      iosRefundedBody:
        'This iPhone purchase has already been refunded. To unlock Domani again, buy lifetime access again.',
      iosRefundedNoteTitle: 'Already refunded',
      iosRefundedNoteBody:
        'Once Apple refunds the purchase, access is removed. If you want to use Domani again, you will need to purchase lifetime access again.',
      iosRepurchaseCta: 'Get Lifetime Access Again',
      iosRefundedSupportBody:
        'Contact support if your refunded state looks wrong or you need help understanding what happened.',
      platformNote:
        'Refund and billing options differ between iPhone and Android. Domani will guide you into the right support path for your device.',
      iosActionTitle: 'Request refund help on iPhone',
      iosActionBody:
        'Use this path if you need help with an Apple purchase, a refund request, or a billing question related to your App Store transaction.',
      iosActionCta: 'Continue with Apple purchase help',
      androidActionTitle: 'Get billing help on Android',
      androidActionBody:
        'Use this path if you need help with a Google Play purchase, billing issue, or account-specific purchase question on Android.',
      androidActionCta: 'Continue with Android billing help',
      restoreTitle: 'Restore a previous purchase',
      restoreBody:
        'If you already bought lifetime access on this account, try restoring first before opening a support request.',
      restoreCta: 'Restore Purchases',
      restoreNotFoundTitle: 'No purchases found',
      restoreNotFoundBody: 'We could not find a previous purchase for this account.',
      restoreErrorTitle: 'Restore failed',
      restoreErrorBody: 'Could not restore purchases. Please try again.',
      helpWithTitle: 'This screen can help with',
      helpTopics: [
        'Refund questions and next steps',
        'Restoring a previous purchase',
        'Billing or receipt issues',
        'Getting routed to the right support path for your platform',
      ],
      contactSupportCta: 'Contact Support',
      entryCta: 'Purchase Help',
    },
    settings: {
      sectionTitle: 'Your Plan',
      currentPlan: 'Current Plan',
      statusBeta: 'Beta Tester',
      statusGracePeriod: 'Beta Grace',
      statusPreTrial: 'No Active Plan',
      statusExpired: 'Trial Ended',
      statusRefunded: 'Refunded',
      statusTrialing: 'Trial',
      statusLifetime: 'Lifetime',
      betaBody:
        'You have full access to everything during the beta. Thanks for helping test Domani!',
      gracePeriodOneDay: '1 day left in beta grace period',
      gracePeriodManyDays: '{{count}} days left in beta grace period',
      gracePeriodBodyWithDate:
        'Your free beta access ends on {{date}}. Purchase lifetime access to keep using Domani after that.',
      gracePeriodBodyNoDate:
        'Your free beta access is ending soon. Purchase lifetime access to keep using Domani.',
      preTrialBody: 'Explore everything Domani has to offer',
      startTrial: 'Start 14-Day Free Trial',
      expiredBody: 'Your trial has ended — upgrade to keep using Domani',
      refundedBody: 'Your purchase was refunded — get lifetime access to continue using Domani',
      trialingDaysRemaining: '{{count}} days remaining in trial',
      trialingBodyWithDate: 'Unlimited tasks - All features unlocked through {{date}}',
      trialingBodyNoDate: 'Unlimited tasks - All features unlocked',
      lifetimeBody: 'Unlimited tasks - All features unlocked forever',
      lifetimePurchaseHelpBody:
        'Get help with your Apple or Google purchase, including refund guidance.',
      getLifetimeAccess: 'Get Lifetime Access',
      restorePurchases: 'Restore Purchases',
    },
  },
} as const
