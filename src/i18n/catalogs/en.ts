export const en = {
  common: {
    today: 'Today',
    tomorrow: 'Tomorrow',
    uncategorized: 'Uncategorized',
    custom: 'Custom',
    selectTime: 'Select Time',
    notifications: 'Notifications',
    tabs: {
      today: 'Today',
      planning: 'Planning',
      feedback: 'Feedback',
      progress: 'Progress',
      settings: 'Settings',
    },
    actions: {
      cancel: 'Cancel',
      close: 'Close',
      save: 'Save',
      done: 'Done',
      delete: 'Delete',
      deleting: 'Deleting...',
      enable: 'Enable',
      disable: 'Disable',
      logOut: 'Log Out',
      keepAccount: 'Keep Account',
      submit: 'Submit',
      back: 'Back',
      next: 'Next',
      gotIt: 'Got it',
      skipTour: 'Skip tour',
      planToday: 'Plan Today',
      addTask: 'Add Task',
      addMoreTasks: 'Add More Tasks',
    },
    confirmation: {
      deleteDescription: 'Are you sure you want to delete:',
      cannotUndo: 'This cannot be undone.',
    },
    errors: {
      title: 'Error',
      tryAgain: 'Please try again.',
    },
  },
  greetings: {
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
  },
  categories: {
    system: {
      work: 'Work',
      personal: 'Personal',
      wellness: 'Wellness',
      home: 'Home',
    },
  },
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
      subtitle:
        'Explore Domani with full access now, then decide later if you want lifetime access.',
      liveHeadline: 'Your full-access trial is live now',
      liveDetail: 'Set your evening reminder, then start planning tomorrow.',
      daysLeftHeadline: 'You have {{count}} days to explore Domani',
      daysLeftDetail:
        'Your trial runs through {{date}}. Set your evening reminder, then start planning tomorrow with full access.',
      oneDayHeadline: 'You have 1 day left in your trial',
      oneDayDetail:
        'Your trial runs through {{date}}. Set your evening reminder, then make the most of your last full day with Domani.',
      endsTodayHeadline: 'Your trial ends today',
      endsTodayDetail:
        'Your trial access runs through {{date}}. Set your evening reminder now so you do not miss your final day with full access.',
      planningReminderTitle: 'Remind me to plan',
      planningReminderDescription: 'Choose when you want to be reminded.',
      toggleLabel: 'Remind me to plan',
      taskRemindersTitle: 'Task Reminders',
      taskRemindersDescription:
        'Set individual reminders on each task when creating or editing.',
      continue: 'Continue to Domani',
    },
  },
  planning: {
    header: {
      planningFor: 'Planning for',
    },
    emptyState: {
      plannedTasks: 'Planned Tasks',
      noTasks: 'No tasks planned yet',
    },
    reminder: {
      addReminder: 'Add Reminder',
      reminderOn: 'Reminder On',
      custom: 'Custom',
      pastTimeWarning: 'This time has passed — no notification will be sent',
    },
    rollover: {
      reminderTimes: 'Reminder Times',
      keepOriginalTimes: 'Keep original times',
      setNewReminderTimes: 'Set new reminder times',
    },
  },
  settings: {
    screenTitle: 'Settings',
    logOutConfirmTitle: 'Log Out',
    logOutConfirmMessage: 'Are you sure you want to log out?',
    restoreFailedTitle: 'Restore Failed',
    restoreFailedMessage: 'Could not restore purchases. Please try again.',
    deletionScheduleFailed: 'Failed to schedule account deletion. Please try again.',
    deletionCancelFailed: 'Failed to cancel deletion. Please try again.',
    planningTimeSaveFailed: 'Failed to save planning time. Please try again.',
    notificationToggleFailed: 'Failed to update notification setting. Please try again.',
    nameModal: {
      title: 'Edit Name',
      placeholder: 'Enter your name',
    },
    timezoneModal: {
      title: 'Select Timezone',
    },
    planningTimeModal: {
      title: 'Planning Reminder',
      description: "Get reminded to plan tomorrow's tasks",
    },
    favoriteCategories: {
      title: 'Favorite Categories',
      managedSmartly: 'Managed Smartly',
      selectedCount: '{{count}} selected',
      quickAccessTitle: 'Quick Access Categories',
      quickAccessDescription:
        'Select up to {{count}} categories to display by default when adding tasks',
      reorderHint: 'Hold and drag to reorder',
    },
    dangerZone: {
      title: 'Danger Zone',
      pendingTitle: 'Account Scheduled for Deletion',
      daysRemaining: '{{count}} days remaining',
      deletionMessagePrefix: 'Your account will be permanently deleted on ',
      deletionMessageSuffix: '. Sign in anytime before then to reactivate.',
      cancelDeletion: 'Cancel Deletion',
      deleteAccount: 'Delete Account',
    },
    deleteAccountModal: {
      title: 'Delete Your Account?',
      description:
        'Your account and all data will be permanently deleted after 30 days. You can sign in anytime before then to reactivate your account.',
      listTitle: 'This will permanently delete:',
      listPlansTasks: 'All your plans and tasks',
      listCustomCategories: 'Custom categories',
      listProgressHistory: 'Progress history',
      listAccountSettings: 'Account settings',
    },
    smartCategoriesModal: {
      enableTitle: 'Enable Smart Categories?',
      disableTitle: 'Disable Smart Categories?',
      enableDescription:
        'Your quick access categories will automatically adapt based on your usage patterns. This will override your current favorite categories.',
      disableDescription:
        'Your categories will return to manual ordering. You can reorder them by going to Favorite Categories.',
    },
    reminderShortcuts: {
      title: 'Reminder Shortcuts',
      customizeTitle: 'Customize Shortcuts',
      description: 'Tap to change the preset times shown when adding reminders',
      shortcutLabel: 'Shortcut {{count}}',
    },
  },
  today: {
    namePrompt: {
      title: 'What should we call you?',
      description: 'Add your name to personalize your experience',
      saveFailedTitle: 'Failed to save name',
      saveFailedMessage: 'Please try again.',
    },
    progress: {
      placeholder: 'Your progress will be tracked here once you add tasks',
      title: "Today's Progress",
      completed: 'Completed',
      unfinished: 'Unfinished',
    },
    emptyState: {
      title: 'No tasks planned yet',
    },
    focus: {
      allDoneLabel: 'All Done!',
      allDoneMessage: "You've crushed it today",
      focusLabel: "Today's Focus",
      planDayMessage: 'Plan your day',
      addTasksSubtitle: 'Add tasks to get started',
      mostImportantTask: 'Your most important task',
      vibeLabel: "Today's Vibe",
      themeSuffix: ', then focus on {{phrase}}',
      themePhrases: {
        work: 'productivity',
        wellness: 'wellness',
        personal: 'personal time',
        learning: 'learning',
        balanced: 'balance',
      },
    },
    dayThemes: {
      work: {
        title: 'Productivity Day',
        subtitle: 'Heads down, results ahead',
      },
      wellness: {
        title: 'Self-Care Day',
        subtitle: 'Investing in yourself',
      },
      personal: {
        title: 'Life Admin Day',
        subtitle: 'Taking care of what matters',
      },
      learning: {
        title: 'Growth Day',
        subtitle: 'Expanding your horizons',
      },
      balanced: {
        title: 'Balanced Day',
        subtitle: 'A well-rounded day ahead',
      },
    },
  },
  feedback: {
    categories: {
      bugReport: 'Bug Report',
      featureIdea: 'Feature Idea',
      whatILove: 'What I Love',
      general: 'General',
    },
    title: 'Share Your Thoughts',
    subtitle: 'Help us make Domani better! Your feedback shapes our development.',
    categoryPrompt: 'What would you like to share?',
    messageLabel: 'Your Message',
    disabledMessage: 'Select a category to start',
    placeholders: {
      bugReport: 'Describe the bug you encountered...',
      featureIdea: 'Tell us about your feature idea...',
      whatILove: 'Share what you love about Domani...',
      general: 'Share your thoughts with us...',
    },
    submitCta: 'Send Feedback',
    submitFailedTitle: 'Failed to send feedback',
    success: {
      title: 'Feedback Received!',
      message:
        "Thank you for sharing your thoughts! We've received your message and will review it soon. Your input helps us build a better Domani.",
      action: 'Submit More Feedback',
      bannerTitle: 'We appreciate you!',
      bannerDescription:
        "Every piece of feedback matters. You're helping shape the future of productivity.",
    },
    betaBanner: {
      title: "You're a Beta Tester!",
      description:
        "Your feedback directly shapes Domani's future. Every submission is read by our team and helps prioritize what we build next.",
    },
  },
  support: {
    categories: {
      technicalIssue: 'Technical Issue',
      accountHelp: 'Account Help',
      billingQuestion: 'Billing Question',
      other: 'Other',
    },
    title: 'Contact Support',
    subtitle: 'Submit a request and get personalized help from our team',
    categoryPrompt: 'What do you need help with?',
    issueLabel: 'Describe your issue',
    disabledMessage: 'Select a category to start',
    placeholders: {
      technicalIssue: "Describe the technical problem you're experiencing.",
      accountHelp: 'Describe what help you need with your account.',
      billingQuestion: 'Describe your billing question or concern.',
      other: 'Describe what you need help with.',
    },
    submitCta: 'Submit Support Request',
    submitFailedTitle: 'Failed to submit request',
    success: {
      message:
        "We've received your support request and our team will get back to you within 24 hours. Check your email for updates.",
      action: 'Submit Another Request',
      bannerTitle: "We're on it!",
      bannerDescription:
        "Your ticket has been assigned to our support team. We'll investigate and respond as soon as possible.",
    },
    responseBanner: {
      title: 'Quick Response Time',
      description:
        'Our support team typically responds within 24 hours. All requests are handled with care and attention.',
    },
  },
  tutorial: {
    progress: '{{current}} of {{total}}',
    steps: {
      todayOverviewTitle: 'Today Is Your Launchpad',
      todayOverviewDescription:
        'This is where your planned tasks appear when it is time to execute.',
      todayPrimaryActionTitle: 'Start Tomorrow’s Plan',
      todayPrimaryActionDescription:
        'Use this action to open the planning flow. You do not need to create anything during the tour.',
      planningFormTitle: 'One Focused Planning Form',
      planningFormDescription:
        'A task only needs a title, category, priority, and optional reminder to be useful tomorrow.',
      taskTitleTitle: 'Name the Next Action',
      taskTitleDescription: 'Keep the title short, clear, and easy to start.',
      taskCategoryTitle: 'Give It Context',
      taskCategoryDescription:
        'Categories keep work, personal, home, and wellness tasks easy to scan.',
      taskPriorityTitle: 'Choose the Weight',
      taskPriorityDescription:
        'Priority tells tomorrow-you what deserves attention first.',
      taskReminderTitle: 'Add a Nudge',
      taskReminderDescription:
        'Reminders are optional, but useful when a task depends on a specific time.',
      taskSubmitTitle: 'Save the Plan',
      taskSubmitDescription:
        'The submit button creates the task. The tour can continue without pressing it.',
      completeTitle: 'You’re Ready',
      completeDescription:
        'When you create a task for tomorrow, it appears in Today when that day arrives.',
    },
  },
  analytics: {
    completionRate: 'Completion Rate',
    tasksDone: '{{completed}} of {{total}} tasks done',
    lastNDays: 'Last {{count}} Days',
    byCategory: 'By Category',
    taskCount: '{{completed}}/{{total}} tasks',
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
      iosExistingRequestTitle: 'A refund request already exists',
      iosExistingRequestBody:
        'Apple has already received a refund request for this purchase. The result may still be in progress, or the final outcome may still be updating.',
      iosExistingRequestNoteTitle: 'What this means',
      iosExistingRequestNoteBody:
        'You do not need to submit another refund request right now. Check back later or contact support if your Domani access still looks wrong.',
      iosExistingRequestSupportBody:
        'Contact support if this purchase should already be refunded or if your access still looks incorrect later.',
      iosApprovedTitle: 'Refund completed',
      iosApprovedBody:
        'Apple has already completed this refund. If your access has not updated yet, it should refresh shortly.',
      iosApprovedNoteTitle: 'What this means',
      iosApprovedNoteBody:
        'You do not need to request another refund. If you want to use Domani again after access is removed, you can purchase lifetime access again.',
      iosApprovedDoneCta: 'Back to Settings',
      iosApprovedSupportBody:
        'Contact support if your access still looks incorrect after the refund has already been completed.',
      iosDeniedTitle: 'Refund was not approved',
      iosDeniedBody:
        'Apple did not approve the last refund request for this purchase. If you still believe something is wrong, contact support.',
      iosDeniedNoteTitle: 'What this means',
      iosDeniedNoteBody:
        'This purchase still appears active, so Domani has not removed access. Support can help if the outcome looks incorrect.',
      iosDeniedDoneCta: 'Back to Settings',
      iosDeniedSupportBody:
        'Contact support if you need help understanding the decision or if this purchase state looks incorrect.',
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
      androidTitle: 'Need help with a Google Play purchase?',
      androidBody:
        'Google Play handles Android refund requests. We can take you to your Google Play order history so you can report a problem for this Domani purchase.',
      androidNoteTitle: 'What happens next',
      androidNoteBody:
        'Google Play usually decides refund requests within 1–4 days. If it has been more than 48 hours or your purchase state still looks wrong, contact support.',
      androidRefundCta: 'Open Google Play Refund Help',
      androidSupportBody:
        'Contact support if the Google Play flow does not open, your purchase is missing, or the result does not match your Domani access.',
      androidUnavailableTitle: 'Need help with billing on Android?',
      androidUnavailableBody:
        'This account does not currently look like an active paid Google Play purchase, so there is no refund path to open from Domani right now.',
      androidUnavailableNoteTitle: 'What this means',
      androidUnavailableNoteBody:
        'If you expected a Google Play purchase on this account, support can help you verify the purchase state and next step.',
      androidUnavailableSupportBody:
        'Contact support if this Android account should already have an active Google Play purchase linked to it.',
      androidOpenErrorTitle: 'Could not open Google Play',
      androidOpenErrorBody:
        'We could not open the Google Play refund flow right now. Try again or contact support if you still need help.',
      androidRefundedTitle: 'Your access was removed',
      androidRefundedBody:
        'This Android purchase has already been refunded. To unlock Domani again, buy lifetime access again.',
      androidRefundedNoteTitle: 'Already refunded',
      androidRefundedNoteBody:
        'Once Google Play refunds the purchase, access is removed. If you want to use Domani again, you will need to purchase lifetime access again.',
      androidRepurchaseCta: 'Get Lifetime Access Again',
      androidRefundedSupportBody:
        'Contact support if your refunded Android state looks wrong or you need help understanding what happened.',
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
