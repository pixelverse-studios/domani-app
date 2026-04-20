import type { TranslationCatalog } from '../types'

export const es: TranslationCatalog = {
  common: {
    today: 'Hoy',
    tomorrow: 'Mañana',
    uncategorized: 'Sin categoría',
    custom: 'Personalizada',
    selectTime: 'Seleccionar hora',
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
    reminderShortcuts: {
      title: 'Atajos de recordatorio',
      customizeTitle: 'Personalizar atajos',
      description: 'Toca para cambiar las horas predeterminadas que aparecen al agregar recordatorios',
      shortcutLabel: 'Atajo {{count}}',
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
