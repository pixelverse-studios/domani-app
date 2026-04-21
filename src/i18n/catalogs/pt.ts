import type { TranslationCatalog } from '../types'

export const pt: TranslationCatalog = {
  common: {
    today: 'Hoje',
    tomorrow: 'Amanhã',
    uncategorized: 'Sem categoria',
    custom: 'Personalizado',
    selectTime: 'Selecionar horário',
  },
  greetings: {
    morning: 'Bom dia',
    afternoon: 'Boa tarde',
    evening: 'Boa noite',
  },
  categories: {
    system: {
      work: 'Trabalho',
      personal: 'Pessoal',
      wellness: 'Bem-estar',
      home: 'Casa',
    },
  },
  auth: {
    actions: {
      ok: 'OK',
      reactivate: 'Reativar',
      keepDeletion: 'Manter exclusão',
    },
    errors: {
      signInTitle: 'Erro ao entrar',
      googleFallback: 'Não foi possível entrar com o Google',
      appleFallback: 'Não foi possível entrar com a Apple',
      accountExistsTitle: 'A conta já existe',
      accountExistsMessage: 'Já existe uma conta com este e-mail.',
    },
    pendingDeletion: {
      title: 'Conta agendada para exclusão',
      message:
        'Sua conta está agendada para ser excluída em {{date}}. Deseja reativá-la?',
    },
    login: {
      newUserEyebrow: 'Experimente o Domani grátis antes de comprar',
      newUserTitle: 'Comece seu teste grátis de 14 dias',
      newUserSubtitle:
        'Acesso completo primeiro. Apenas uma compra vitalícia se quiser continuar.',
      stepStartLabel: 'Comece grátis hoje',
      stepStartBody: 'Seu teste completo de 14 dias começa assim que você se cadastrar.',
      stepKeepLabelWithPrice: 'Fique com ele por {{price}} uma vez',
      stepKeepLabelFallback: 'Fique com ele com uma compra vitalícia única',
      stepKeepBody: 'Sem cartão de crédito adiantado. Sem assinatura após o teste.',
      returningEyebrow: 'Retome de onde parou',
      returningTitle: 'Bem-vindo de volta',
      returningSubtitle: 'Entre para continuar planejando o seu amanhã.',
      returningCardTitle: 'Seus planos estão esperando por você.',
      returningCardBody: 'Entre para voltar às suas tarefas, lembretes e ao seu ritmo.',
      startTrialWithApple: 'Iniciar teste grátis com Apple',
      startTrialWithGoogle: 'Iniciar teste grátis com Google',
      continueWithApple: 'Continuar com Apple',
      continueWithGoogle: 'Continuar com Google',
      back: '← Voltar',
      trialConfirmEyebrow: 'Antes de continuar',
      trialConfirmTitle: 'Você está iniciando um teste grátis de 14 dias',
      trialConfirmBody:
        'Ao continuar, você cria sua conta e inicia seu teste grátis imediatamente.',
      trialConfirmPointTrial: 'Acesso completo por 14 dias',
      trialConfirmPointLifetimeWithPrice:
        'Depois {{price}} uma vez se quiser continuar com o Domani',
      trialConfirmPointLifetimeFallback:
        'Depois uma compra vitalícia única se quiser continuar com o Domani',
      trialConfirmPointNoCard: 'Nenhum cartão de crédito é necessário no início',
      cancel: 'Cancelar',
    },
  },
  onboarding: {
    notificationSetup: {
      eyebrow: 'Teste grátis de 14 dias',
      title: 'Seu teste começou',
      subtitle:
        'Explore o Domani com acesso completo agora e decida depois se quer acesso vitalício.',
      liveHeadline: 'Seu teste com acesso completo já está ativo',
      liveDetail: 'Defina seu lembrete da noite e comece a planejar o amanhã.',
      daysLeftHeadline: 'Você tem {{count}} dias para explorar o Domani',
      daysLeftDetail:
        'Seu teste vai até {{date}}. Defina seu lembrete da noite e comece a planejar o amanhã com acesso completo.',
      oneDayHeadline: 'Você tem 1 dia restante no seu teste',
      oneDayDetail:
        'Seu teste vai até {{date}}. Defina seu lembrete da noite e aproveite ao máximo seu último dia completo com o Domani.',
      endsTodayHeadline: 'Seu teste termina hoje',
      endsTodayDetail:
        'Seu acesso de teste vai até {{date}}. Defina seu lembrete da noite agora para não perder seu último dia com acesso completo.',
      planningReminderTitle: 'Lembrete de planejamento',
      planningReminderDescription: 'Escolha quando deseja ser lembrado.',
      toggleLabel: 'Envie-me um lembrete diário',
      taskRemindersTitle: 'Lembretes de tarefa',
      taskRemindersDescription:
        'Cada tarefa tem seu próprio lembrete. Você pode definir horários individuais ao criar ou editar tarefas.',
      continue: 'Continuar para o Domani',
    },
  },
  planning: {
    header: {
      planningFor: 'Planejando para',
    },
    reminder: {
      addReminder: 'Adicionar lembrete',
      reminderOn: 'Lembrete ativado',
      custom: 'Personalizado',
      pastTimeWarning: 'Esse horário já passou — nenhuma notificação será enviada',
    },
    rollover: {
      reminderTimes: 'Horários de lembrete',
      keepOriginalTimes: 'Manter horários originais',
      setNewReminderTimes: 'Definir novos horários de lembrete',
    },
  },
  settings: {
    reminderShortcuts: {
      title: 'Atalhos de lembrete',
      customizeTitle: 'Personalizar atalhos',
      description: 'Toque para alterar os horários predefinidos exibidos ao adicionar lembretes',
      shortcutLabel: 'Atalho {{count}}',
    },
  },
  analytics: {
    completionRate: 'Taxa de conclusão',
    tasksDone: '{{completed}} de {{total}} tarefas concluídas',
    lastNDays: 'Últimos {{count}} dias',
    byCategory: 'Por categoria',
    taskCount: '{{completed}}/{{total}} tarefas',
  },
  legal: {
    termsOfService: 'Termos de serviço',
    privacyPolicy: 'Política de privacidade',
    footer: ['Ao continuar, você concorda com nossos ', '{terms}', ' e ', '{privacy}'],
    unableToOpenLinkTitle: 'Não foi possível abrir o link',
    unableToOpenLinkMessage: 'Tente novamente mais tarde.',
  },
  welcome: {
    taglinePrimary: 'Planeje o seu amanhã esta noite.',
    taglineSecondary: 'Execute com foco.',
    startPlanning: 'Começar a planejar',
    returningCta: ['Já tem uma conta? ', '{signIn}'],
    signIn: 'Entrar',
  },
  subscription: {
    preTrial: {
      title: 'Bem-vindo ao Domani',
      body:
        'Comece seu teste grátis de 14 dias para explorar tudo o que o Domani oferece. Nenhum pagamento é necessário para começar — você decide se quer fazer upgrade e quando.',
      startTrial: 'Iniciar teste grátis de 14 dias',
      error: 'Não foi possível iniciar seu teste grátis. Tente novamente.',
      accountSettings: 'Configurações da conta',
    },
    locked: {
      refundedTitle: 'Seu acesso foi revogado',
      expiredTitle: 'Seu teste terminou',
      refundedBody:
        'Sua compra anterior foi reembolsada. Obtenha acesso vitalício para continuar usando o Domani.',
      expiredBody:
        'Obtenha acesso vitalício para continuar planejando seus dias com o Domani — uma compra e ele é seu para sempre.',
      getLifetimeAccess: 'Obter acesso vitalício',
      restorePurchases: 'Restaurar compras',
      restoreNotFound: 'Nenhuma compra anterior foi encontrada para esta conta.',
      restoreError: 'Não foi possível restaurar as compras. Tente novamente.',
      accountSettings: 'Configurações da conta',
    },
    paywall: {
      discountLabelEarlyAdopter: 'Preço para early adopter',
      discountLabelFriendsFamily: 'Preço para amigos e família',
      discountBadgeEarlyAdopter: '71% de desconto',
      discountBadgeFriendsFamily: '86% de desconto',
      valueProps: [
        'Tarefas diárias ilimitadas',
        'Planeje o amanhã esta noite',
        'Todos os recursos, para sempre',
        'Sem assinaturas, nunca',
      ],
      successProps: [
        'Planeje o amanhã esta noite',
        'Pequenas vitórias diárias criam hábitos duradouros',
        'Feito para manter seu foco, não sua correria',
        'A estratégia em que os melhores confiam',
      ],
      successTitle: 'Tudo pronto!',
      successBody: 'Acesso vitalício desbloqueado. Bem-vindo ao Domani.',
      successPrimaryCta: 'Começar a planejar',
      dismiss: 'Dispensar',
      close: 'Fechar',
      title: 'Obter acesso vitalício',
      subtitle: 'Uma compra. Seu para sempre.',
      purchaseCtaWithPrice: 'Obter acesso vitalício — {{price}}',
      purchaseCta: 'Obter acesso vitalício',
      purchaseErrorRetry: 'Algo deu errado com sua compra. Tente novamente.',
      purchaseErrorSupport:
        'Isso continua acontecendo. Entre em contato com o suporte se o problema persistir.',
      restoreNotFound: 'Nenhuma compra anterior foi encontrada para esta conta.',
      restoreError: 'Não foi possível restaurar as compras. Tente novamente.',
      contactSupport: 'Falar com o suporte',
      oneTimePurchaseNote: 'Compra única. Sem cobranças recorrentes.',
      restorePurchases: 'Restaurar compras',
    },
    settings: {
      sectionTitle: 'Seu plano',
      currentPlan: 'Plano atual',
      statusBeta: 'Beta tester',
      statusGracePeriod: 'Período beta',
      statusPreTrial: 'Sem plano ativo',
      statusExpired: 'Teste encerrado',
      statusRefunded: 'Reembolsado',
      statusTrialing: 'Teste',
      statusLifetime: 'Vitalício',
      betaBody:
        'Você tem acesso completo a tudo durante a fase beta. Obrigado por ajudar a testar o Domani!',
      gracePeriodOneDay: '1 dia restante no período beta',
      gracePeriodManyDays: '{{count}} dias restantes no período beta',
      gracePeriodBodyWithDate:
        'Seu acesso beta gratuito termina em {{date}}. Compre acesso vitalício para continuar usando o Domani depois disso.',
      gracePeriodBodyNoDate:
        'Seu acesso beta gratuito está terminando em breve. Compre acesso vitalício para continuar usando o Domani.',
      preTrialBody: 'Explore tudo o que o Domani tem a oferecer',
      startTrial: 'Iniciar teste grátis de 14 dias',
      expiredBody: 'Seu teste terminou — faça upgrade para continuar usando o Domani',
      refundedBody:
        'Sua compra foi reembolsada — obtenha acesso vitalício para continuar usando o Domani',
      trialingDaysRemaining: '{{count}} dias restantes no teste',
      trialingBodyWithDate: 'Tarefas ilimitadas - Todos os recursos liberados até {{date}}',
      trialingBodyNoDate: 'Tarefas ilimitadas - Todos os recursos liberados',
      lifetimeBody: 'Tarefas ilimitadas - Todos os recursos liberados para sempre',
      getLifetimeAccess: 'Obter acesso vitalício',
      restorePurchases: 'Restaurar compras',
    },
  },
}
