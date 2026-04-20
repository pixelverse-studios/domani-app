import type { TranslationCatalog } from '../types'

export const es: TranslationCatalog = {
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
}
