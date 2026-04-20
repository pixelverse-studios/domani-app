import type { TranslationCatalog } from '../types'

export const es: TranslationCatalog = {
  common: {
    today: 'Hoy',
    tomorrow: 'Mañana',
    uncategorized: 'Sin categoría',
    custom: 'Personalizada',
    selectTime: 'Seleccionar hora',
    notifications: 'Notificaciones',
    tabs: {
      today: 'Hoy',
      planning: 'Plan',
      feedback: 'Comentarios',
      progress: 'Progreso',
      settings: 'Ajustes',
    },
    actions: {
      cancel: 'Cancelar',
      close: 'Cerrar',
      save: 'Guardar',
      done: 'Listo',
      delete: 'Eliminar',
      deleting: 'Eliminando...',
      enable: 'Activar',
      disable: 'Desactivar',
      logOut: 'Cerrar sesión',
      keepAccount: 'Conservar cuenta',
      submit: 'Enviar',
      next: 'Siguiente',
      gotIt: 'Entendido',
      skipTour: 'Omitir recorrido',
      planToday: 'Planificar hoy',
      addTask: 'Agregar tarea',
      addMoreTasks: 'Agregar más tareas',
    },
    confirmation: {
      deleteDescription: '¿Seguro que quieres eliminar:',
      cannotUndo: 'Esto no se puede deshacer.',
    },
    errors: {
      title: 'Error',
      tryAgain: 'Inténtalo de nuevo.',
    },
  },
  greetings: {
    morning: 'Buenos días',
    afternoon: 'Buenas tardes',
    evening: 'Buenas noches',
  },
  categories: {
    system: {
      work: 'Trabajo',
      personal: 'Personal',
      wellness: 'Bienestar',
      home: 'Hogar',
    },
  },
  auth: {
    actions: {
      ok: 'Aceptar',
      reactivate: 'Reactivar',
      keepDeletion: 'Mantener eliminación',
    },
    errors: {
      signInTitle: 'Error al iniciar sesión',
      googleFallback: 'No se pudo iniciar sesión con Google',
      appleFallback: 'No se pudo iniciar sesión con Apple',
      accountExistsTitle: 'La cuenta ya existe',
      accountExistsMessage: 'Ya existe una cuenta con este correo electrónico.',
    },
    pendingDeletion: {
      title: 'Cuenta programada para eliminación',
      message: 'Tu cuenta está programada para eliminarse el {{date}}. ¿Quieres reactivarla?',
    },
    login: {
      newUserEyebrow: 'Prueba Domani gratis antes de comprarlo',
      newUserTitle: 'Comienza tu prueba gratuita de 14 días',
      newUserSubtitle:
        'Acceso completo primero. Una sola compra de por vida solo si decides quedártelo.',
      stepStartLabel: 'Empieza gratis hoy',
      stepStartBody: 'Tu prueba completa de 14 días comienza en cuanto te registras.',
      stepKeepLabelWithPrice: 'Consérvalo por {{price}} una sola vez',
      stepKeepLabelFallback: 'Consérvalo con una compra única de por vida',
      stepKeepBody: 'Sin tarjeta de crédito al inicio. Sin suscripción después de la prueba.',
      returningEyebrow: 'Retoma justo donde lo dejaste',
      returningTitle: 'Bienvenido de nuevo',
      returningSubtitle: 'Inicia sesión para seguir planificando tu mañana.',
      returningCardTitle: 'Tus planes te están esperando.',
      returningCardBody: 'Inicia sesión para volver a tus tareas, recordatorios y tu impulso.',
      startTrialWithApple: 'Iniciar prueba gratis con Apple',
      startTrialWithGoogle: 'Iniciar prueba gratis con Google',
      continueWithApple: 'Continuar con Apple',
      continueWithGoogle: 'Continuar con Google',
      back: '← Volver',
      trialConfirmEyebrow: 'Antes de continuar',
      trialConfirmTitle: 'Estás iniciando una prueba gratuita de 14 días',
      trialConfirmBody:
        'Al continuar, crearás tu cuenta e iniciarás tu prueba gratuita de inmediato.',
      trialConfirmPointTrial: 'Acceso completo durante 14 días',
      trialConfirmPointLifetimeWithPrice:
        'Después {{price}} una sola vez si quieres conservar Domani',
      trialConfirmPointLifetimeFallback:
        'Después una compra única de por vida si quieres conservar Domani',
      trialConfirmPointNoCard: 'No se requiere tarjeta de crédito al inicio',
      cancel: 'Cancelar',
    },
  },
  onboarding: {
    notificationSetup: {
      eyebrow: 'Prueba gratuita de 14 días',
      title: 'Tu prueba ha comenzado',
      subtitle:
        'Explora Domani con acceso completo ahora y decide más adelante si quieres acceso de por vida.',
      liveHeadline: 'Tu prueba con acceso completo ya está activa',
      liveDetail: 'Configura tu recordatorio nocturno y luego empieza a planificar mañana.',
      daysLeftHeadline: 'Te quedan {{count}} días para explorar Domani',
      daysLeftDetail:
        'Tu prueba continúa hasta el {{date}}. Configura tu recordatorio nocturno y luego empieza a planificar mañana con acceso completo.',
      oneDayHeadline: 'Te queda 1 día de prueba',
      oneDayDetail:
        'Tu prueba continúa hasta el {{date}}. Configura tu recordatorio nocturno y aprovecha al máximo tu último día completo con Domani.',
      endsTodayHeadline: 'Tu prueba termina hoy',
      endsTodayDetail:
        'Tu acceso de prueba continúa hasta el {{date}}. Configura ahora tu recordatorio nocturno para no perder tu último día con acceso completo.',
      planningReminderTitle: 'Recordatorio de planificación',
      planningReminderDescription: 'Elige cuándo quieres recibir el recordatorio.',
      toggleLabel: 'Envíame un recordatorio diario',
      taskRemindersTitle: 'Recordatorios de tareas',
      taskRemindersDescription:
        'Cada tarea tiene su propio recordatorio. Puedes configurar horas de recordatorio individuales al crear o editar tareas.',
      continue: 'Continuar a Domani',
    },
  },
  planning: {
    header: {
      planningFor: 'Planificando para',
    },
    emptyState: {
      plannedTasks: 'Tareas planificadas',
      noTasks: 'Aún no hay tareas planificadas',
    },
    reminder: {
      addReminder: 'Agregar recordatorio',
      reminderOn: 'Recordatorio activado',
      custom: 'Personalizado',
      pastTimeWarning: 'Esta hora ya pasó; no se enviará ninguna notificación',
    },
    rollover: {
      reminderTimes: 'Horas de recordatorio',
      keepOriginalTimes: 'Mantener horarios originales',
      setNewReminderTimes: 'Configurar nuevas horas de recordatorio',
    },
  },
  settings: {
    screenTitle: 'Configuración',
    logOutConfirmTitle: 'Cerrar sesión',
    logOutConfirmMessage: '¿Seguro que quieres cerrar sesión?',
    restoreFailedTitle: 'Error al restaurar',
    restoreFailedMessage: 'No se pudieron restaurar las compras. Inténtalo de nuevo.',
    deletionScheduleFailed: 'No se pudo programar la eliminación de la cuenta. Inténtalo de nuevo.',
    deletionCancelFailed: 'No se pudo cancelar la eliminación. Inténtalo de nuevo.',
    planningTimeSaveFailed: 'No se pudo guardar la hora de planificación. Inténtalo de nuevo.',
    notificationToggleFailed:
      'No se pudo actualizar la configuración de notificaciones. Inténtalo de nuevo.',
    nameModal: {
      title: 'Editar nombre',
      placeholder: 'Ingresa tu nombre',
    },
    timezoneModal: {
      title: 'Seleccionar zona horaria',
    },
    planningTimeModal: {
      title: 'Recordatorio de planificación',
      description: 'Recibe un recordatorio para planificar las tareas de mañana',
    },
    favoriteCategories: {
      title: 'Categorías favoritas',
      managedSmartly: 'Gestionadas automáticamente',
      selectedCount: '{{count}} seleccionadas',
      quickAccessTitle: 'Categorías de acceso rápido',
      quickAccessDescription:
        'Selecciona hasta {{count}} categorías para mostrarlas por defecto al agregar tareas',
      reorderHint: 'Mantén presionado y arrastra para reordenar',
    },
    dangerZone: {
      title: 'Zona de peligro',
      pendingTitle: 'Cuenta programada para eliminación',
      daysRemaining: 'Quedan {{count}} días',
      deletionMessagePrefix: 'Tu cuenta se eliminará permanentemente el ',
      deletionMessageSuffix: '. Inicia sesión antes de esa fecha para reactivarla.',
      cancelDeletion: 'Cancelar eliminación',
      deleteAccount: 'Eliminar cuenta',
    },
    deleteAccountModal: {
      title: '¿Eliminar tu cuenta?',
      description:
        'Tu cuenta y todos tus datos se eliminarán permanentemente después de 30 días. Puedes iniciar sesión antes de esa fecha para reactivar tu cuenta.',
      listTitle: 'Esto eliminará permanentemente:',
      listPlansTasks: 'Todos tus planes y tareas',
      listCustomCategories: 'Categorías personalizadas',
      listProgressHistory: 'Historial de progreso',
      listAccountSettings: 'Configuración de la cuenta',
    },
    smartCategoriesModal: {
      enableTitle: '¿Activar categorías inteligentes?',
      disableTitle: '¿Desactivar categorías inteligentes?',
      enableDescription:
        'Tus categorías de acceso rápido se adaptarán automáticamente según tus patrones de uso. Esto reemplazará tus categorías favoritas actuales.',
      disableDescription:
        'Tus categorías volverán al orden manual. Puedes reordenarlas desde Categorías favoritas.',
    },
    reminderShortcuts: {
      title: 'Atajos de recordatorio',
      customizeTitle: 'Personalizar atajos',
      description: 'Toca para cambiar las horas predeterminadas que aparecen al agregar recordatorios',
      shortcutLabel: 'Atajo {{count}}',
    },
  },
  today: {
    namePrompt: {
      title: '¿Cómo deberíamos llamarte?',
      description: 'Agrega tu nombre para personalizar tu experiencia',
      saveFailedTitle: 'No se pudo guardar el nombre',
      saveFailedMessage: 'Inténtalo de nuevo.',
    },
    progress: {
      placeholder: 'Tu progreso se registrará aquí una vez que agregues tareas',
      title: 'Progreso de hoy',
      completed: 'Completadas',
      unfinished: 'Pendientes',
    },
    emptyState: {
      title: 'Aún no hay tareas planificadas',
    },
    focus: {
      allDoneLabel: '¡Todo listo!',
      allDoneMessage: 'Hoy la rompiste',
      focusLabel: 'Enfoque de hoy',
      planDayMessage: 'Planifica tu día',
      addTasksSubtitle: 'Agrega tareas para comenzar',
      mostImportantTask: 'Tu tarea más importante',
      vibeLabel: 'Vibra de hoy',
      themeSuffix: ', luego enfócate en {{phrase}}',
      themePhrases: {
        work: 'productividad',
        wellness: 'bienestar',
        personal: 'tiempo personal',
        learning: 'aprendizaje',
        balanced: 'equilibrio',
      },
    },
    dayThemes: {
      work: {
        title: 'Día productivo',
        subtitle: 'Cabeza abajo, resultados por delante',
      },
      wellness: {
        title: 'Día de autocuidado',
        subtitle: 'Invirtiendo en ti',
      },
      personal: {
        title: 'Día de vida diaria',
        subtitle: 'Atendiendo lo que importa',
      },
      learning: {
        title: 'Día de crecimiento',
        subtitle: 'Expandiendo tus horizontes',
      },
      balanced: {
        title: 'Día equilibrado',
        subtitle: 'Un día completo por delante',
      },
    },
  },
  feedback: {
    categories: {
      bugReport: 'Reporte de error',
      featureIdea: 'Idea de función',
      whatILove: 'Lo que me encanta',
      general: 'General',
    },
    title: 'Comparte tu opinión',
    subtitle: 'Ayúdanos a mejorar Domani. Tus comentarios guían nuestro desarrollo.',
    categoryPrompt: '¿Qué te gustaría compartir?',
    messageLabel: 'Tu mensaje',
    disabledMessage: 'Selecciona una categoría para comenzar',
    placeholders: {
      bugReport: 'Describe el error que encontraste...',
      featureIdea: 'Cuéntanos tu idea de función...',
      whatILove: 'Comparte lo que te encanta de Domani...',
      general: 'Comparte tus ideas con nosotros...',
    },
    submitCta: 'Enviar comentarios',
    submitFailedTitle: 'No se pudieron enviar los comentarios',
    success: {
      title: '¡Comentarios recibidos!',
      message:
        'Gracias por compartir tu opinión. Hemos recibido tu mensaje y lo revisaremos pronto. Tus comentarios nos ayudan a construir un mejor Domani.',
      action: 'Enviar más comentarios',
      bannerTitle: '¡Te lo agradecemos!',
      bannerDescription:
        'Cada comentario importa. Estás ayudando a dar forma al futuro de la productividad.',
    },
    betaBanner: {
      title: '¡Eres beta tester!',
      description:
        'Tus comentarios moldean directamente el futuro de Domani. Nuestro equipo lee cada envío y eso ayuda a priorizar lo que construiremos después.',
    },
  },
  support: {
    categories: {
      technicalIssue: 'Problema técnico',
      accountHelp: 'Ayuda con la cuenta',
      billingQuestion: 'Pregunta de facturación',
      other: 'Otro',
    },
    title: 'Contactar soporte',
    subtitle: 'Envía una solicitud y recibe ayuda personalizada de nuestro equipo',
    categoryPrompt: '¿Con qué necesitas ayuda?',
    issueLabel: 'Describe tu problema',
    disabledMessage: 'Selecciona una categoría para comenzar',
    placeholders: {
      technicalIssue: 'Describe el problema técnico que estás experimentando.',
      accountHelp: 'Describe qué ayuda necesitas con tu cuenta.',
      billingQuestion: 'Describe tu pregunta o inquietud de facturación.',
      other: 'Describe con qué necesitas ayuda.',
    },
    submitCta: 'Enviar solicitud de soporte',
    submitFailedTitle: 'No se pudo enviar la solicitud',
    success: {
      message:
        'Hemos recibido tu solicitud de soporte y nuestro equipo te responderá dentro de 24 horas. Revisa tu correo para ver actualizaciones.',
      action: 'Enviar otra solicitud',
      bannerTitle: '¡Estamos en ello!',
      bannerDescription:
        'Tu ticket fue asignado a nuestro equipo de soporte. Lo investigaremos y responderemos lo antes posible.',
    },
    responseBanner: {
      title: 'Tiempo de respuesta rápido',
      description:
        'Nuestro equipo de soporte suele responder dentro de 24 horas. Todas las solicitudes se atienden con cuidado y atención.',
    },
  },
  tutorial: {
    progress: '{{current}} de {{total}}',
    steps: {
      planTodayButtonTitle: 'Planifica tu día',
      planTodayButtonDescription: 'Toca aquí para agregar tu primera tarea de hoy.',
      todayAddTaskButtonTitle: 'Agregar más tareas',
      todayAddTaskButtonDescription:
        'Esta es tu vista de Hoy con tareas existentes. Toca aquí para agregar otra tarea.',
      titleInputTitle: 'Nombra tu tarea',
      titleInputDescription: 'Hazlo breve y accionable.',
      categorySelectorTitle: 'Crea una categoría personalizada',
      categorySelectorDescription: 'Toca "+ New" para crear tu primera categoría personalizada.',
      createCategoryTitle: 'Crea la tuya',
      createCategoryDescription: 'Toca "+ New" para agregar una categoría personalizada.',
      moreCategoriesButtonTitle: 'Ver todas las categorías',
      moreCategoriesButtonDescription: 'Toca aquí para ver y gestionar todas tus categorías.',
      prioritySelectorTitle: 'Define tu prioridad',
      prioritySelectorDescription: '¿Qué tan importante es esta tarea?',
      topPriorityTitle: 'Tu prioridad número 1',
      topPriorityDescription:
        'Esto se convierte en tu tarea más importante: lo único que debes completar hoy.',
      dayToggleTitle: 'Planifica con anticipación',
      dayToggleDescription: 'Programa para hoy o prepara mañana esta noche.',
      completeFormTitle: 'Termina',
      completeFormDescription:
        'Las notas y los recordatorios son opcionales. Toca "Add Task" para crear tu primera tarea.',
      taskCreatedTitle: '¡Tarea creada!',
      taskCreatedDescription:
        'Aquí está tu tarea. Fíjate en la categoría y la prioridad. Ahora veámosla en tu pantalla de Hoy.',
      todayScreenTitle: 'Tu vista de enfoque',
      todayScreenDescription:
        'Tu tarea más importante y tu progreso diario viven aquí. Ahora exploremos algunas configuraciones útiles.',
      settingsCategoriesTitle: 'Categorías inteligentes',
      settingsCategoriesDescription:
        '¡Bienvenido a Configuración! Categorías inteligentes aprende tus hábitos y ordena automáticamente tus favoritas. Puedes desactivarlo para elegirlas manualmente.',
      settingsRemindersTitle: 'Atajos de recordatorio',
      settingsRemindersDescription:
        'Configura atajos rápidos para horas comunes como mañana, tarde o noche.',
    },
  },
  analytics: {
    completionRate: 'Tasa de finalización',
    tasksDone: '{{completed}} de {{total}} tareas completadas',
    lastNDays: 'Últimos {{count}} días',
    byCategory: 'Por categoría',
    taskCount: '{{completed}}/{{total}} tareas',
  },
  legal: {
    termsOfService: 'Términos del servicio',
    privacyPolicy: 'Política de privacidad',
    footer: ['Al continuar, aceptas nuestros ', '{terms}', ' y nuestra ', '{privacy}'],
    unableToOpenLinkTitle: 'No se puede abrir el enlace',
    unableToOpenLinkMessage: 'Inténtalo de nuevo más tarde.',
  },
  welcome: {
    taglinePrimary: 'Planifica tu mañana esta noche.',
    taglineSecondary: 'Ejecuta con enfoque.',
    startPlanning: 'Empezar a planificar',
    returningCta: ['¿Ya tienes una cuenta? ', '{signIn}'],
    signIn: 'Iniciar sesión',
  },
  subscription: {
    preTrial: {
      title: 'Bienvenido a Domani',
      body: 'Comienza tu prueba gratuita de 14 días para explorar todo lo que Domani ofrece. No se requiere pago para empezar; tú decides si quieres mejorar y cuándo.',
      startTrial: 'Iniciar prueba gratuita de 14 días',
      error: 'No se pudo iniciar tu prueba gratuita. Inténtalo de nuevo.',
      accountSettings: 'Configuración de la cuenta',
    },
    locked: {
      refundedTitle: 'Tu acceso ha sido revocado',
      expiredTitle: 'Tu prueba ha terminado',
      refundedBody:
        'Tu compra anterior fue reembolsada. Obtén acceso de por vida para seguir usando Domani.',
      expiredBody:
        'Obtén acceso de por vida para seguir planificando tus días con Domani: una compra y es tuyo para siempre.',
      getLifetimeAccess: 'Obtener acceso de por vida',
      restorePurchases: 'Restaurar compras',
      restoreNotFound: 'No se encontraron compras anteriores para esta cuenta.',
      restoreError: 'No se pudieron restaurar las compras. Inténtalo de nuevo.',
      accountSettings: 'Configuración de la cuenta',
    },
    paywall: {
      discountLabelEarlyAdopter: 'Precio para primeros usuarios',
      discountLabelFriendsFamily: 'Precio para amigos y familia',
      discountBadgeEarlyAdopter: '71% de descuento',
      discountBadgeFriendsFamily: '86% de descuento',
      valueProps: [
        'Tareas diarias ilimitadas',
        'Planifica mañana esta noche',
        'Todas las funciones, para siempre',
        'Sin suscripciones, nunca',
      ],
      successProps: [
        'Planifica mañana esta noche',
        'Las pequeñas victorias diarias crean hábitos duraderos',
        'Diseñado para mantenerte enfocado, no ocupado',
        'La estrategia en la que confían los mejores',
      ],
      successTitle: '¡Todo listo!',
      successBody: 'Acceso de por vida desbloqueado. Bienvenido a Domani.',
      successPrimaryCta: 'Empezar a planificar',
      dismiss: 'Cerrar',
      close: 'Cerrar',
      title: 'Obtener acceso de por vida',
      subtitle: 'Una compra. Tuyo para siempre.',
      purchaseCtaWithPrice: 'Obtener acceso de por vida — {{price}}',
      purchaseCta: 'Obtener acceso de por vida',
      purchaseErrorRetry: 'Algo salió mal con tu compra. Inténtalo de nuevo.',
      purchaseErrorSupport:
        'Esto sigue ocurriendo. Ponte en contacto con soporte si el problema continúa.',
      restoreNotFound: 'No se encontraron compras anteriores para esta cuenta.',
      restoreError: 'No se pudieron restaurar las compras. Inténtalo de nuevo.',
      contactSupport: 'Contactar con soporte',
      oneTimePurchaseNote: 'Compra única. Sin cargos recurrentes.',
      restorePurchases: 'Restaurar compras',
    },
    settings: {
      sectionTitle: 'Tu plan',
      currentPlan: 'Plan actual',
      statusBeta: 'Beta tester',
      statusGracePeriod: 'Gracia beta',
      statusPreTrial: 'Sin plan activo',
      statusExpired: 'Prueba terminada',
      statusRefunded: 'Reembolsado',
      statusTrialing: 'Prueba',
      statusLifetime: 'De por vida',
      betaBody:
        'Tienes acceso completo a todo durante la beta. ¡Gracias por ayudar a probar Domani!',
      gracePeriodOneDay: 'Queda 1 día del período de gracia beta',
      gracePeriodManyDays: 'Quedan {{count}} días del período de gracia beta',
      gracePeriodBodyWithDate:
        'Tu acceso beta gratuito termina el {{date}}. Compra acceso de por vida para seguir usando Domani después.',
      gracePeriodBodyNoDate:
        'Tu acceso beta gratuito terminará pronto. Compra acceso de por vida para seguir usando Domani.',
      preTrialBody: 'Explora todo lo que Domani tiene para ofrecer',
      startTrial: 'Iniciar prueba gratuita de 14 días',
      expiredBody: 'Tu prueba ha terminado; mejora para seguir usando Domani',
      refundedBody: 'Tu compra fue reembolsada; obtén acceso de por vida para seguir usando Domani',
      trialingDaysRemaining: 'Quedan {{count}} días de prueba',
      trialingBodyWithDate:
        'Tareas ilimitadas - Todas las funciones desbloqueadas hasta el {{date}}',
      trialingBodyNoDate: 'Tareas ilimitadas - Todas las funciones desbloqueadas',
      lifetimeBody: 'Tareas ilimitadas - Todas las funciones desbloqueadas para siempre',
      getLifetimeAccess: 'Obtener acceso de por vida',
      restorePurchases: 'Restaurar compras',
    },
  },
}
