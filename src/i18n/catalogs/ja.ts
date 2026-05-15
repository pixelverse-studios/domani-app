import type { BaseTranslationCatalog } from '../types'

export const ja: BaseTranslationCatalog = {
  common: {
    today: '今日',
    tomorrow: '明日',
    uncategorized: '未分類',
    custom: 'カスタム',
    selectTime: '時間を選択',
  },
  greetings: {
    morning: 'おはようございます',
    afternoon: 'こんにちは',
    evening: 'こんばんは',
  },
  categories: {
    system: {
      work: '仕事',
      personal: '個人',
      wellness: 'ウェルネス',
      home: '家',
    },
  },
  auth: {
    actions: {
      ok: 'OK',
      reactivate: '再有効化',
      keepDeletion: '削除予定のままにする',
    },
    errors: {
      signInTitle: 'サインインエラー',
      googleFallback: 'Googleでのサインインに失敗しました',
      appleFallback: 'Appleでのサインインに失敗しました',
      accountExistsTitle: 'アカウントはすでに存在します',
      accountExistsMessage: 'このメールアドレスのアカウントはすでに存在します。',
    },
    pendingDeletion: {
      title: 'アカウントは削除予定です',
      message: 'あなたのアカウントは{{date}}に削除される予定です。再有効化しますか？',
    },
    login: {
      newUserEyebrow: '購入前にDomaniを無料で試す',
      newUserTitle: '14日間の無料トライアルを開始',
      newUserSubtitle:
        'まずはフルアクセス。続けたい場合のみ一度きりの生涯購入です。',
      stepStartLabel: '今日から無料で始める',
      stepStartBody: '14日間のフルトライアルはサインアップするとすぐに始まります。',
      stepKeepLabelWithPrice: '{{price}}で一度だけ購入して継続',
      stepKeepLabelFallback: '一度きりの生涯購入で継続',
      stepKeepBody: '事前のクレジットカードは不要。トライアル後のサブスクもありません。',
      returningEyebrow: '中断したところから再開',
      returningTitle: 'おかえりなさい',
      returningSubtitle: 'サインインして明日の計画を続けましょう。',
      returningCardTitle: 'あなたの計画が待っています。',
      returningCardBody: 'サインインして、タスク、リマインダー、勢いを取り戻しましょう。',
      startTrialWithApple: 'Appleで無料トライアルを開始',
      startTrialWithGoogle: 'Googleで無料トライアルを開始',
      continueWithApple: 'Appleで続ける',
      continueWithGoogle: 'Googleで続ける',
      back: '← 戻る',
      trialConfirmEyebrow: '続行する前に',
      trialConfirmTitle: '14日間の無料トライアルを開始します',
      trialConfirmBody:
        '続行すると、アカウントが作成され、無料トライアルがすぐに開始されます。',
      trialConfirmPointTrial: '14日間フルアクセス',
      trialConfirmPointLifetimeWithPrice:
        '続けたい場合はその後{{price}}を一度だけ支払い',
      trialConfirmPointLifetimeFallback:
        '続けたい場合はその後一度きりの生涯購入',
      trialConfirmPointNoCard: '開始時にクレジットカードは不要',
      cancel: 'キャンセル',
    },
  },
  onboarding: {
    notificationSetup: {
      eyebrow: '14日間の無料トライアル',
      title: 'トライアルが開始されました',
      subtitle:
        '今すぐフルアクセスでDomaniを試し、生涯アクセスが必要かどうかは後で決められます。',
      liveHeadline: 'フルアクセスのトライアルが現在有効です',
      liveDetail: '夜のリマインダーを設定して、明日の計画を始めましょう。',
      daysLeftHeadline: 'Domaniを試せる期間はあと{{count}}日です',
      daysLeftDetail:
        'トライアルは{{date}}までです。夜のリマインダーを設定して、フルアクセスで明日の計画を始めましょう。',
      oneDayHeadline: 'トライアルは残り1日です',
      oneDayDetail:
        'トライアルは{{date}}までです。夜のリマインダーを設定して、Domaniでの最後のフルアクセス日を最大限に活用しましょう。',
      endsTodayHeadline: 'トライアルは今日終了します',
      endsTodayDetail:
        'トライアルアクセスは{{date}}までです。最後のフルアクセス日を逃さないよう、今すぐ夜のリマインダーを設定しましょう。',
      planningReminderTitle: '計画リマインダー',
      planningReminderDescription: 'いつ通知を受けたいか選んでください。',
      toggleLabel: '毎日のリマインダーを送る',
      taskRemindersTitle: 'タスクリマインダー',
      taskRemindersDescription:
        '各タスクには個別のリマインダーがあります。タスクの作成・編集時に個別の時間を設定できます。',
      continue: 'Domaniを続ける',
    },
  },
  planning: {
    header: {
      planningFor: '計画対象',
    },
    reminder: {
      addReminder: 'リマインダーを追加',
      reminderOn: 'リマインダーON',
      custom: 'カスタム',
      pastTimeWarning: 'この時間はすでに過ぎています — 通知は送信されません',
    },
    rollover: {
      reminderTimes: 'リマインダー時間',
      keepOriginalTimes: '元の時間を保持',
      setNewReminderTimes: '新しいリマインダー時間を設定',
    },
  },
  settings: {
    reminderShortcuts: {
      title: 'リマインダーショートカット',
      customizeTitle: 'ショートカットをカスタマイズ',
      description: 'リマインダー追加時に表示されるプリセット時間を変更します',
      shortcutLabel: 'ショートカット {{count}}',
    },
  },
  analytics: {
    completionRate: '完了率',
    tasksDone: '{{total}}件中{{completed}}件完了',
    lastNDays: '過去{{count}}日',
    byCategory: 'カテゴリ別',
    taskCount: '{{completed}}/{{total}} タスク',
  },
  legal: {
    termsOfService: '利用規約',
    privacyPolicy: 'プライバシーポリシー',
    footer: ['続行すると、', '{terms}', ' と ', '{privacy}', ' に同意したことになります'],
    unableToOpenLinkTitle: 'リンクを開けません',
    unableToOpenLinkMessage: '後でもう一度お試しください。',
  },
  welcome: {
    taglinePrimary: '明日の計画を、今夜立てる。',
    taglineSecondary: '集中して実行する。',
    startPlanning: '計画を始める',
    returningCta: ['すでにアカウントをお持ちですか？ ', '{signIn}'],
    signIn: 'サインイン',
  },
  subscription: {
    preTrial: {
      title: 'Domaniへようこそ',
      body:
        '14日間の無料トライアルを始めて、Domaniのすべてを体験しましょう。開始時に支払いは不要です。アップグレードするかどうか、いつするかはあなたが決められます。',
      startTrial: '14日間の無料トライアルを開始',
      error: '無料トライアルを開始できませんでした。もう一度お試しください。',
      accountSettings: 'アカウント設定',
    },
    locked: {
      refundedTitle: 'アクセスが取り消されました',
      expiredTitle: 'トライアルが終了しました',
      refundedBody:
        '以前の購入は返金されました。Domaniを使い続けるには生涯アクセスを取得してください。',
      expiredBody:
        'Domaniで日々の計画を続けるには生涯アクセスを取得してください — 一度の購入で永久に利用できます。',
      getLifetimeAccess: '生涯アクセスを取得',
      restorePurchases: '購入を復元',
      restoreNotFound: 'このアカウントに以前の購入は見つかりませんでした。',
      restoreError: '購入を復元できませんでした。もう一度お試しください。',
      accountSettings: 'アカウント設定',
    },
    paywall: {
      discountLabelEarlyAdopter: '早期ユーザー価格',
      discountLabelFriendsFamily: '友人・家族価格',
      discountBadgeEarlyAdopter: '71%オフ',
      discountBadgeFriendsFamily: '86%オフ',
      valueProps: [
        '毎日のタスク数が無制限',
        '明日の計画を今夜立てる',
        'すべての機能を永久に',
        'サブスクリプションなし',
      ],
      successProps: [
        '明日の計画を今夜立てる',
        '小さな毎日の達成が長く続く習慣になる',
        '忙しさではなく集中を保つために作られた',
        'トップパフォーマーが信頼する戦略',
      ],
      successTitle: '準備完了です！',
      successBody: '生涯アクセスが解除されました。Domaniへようこそ。',
      successPrimaryCta: '計画を始める',
      dismiss: '閉じる',
      close: '閉じる',
      title: '生涯アクセスを取得',
      subtitle: '一度の購入。ずっとあなたのもの。',
      purchaseCtaWithPrice: '生涯アクセスを取得 — {{price}}',
      purchaseCta: '生涯アクセスを取得',
      purchaseErrorRetry: '購入中に問題が発生しました。もう一度お試しください。',
      purchaseErrorSupport:
        'この問題が続いています。解決しない場合はサポートにご連絡ください。',
      restoreNotFound: 'このアカウントに以前の購入は見つかりませんでした。',
      restoreError: '購入を復元できませんでした。もう一度お試しください。',
      contactSupport: 'サポートに連絡',
      oneTimePurchaseNote: '一度きりの購入です。継続課金はありません。',
      restorePurchases: '購入を復元',
    },
    settings: {
      sectionTitle: 'あなたのプラン',
      currentPlan: '現在のプラン',
      statusBeta: 'ベータテスター',
      statusGracePeriod: 'ベータ猶予',
      statusPreTrial: '有効なプランなし',
      statusExpired: 'トライアル終了',
      statusRefunded: '返金済み',
      statusTrialing: 'トライアル',
      statusLifetime: '生涯',
      betaBody:
        'ベータ期間中はすべてにフルアクセスできます。Domaniのテストにご協力いただきありがとうございます！',
      gracePeriodOneDay: 'ベータ猶予期間は残り1日です',
      gracePeriodManyDays: 'ベータ猶予期間は残り{{count}}日です',
      gracePeriodBodyWithDate:
        '無料のベータアクセスは{{date}}に終了します。その後もDomaniを使い続けるには生涯アクセスを購入してください。',
      gracePeriodBodyNoDate:
        '無料のベータアクセスはまもなく終了します。Domaniを使い続けるには生涯アクセスを購入してください。',
      preTrialBody: 'Domaniのすべてを体験しましょう',
      startTrial: '14日間の無料トライアルを開始',
      expiredBody:
        'トライアルは終了しました — Domaniを使い続けるにはアップグレードしてください',
      refundedBody:
        '購入は返金されました — Domaniを使い続けるには生涯アクセスを取得してください',
      trialingDaysRemaining: 'トライアル残り{{count}}日',
      trialingBodyWithDate: '無制限のタスク - すべての機能が{{date}}まで利用可能',
      trialingBodyNoDate: '無制限のタスク - すべての機能が利用可能',
      lifetimeBody: '無制限のタスク - すべての機能が永久に利用可能',
      getLifetimeAccess: '生涯アクセスを取得',
      restorePurchases: '購入を復元',
    },
  },
}
