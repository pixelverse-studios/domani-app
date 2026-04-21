import type { BaseTranslationCatalog } from '../types'

export const pl: BaseTranslationCatalog = {
  common: {
    today: 'Dzisiaj',
    tomorrow: 'Jutro',
    uncategorized: 'Bez kategorii',
    custom: 'Niestandardowe',
    selectTime: 'Wybierz godzinę',
  },
  greetings: {
    morning: 'Dzień dobry',
    afternoon: 'Dzień dobry',
    evening: 'Dobry wieczór',
  },
  categories: {
    system: {
      work: 'Praca',
      personal: 'Osobiste',
      wellness: 'Dobre samopoczucie',
      home: 'Dom',
    },
  },
  auth: {
    actions: {
      ok: 'OK',
      reactivate: 'Przywróć',
      keepDeletion: 'Pozostaw usunięcie',
    },
    errors: {
      signInTitle: 'Błąd logowania',
      googleFallback: 'Logowanie przez Google nie powiodło się',
      appleFallback: 'Logowanie przez Apple nie powiodło się',
      accountExistsTitle: 'Konto już istnieje',
      accountExistsMessage: 'Konto z tym adresem e-mail już istnieje.',
    },
    pendingDeletion: {
      title: 'Konto zaplanowane do usunięcia',
      message:
        'Twoje konto zostało zaplanowane do usunięcia dnia {{date}}. Czy chcesz je przywrócić?',
    },
    login: {
      newUserEyebrow: 'Wypróbuj Domani za darmo, zanim kupisz',
      newUserTitle: 'Rozpocznij 14-dniowy bezpłatny okres próbny',
      newUserSubtitle:
        'Najpierw pełny dostęp. Tylko jeden zakup dożywotni, jeśli chcesz zostać.',
      stepStartLabel: 'Zacznij za darmo już dziś',
      stepStartBody:
        'Twój pełny 14-dniowy okres próbny rozpoczyna się natychmiast po rejestracji.',
      stepKeepLabelWithPrice: 'Zachowaj za {{price}} jednorazowo',
      stepKeepLabelFallback: 'Zachowaj dzięki jednorazowemu zakupowi na całe życie',
      stepKeepBody: 'Bez karty kredytowej na start. Bez subskrypcji po okresie próbnym.',
      returningEyebrow: 'Wróć tam, gdzie skończyłeś',
      returningTitle: 'Witamy ponownie',
      returningSubtitle: 'Zaloguj się, aby dalej planować swoje jutro.',
      returningCardTitle: 'Twoje plany na Ciebie czekają.',
      returningCardBody:
        'Zaloguj się, aby wrócić do zadań, przypomnień i swojego tempa.',
      startTrialWithApple: 'Rozpocznij bezpłatny okres próbny z Apple',
      startTrialWithGoogle: 'Rozpocznij bezpłatny okres próbny z Google',
      continueWithApple: 'Kontynuuj z Apple',
      continueWithGoogle: 'Kontynuuj z Google',
      back: '← Wstecz',
      trialConfirmEyebrow: 'Zanim przejdziesz dalej',
      trialConfirmTitle: 'Rozpoczynasz 14-dniowy bezpłatny okres próbny',
      trialConfirmBody:
        'Kontynuując, utworzysz konto i od razu rozpoczniesz bezpłatny okres próbny.',
      trialConfirmPointTrial: 'Pełny dostęp przez 14 dni',
      trialConfirmPointLifetimeWithPrice:
        'Następnie {{price}} jednorazowo, jeśli chcesz zachować Domani',
      trialConfirmPointLifetimeFallback:
        'Następnie jednorazowy zakup dożywotni, jeśli chcesz zachować Domani',
      trialConfirmPointNoCard: 'Na początku nie jest wymagana karta kredytowa',
      cancel: 'Anuluj',
    },
  },
  onboarding: {
    notificationSetup: {
      eyebrow: '14-dniowy bezpłatny okres próbny',
      title: 'Twój okres próbny się rozpoczął',
      subtitle:
        'Poznaj Domani z pełnym dostępem już teraz, a później zdecyduj, czy chcesz dostęp dożywotni.',
      liveHeadline: 'Twój okres próbny z pełnym dostępem jest już aktywny',
      liveDetail:
        'Ustaw wieczorne przypomnienie, a następnie zacznij planować jutro.',
      daysLeftHeadline: 'Masz {{count}} dni na odkrywanie Domani',
      daysLeftDetail:
        'Twój okres próbny trwa do {{date}}. Ustaw wieczorne przypomnienie, a następnie planuj jutro z pełnym dostępem.',
      oneDayHeadline: 'Pozostał Ci 1 dzień okresu próbnego',
      oneDayDetail:
        'Twój okres próbny trwa do {{date}}. Ustaw wieczorne przypomnienie i wykorzystaj w pełni ostatni pełny dzień z Domani.',
      endsTodayHeadline: 'Twój okres próbny kończy się dziś',
      endsTodayDetail:
        'Dostęp próbny trwa do {{date}}. Ustaw teraz wieczorne przypomnienie, aby nie przegapić ostatniego dnia pełnego dostępu.',
      planningReminderTitle: 'Przypomnienie o planowaniu',
      planningReminderDescription: 'Wybierz, kiedy chcesz otrzymywać przypomnienie.',
      toggleLabel: 'Wysyłaj mi codzienne przypomnienie',
      taskRemindersTitle: 'Przypomnienia o zadaniach',
      taskRemindersDescription:
        'Każde zadanie ma własne przypomnienie. Możesz ustawić indywidualne godziny podczas tworzenia lub edycji zadań.',
      continue: 'Przejdź do Domani',
    },
  },
  planning: {
    header: {
      planningFor: 'Planowanie na',
    },
    reminder: {
      addReminder: 'Dodaj przypomnienie',
      reminderOn: 'Przypomnienie włączone',
      custom: 'Niestandardowe',
      pastTimeWarning: 'Ten czas już minął — nie zostanie wysłane żadne powiadomienie',
    },
    rollover: {
      reminderTimes: 'Godziny przypomnień',
      keepOriginalTimes: 'Zachowaj oryginalne godziny',
      setNewReminderTimes: 'Ustaw nowe godziny przypomnień',
    },
  },
  settings: {
    reminderShortcuts: {
      title: 'Skróty przypomnień',
      customizeTitle: 'Dostosuj skróty',
      description:
        'Dotknij, aby zmienić domyślne godziny wyświetlane przy dodawaniu przypomnień',
      shortcutLabel: 'Skrót {{count}}',
    },
  },
  analytics: {
    completionRate: 'Wskaźnik ukończenia',
    tasksDone: '{{completed}} z {{total}} zadań ukończonych',
    lastNDays: 'Ostatnie {{count}} dni',
    byCategory: 'Według kategorii',
    taskCount: '{{completed}}/{{total}} zadań',
  },
  legal: {
    termsOfService: 'Warunki korzystania',
    privacyPolicy: 'Polityka prywatności',
    footer: ['Kontynuując, akceptujesz nasze ', '{terms}', ' i ', '{privacy}'],
    unableToOpenLinkTitle: 'Nie można otworzyć linku',
    unableToOpenLinkMessage: 'Spróbuj ponownie później.',
  },
  welcome: {
    taglinePrimary: 'Zaplanuj jutro już dziś wieczorem.',
    taglineSecondary: 'Działaj z koncentracją.',
    startPlanning: 'Rozpocznij planowanie',
    returningCta: ['Masz już konto? ', '{signIn}'],
    signIn: 'Zaloguj się',
  },
  subscription: {
    preTrial: {
      title: 'Witamy w Domani',
      body:
        'Rozpocznij 14-dniowy bezpłatny okres próbny, aby odkryć wszystko, co oferuje Domani. Na start nie jest wymagana płatność — sam decydujesz, czy i kiedy chcesz przejść na wyższy plan.',
      startTrial: 'Rozpocznij 14-dniowy bezpłatny okres próbny',
      error: 'Nie udało się rozpocząć bezpłatnego okresu próbnego. Spróbuj ponownie.',
      accountSettings: 'Ustawienia konta',
    },
    locked: {
      refundedTitle: 'Twój dostęp został cofnięty',
      expiredTitle: 'Twój okres próbny się zakończył',
      refundedBody:
        'Twój poprzedni zakup został zwrócony. Uzyskaj dożywotni dostęp, aby nadal korzystać z Domani.',
      expiredBody:
        'Uzyskaj dożywotni dostęp, aby nadal planować swoje dni z Domani — jeden zakup i Twoje na zawsze.',
      getLifetimeAccess: 'Uzyskaj dożywotni dostęp',
      restorePurchases: 'Przywróć zakupy',
      restoreNotFound: 'Nie znaleziono wcześniejszych zakupów dla tego konta.',
      restoreError: 'Nie udało się przywrócić zakupów. Spróbuj ponownie.',
      accountSettings: 'Ustawienia konta',
    },
    paywall: {
      discountLabelEarlyAdopter: 'Cena dla early adopterów',
      discountLabelFriendsFamily: 'Cena dla rodziny i znajomych',
      discountBadgeEarlyAdopter: '71% zniżki',
      discountBadgeFriendsFamily: '86% zniżki',
      valueProps: [
        'Nielimitowane codzienne zadania',
        'Planuj jutro już dziś wieczorem',
        'Wszystkie funkcje, na zawsze',
        'Bez subskrypcji, nigdy',
      ],
      successProps: [
        'Planuj jutro już dziś wieczorem',
        'Małe codzienne zwycięstwa budują trwałe nawyki',
        'Stworzone, aby pomagać Ci się skupić, a nie zajmować',
        'Strategia, której ufają najlepsi',
      ],
      successTitle: 'Gotowe!',
      successBody: 'Dożywotni dostęp odblokowany. Witamy w Domani.',
      successPrimaryCta: 'Rozpocznij planowanie',
      dismiss: 'Zamknij',
      close: 'Zamknij',
      title: 'Uzyskaj dożywotni dostęp',
      subtitle: 'Jeden zakup. Twoje na zawsze.',
      purchaseCtaWithPrice: 'Uzyskaj dożywotni dostęp — {{price}}',
      purchaseCta: 'Uzyskaj dożywotni dostęp',
      purchaseErrorRetry: 'Coś poszło nie tak z Twoim zakupem. Spróbuj ponownie.',
      purchaseErrorSupport:
        'To nadal się dzieje. Skontaktuj się z pomocą, jeśli problem będzie się powtarzać.',
      restoreNotFound: 'Nie znaleziono wcześniejszych zakupów dla tego konta.',
      restoreError: 'Nie udało się przywrócić zakupów. Spróbuj ponownie.',
      contactSupport: 'Skontaktuj się z pomocą',
      oneTimePurchaseNote: 'Jednorazowy zakup. Brak cyklicznych opłat.',
      restorePurchases: 'Przywróć zakupy',
    },
    settings: {
      sectionTitle: 'Twój plan',
      currentPlan: 'Aktualny plan',
      statusBeta: 'Beta tester',
      statusGracePeriod: 'Okres beta',
      statusPreTrial: 'Brak aktywnego planu',
      statusExpired: 'Próba zakończona',
      statusRefunded: 'Zwrot',
      statusTrialing: 'Próba',
      statusLifetime: 'Dożywotni',
      betaBody:
        'Masz pełny dostęp do wszystkiego podczas bety. Dziękujemy za pomoc w testowaniu Domani!',
      gracePeriodOneDay: 'Pozostał 1 dzień okresu beta',
      gracePeriodManyDays: 'Pozostało {{count}} dni okresu beta',
      gracePeriodBodyWithDate:
        'Twój bezpłatny dostęp beta kończy się {{date}}. Kup dożywotni dostęp, aby nadal korzystać z Domani po tym terminie.',
      gracePeriodBodyNoDate:
        'Twój bezpłatny dostęp beta wkrótce się zakończy. Kup dożywotni dostęp, aby nadal korzystać z Domani.',
      preTrialBody: 'Odkryj wszystko, co Domani ma do zaoferowania',
      startTrial: 'Rozpocznij 14-dniowy bezpłatny okres próbny',
      expiredBody: 'Twój okres próbny się zakończył — uaktualnij, aby nadal korzystać z Domani',
      refundedBody:
        'Twój zakup został zwrócony — uzyskaj dożywotni dostęp, aby nadal korzystać z Domani',
      trialingDaysRemaining: '{{count}} dni pozostało w okresie próbnym',
      trialingBodyWithDate: 'Nielimitowane zadania - Wszystkie funkcje odblokowane do {{date}}',
      trialingBodyNoDate: 'Nielimitowane zadania - Wszystkie funkcje odblokowane',
      lifetimeBody: 'Nielimitowane zadania - Wszystkie funkcje odblokowane na zawsze',
      getLifetimeAccess: 'Uzyskaj dożywotni dostęp',
      restorePurchases: 'Przywróć zakupy',
    },
  },
}
