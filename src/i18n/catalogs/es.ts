import type { TranslationCatalog } from '../types'

export const es: TranslationCatalog = {
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
      subtitle: 'Todo está desbloqueado. Explora libremente durante 14 días y luego decide.',
      planningReminderTitle: 'Recuérdame planificar',
      planningReminderDescription: 'Elige cuándo quieres recibir el recordatorio.',
      toggleLabel: 'Recuérdame planificar',
      taskRemindersTitle: 'Recordatorios de tareas',
      taskRemindersDescription:
        'Configura recordatorios individuales en cada tarea al crearla o editarla.',
      continue: 'Continuar a Domani',
    },
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
        'Planificación nocturna, claridad matutina.',
        'Todas las funciones, para siempre',
        'Sin suscripciones, nunca',
      ],
      successProps: [
        'Las pequeñas victorias diarias crean hábitos duraderos',
        'Diseñado para mantenerte enfocado, no ocupado',
        'La estrategia en la que confían los mejores',
      ],
      successTitle: '¡Todo listo!',
      successBodyLine1: 'Acceso de por vida desbloqueado.',
      successBodyWelcomePrefix: '¡Bienvenido a ',
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
    purchaseHelp: {
      title: 'Ayuda con compras',
      subtitle:
        'Llega al siguiente paso correcto para reembolsos, restauraciones y preguntas de facturación desde una sola pantalla compartida de Domani.',
      iosEyebrow: 'Compra de Apple',
      iosTitle: '¿Buscas un reembolso?',
      iosBody:
        'Los reembolsos de compras en iPhone los gestiona Apple. Podemos llevarte directamente al flujo de reembolso de Apple para tu compra de Domani.',
      iosUnavailableBody:
        'No pudimos encontrar una compra activa de Apple en este dispositivo o cuenta para enviar una solicitud de reembolso en este momento.',
      iosNoteTitle: 'Qué pasa después',
      iosNoteBody:
        'Apple revisa las solicitudes de reembolso directamente. La aprobación no es instantánea y normalmente te informan después con la decisión.',
      iosUnavailableNoteTitle: 'Solicitud de reembolso no disponible',
      iosUnavailableNoteBody:
        'Normalmente esto significa que no hay una compra activa del App Store vinculada a esta cuenta o dispositivo. Soporte puede ayudarte a revisar el estado de la compra.',
      iosRefundCta: 'Solicitar reembolso',
      iosSupportBody:
        'Usa soporte si la hoja de reembolso de Apple no se abre o si tu situación de compra no parece correcta.',
      iosUnavailableSupportBody:
        'Contacta con soporte si esta cuenta debería tener una compra activa de Apple o si necesitas ayuda para volver a vincular el estado correcto de la compra.',
      iosRefundSuccessTitle: 'Solicitud de reembolso abierta',
      iosRefundSuccessBody:
        'Apple ya está gestionando tu solicitud de reembolso. La revisarán y te avisarán con el resultado.',
      iosSubmittedTitle: 'Solicitud de reembolso enviada',
      iosSubmittedBody:
        'Apple está revisando tu solicitud ahora. Si se aprueba, el acceso de Domani se actualizará cuando el reembolso se procese.',
      iosSubmittedNoteTitle: 'Qué esperar',
      iosSubmittedNoteBody:
        'Apple gestiona la decisión del reembolso. Es posible que no veas el resultado de inmediato y que el acceso tarde un poco en actualizarse después de su decisión.',
      iosSubmittedDoneCta: 'Volver a Ajustes',
      iosSubmittedSupportBody:
        'Contacta con soporte si tu acceso no se actualiza más tarde o si necesitas ayuda para entender el resultado del reembolso.',
      iosPendingTitle: 'La solicitud de reembolso ya está en revisión',
      iosPendingBody:
        'Apple sigue revisando esta solicitud de reembolso, o ya tomó una decisión que todavía se está propagando.',
      iosPendingNoteTitle: 'Qué significa esto',
      iosPendingNoteBody:
        'No necesitas enviar otra solicitud de reembolso ahora mismo. Apple continuará el proceso de revisión desde la solicitud original.',
      iosPendingSupportBody:
        'Contacta con soporte si este estado parece incorrecto o si tu acceso a Domani no se actualiza después de que Apple termine la revisión.',
      iosExistingRequestTitle: 'Ya existe una solicitud de reembolso',
      iosExistingRequestBody:
        'Apple ya recibió una solicitud de reembolso para esta compra. El resultado puede seguir en curso, o el estado final todavía puede estar actualizándose.',
      iosExistingRequestNoteTitle: 'Qué significa esto',
      iosExistingRequestNoteBody:
        'No necesitas enviar otra solicitud de reembolso ahora mismo. Vuelve a comprobarlo más tarde o contacta con soporte si tu acceso a Domani sigue viéndose incorrecto.',
      iosExistingRequestSupportBody:
        'Contacta con soporte si esta compra ya debería aparecer como reembolsada o si tu acceso sigue viéndose incorrecto más tarde.',
      iosApprovedTitle: 'Reembolso completado',
      iosApprovedBody:
        'Apple ya completó este reembolso. Si tu acceso todavía no se ha actualizado, debería refrescarse en breve.',
      iosApprovedNoteTitle: 'Qué significa esto',
      iosApprovedNoteBody:
        'No necesitas solicitar otro reembolso. Si quieres volver a usar Domani cuando se elimine el acceso, puedes comprar acceso de por vida otra vez.',
      iosApprovedDoneCta: 'Volver a Ajustes',
      iosApprovedSupportBody:
        'Contacta con soporte si tu acceso sigue viéndose incorrecto después de que el reembolso ya se haya completado.',
      iosDeniedTitle: 'El reembolso no fue aprobado',
      iosDeniedBody:
        'Apple no aprobó la última solicitud de reembolso para esta compra. Si todavía crees que algo está mal, contacta con soporte.',
      iosDeniedNoteTitle: 'Qué significa esto',
      iosDeniedNoteBody:
        'Esta compra sigue apareciendo como activa, así que Domani no ha eliminado el acceso. Soporte puede ayudarte si el resultado parece incorrecto.',
      iosDeniedDoneCta: 'Volver a Ajustes',
      iosDeniedSupportBody:
        'Contacta con soporte si necesitas ayuda para entender la decisión o si este estado de compra parece incorrecto.',
      iosRefundErrorTitle: 'No se pudo abrir el flujo de reembolso de Apple',
      iosRefundErrorBody:
        'No pudimos abrir la solicitud de reembolso de Apple en este momento. Inténtalo de nuevo o contacta con soporte si sigues necesitando ayuda.',
      iosRefundedEyebrow: 'Compra reembolsada',
      iosRefundedTitle: 'Tu acceso fue eliminado',
      iosRefundedBody:
        'Esta compra de iPhone ya fue reembolsada. Para volver a desbloquear Domani, tendrás que comprar acceso de por vida otra vez.',
      iosRefundedNoteTitle: 'Ya fue reembolsada',
      iosRefundedNoteBody:
        'Cuando Apple reembolsa la compra, el acceso se elimina. Si quieres usar Domani otra vez, tendrás que comprar acceso de por vida de nuevo.',
      iosRepurchaseCta: 'Obtener acceso de por vida otra vez',
      iosRefundedSupportBody:
        'Contacta con soporte si tu estado de reembolso parece incorrecto o necesitas ayuda para entender qué pasó.',
      platformNote:
        'Las opciones de reembolso y facturación son distintas en iPhone y Android. Domani te guiará por la ruta de soporte correcta para tu dispositivo.',
      iosActionTitle: 'Solicitar ayuda de reembolso en iPhone',
      iosActionBody:
        'Usa esta ruta si necesitas ayuda con una compra de Apple, una solicitud de reembolso o una pregunta de facturación relacionada con tu transacción del App Store.',
      iosActionCta: 'Continuar con ayuda de compra de Apple',
      androidTitle: '¿Necesitas ayuda con una compra de Google Play?',
      androidBody:
        'Google Play gestiona las solicitudes de reembolso en Android. Podemos llevarte al historial de pedidos de Google Play para que informes un problema con esta compra de Domani.',
      androidNoteTitle: 'Qué pasa después',
      androidNoteBody:
        'Google Play normalmente decide las solicitudes de reembolso en 1–4 días. Si ya pasaron más de 48 horas o el estado de tu compra sigue viéndose incorrecto, contacta con soporte.',
      androidRefundCta: 'Abrir ayuda de reembolso de Google Play',
      androidSupportBody:
        'Contacta con soporte si el flujo de Google Play no se abre, tu compra no aparece o el resultado no coincide con tu acceso en Domani.',
      androidUnavailableTitle: '¿Necesitas ayuda de facturación en Android?',
      androidUnavailableBody:
        'Esta cuenta no parece tener actualmente una compra activa y pagada de Google Play, así que Domani no puede abrir una ruta de reembolso desde aquí ahora mismo.',
      androidUnavailableNoteTitle: 'Qué significa esto',
      androidUnavailableNoteBody:
        'Si esperabas una compra de Google Play en esta cuenta, soporte puede ayudarte a verificar el estado de la compra y el siguiente paso.',
      androidUnavailableSupportBody:
        'Contacta con soporte si esta cuenta de Android ya debería tener vinculada una compra activa de Google Play.',
      androidOpenErrorTitle: 'No se pudo abrir Google Play',
      androidOpenErrorBody:
        'No pudimos abrir el flujo de reembolso de Google Play en este momento. Inténtalo de nuevo o contacta con soporte si sigues necesitando ayuda.',
      androidRefundedTitle: 'Tu acceso fue eliminado',
      androidRefundedBody:
        'Esta compra de Android ya fue reembolsada. Para volver a desbloquear Domani, tendrás que comprar acceso de por vida otra vez.',
      androidRefundedNoteTitle: 'Ya fue reembolsada',
      androidRefundedNoteBody:
        'Cuando Google Play reembolsa la compra, el acceso se elimina. Si quieres usar Domani otra vez, tendrás que comprar acceso de por vida de nuevo.',
      androidRepurchaseCta: 'Obtener acceso de por vida otra vez',
      androidRefundedSupportBody:
        'Contacta con soporte si tu estado de reembolso en Android parece incorrecto o necesitas ayuda para entender qué pasó.',
      androidActionTitle: 'Obtener ayuda de facturación en Android',
      androidActionBody:
        'Usa esta ruta si necesitas ayuda con una compra de Google Play, un problema de facturación o una pregunta sobre compras en Android.',
      androidActionCta: 'Continuar con ayuda de facturación de Android',
      restoreTitle: 'Restaurar una compra anterior',
      restoreBody:
        'Si ya compraste acceso de por vida con esta cuenta, intenta restaurarlo primero antes de abrir una solicitud de soporte.',
      restoreCta: 'Restaurar compras',
      restoreNotFoundTitle: 'No se encontraron compras',
      restoreNotFoundBody: 'No pudimos encontrar una compra anterior para esta cuenta.',
      restoreErrorTitle: 'Falló la restauración',
      restoreErrorBody: 'No se pudieron restaurar las compras. Inténtalo de nuevo.',
      helpWithTitle: 'Esta pantalla puede ayudarte con',
      helpTopics: [
        'Preguntas sobre reembolsos y siguientes pasos',
        'Restaurar una compra anterior',
        'Problemas de facturación o recibos',
        'Enviarte a la ruta de soporte correcta para tu plataforma',
      ],
      contactSupportCta: 'Contactar con soporte',
      entryCta: 'Ayuda con compras',
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
      lifetimePurchaseHelpBody:
        'Obtén ayuda con tu compra de Apple o Google, incluida la orientación sobre reembolsos.',
      getLifetimeAccess: 'Obtener acceso de por vida',
      restorePurchases: 'Restaurar compras',
    },
  },
}
