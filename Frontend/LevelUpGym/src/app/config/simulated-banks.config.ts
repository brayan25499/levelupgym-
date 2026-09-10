export interface BankConfig {
  id: string;
  name: string;
  type: 'wallet' | 'traditional';
  primaryColor: string;
  accentColor: string;
  logoIcon: string;
  credentials: {
    usernameOrPhone: string;
    password: string;
    authCode: string;
  };
  labels: {
    loginTitle: string;
    userFieldLabel: string;
    userFieldPlaceholder: string;
    passwordFieldLabel: string;
    authCodeTitle: string;
    authCodeLabel: string;
    authCodePlaceholder: string;
  };
}

export const SIMULATED_BANK_CREDENTIALS: Record<string, BankConfig> = {
  'Nequi': {
    id: 'nequi',
    name: 'Nequi',
    type: 'wallet',
    primaryColor: '#e00070',
    accentColor: '#1d0034',
    logoIcon: '📱',
    credentials: {
      usernameOrPhone: '3001234567',
      password: '123456',
      authCode: '654321'
    },
    labels: {
      loginTitle: 'Portal Simulado Nequi',
      userFieldLabel: 'Número de Celular',
      userFieldPlaceholder: 'Ej: 3001234567',
      passwordFieldLabel: 'Contraseña Nequi (6 dígitos)',
      authCodeTitle: 'Clave Dinámica Nequi',
      authCodeLabel: 'Ingresa la clave dinámica de tu app Nequi',
      authCodePlaceholder: '654321'
    }
  },
  'Daviplata': {
    id: 'daviplata',
    name: 'Daviplata',
    type: 'wallet',
    primaryColor: '#ed1c24',
    accentColor: '#1e1e1e',
    logoIcon: '🔴',
    credentials: {
      usernameOrPhone: '3001234567',
      password: '123456',
      authCode: '654321'
    },
    labels: {
      loginTitle: 'Portal Simulado Daviplata',
      userFieldLabel: 'Número de Celular',
      userFieldPlaceholder: 'Ej: 3001234567',
      passwordFieldLabel: 'Clave Daviplata',
      authCodeTitle: 'Código de Confirmación',
      authCodeLabel: 'Ingresa el código OTP enviado a tu Daviplata',
      authCodePlaceholder: '654321'
    }
  },
  'Bancolombia': {
    id: 'bancolombia',
    name: 'Bancolombia',
    type: 'traditional',
    primaryColor: '#fdda24',
    accentColor: '#000000',
    logoIcon: '🟡',
    credentials: {
      usernameOrPhone: 'usuario.demo',
      password: '123456',
      authCode: '654321'
    },
    labels: {
      loginTitle: 'Sucursal Virtual Personas Bancolombia',
      userFieldLabel: 'Usuario de Banca Virtual',
      userFieldPlaceholder: 'Ej: usuario.demo',
      passwordFieldLabel: 'Contraseña Clave Principal',
      authCodeTitle: 'Código de Autorización Bancolombia',
      authCodeLabel: 'Ingresa la Clave Dinámica de tu App Bancolombia',
      authCodePlaceholder: '654321'
    }
  },
  'Banco de Bogotá': {
    id: 'bancodebogota',
    name: 'Banco de Bogotá',
    type: 'traditional',
    primaryColor: '#002b49',
    accentColor: '#00b0ff',
    logoIcon: '🏛️',
    credentials: {
      usernameOrPhone: 'usuario.demo',
      password: '123456',
      authCode: '654321'
    },
    labels: {
      loginTitle: 'Banca Virtual Banco de Bogotá',
      userFieldLabel: 'Usuario o Número de Identificación',
      userFieldPlaceholder: 'Ej: usuario.demo',
      passwordFieldLabel: 'Contraseña de Acceso',
      authCodeTitle: 'Token de Seguridad Banco de Bogotá',
      authCodeLabel: 'Ingresa la clave token de tu dispositivo',
      authCodePlaceholder: '654321'
    }
  },
  'Davivienda': {
    id: 'davivienda',
    name: 'Davivienda',
    type: 'traditional',
    primaryColor: '#d6001c',
    accentColor: '#ffffff',
    logoIcon: '🏠',
    credentials: {
      usernameOrPhone: 'usuario.demo',
      password: '123456',
      authCode: '654321'
    },
    labels: {
      loginTitle: 'Portal Virtual Davivienda',
      userFieldLabel: 'Número de Documento / Usuario',
      userFieldPlaceholder: 'Ej: usuario.demo',
      passwordFieldLabel: 'Clave de Ingreso',
      authCodeTitle: 'Código de Verificación Davivienda',
      authCodeLabel: 'Ingresa el token virtual Davivienda',
      authCodePlaceholder: '654321'
    }
  },
  'BBVA Colombia': {
    id: 'bbva',
    name: 'BBVA Colombia',
    type: 'traditional',
    primaryColor: '#004481',
    accentColor: '#1464a5',
    logoIcon: '🔵',
    credentials: {
      usernameOrPhone: 'usuario.demo',
      password: '123456',
      authCode: '654321'
    },
    labels: {
      loginTitle: 'BBVA Net Colombia',
      userFieldLabel: 'Usuario / Identificación',
      userFieldPlaceholder: 'Ej: usuario.demo',
      passwordFieldLabel: 'Contraseña de Acceso',
      authCodeTitle: 'Token Digital BBVA',
      authCodeLabel: 'Ingresa el token de seguridad BBVA',
      authCodePlaceholder: '654321'
    }
  },
  'Banco de Occidente': {
    id: 'occidente',
    name: 'Banco de Occidente',
    type: 'traditional',
    primaryColor: '#0058a3',
    accentColor: '#00a3e0',
    logoIcon: '🌊',
    credentials: {
      usernameOrPhone: 'usuario.demo',
      password: '123456',
      authCode: '654321'
    },
    labels: {
      loginTitle: 'Occired - Banco de Occidente',
      userFieldLabel: 'Usuario Registrado',
      userFieldPlaceholder: 'Ej: usuario.demo',
      passwordFieldLabel: 'Clave de Acceso',
      authCodeTitle: 'Código Token Occidente',
      authCodeLabel: 'Ingresa el código dinámico de tu token',
      authCodePlaceholder: '654321'
    }
  },
  'Scotiabank Colpatria': {
    id: 'colpatria',
    name: 'Scotiabank Colpatria',
    type: 'traditional',
    primaryColor: '#ec111a',
    accentColor: '#ffffff',
    logoIcon: '🔴',
    credentials: {
      usernameOrPhone: 'usuario.demo',
      password: '123456',
      authCode: '654321'
    },
    labels: {
      loginTitle: 'Banca Virtual Scotiabank Colpatria',
      userFieldLabel: 'Nombre de Usuario',
      userFieldPlaceholder: 'Ej: usuario.demo',
      passwordFieldLabel: 'Contraseña Personal',
      authCodeTitle: 'Código de Confirmación Colpatria',
      authCodeLabel: 'Ingresa la clave dinámica enviada a tu teléfono',
      authCodePlaceholder: '654321'
    }
  },
  'Banco Popular': {
    id: 'popular',
    name: 'Banco Popular',
    type: 'traditional',
    primaryColor: '#00703c',
    accentColor: '#78be20',
    logoIcon: '🟩',
    credentials: {
      usernameOrPhone: 'usuario.demo',
      password: '123456',
      authCode: '654321'
    },
    labels: {
      loginTitle: 'Banca Virtual Banco Popular',
      userFieldLabel: 'Usuario o Documento',
      userFieldPlaceholder: 'Ej: usuario.demo',
      passwordFieldLabel: 'Clave Secreta',
      authCodeTitle: 'Clave Dinámica Popular',
      authCodeLabel: 'Ingresa tu clave dinámica de autorización',
      authCodePlaceholder: '654321'
    }
  },
  'Banco Itaú': {
    id: 'itau',
    name: 'Banco Itaú',
    type: 'traditional',
    primaryColor: '#ff6200',
    accentColor: '#003399',
    logoIcon: '🟧',
    credentials: {
      usernameOrPhone: 'usuario.demo',
      password: '123456',
      authCode: '654321'
    },
    labels: {
      loginTitle: 'Itaú Personal Banking',
      userFieldLabel: 'Usuario o Documento',
      userFieldPlaceholder: 'Ej: usuario.demo',
      passwordFieldLabel: 'Contraseña de Ingreso',
      authCodeTitle: 'iToken Itaú',
      authCodeLabel: 'Ingresa el código generado por tu iToken Itaú',
      authCodePlaceholder: '654321'
    }
  }
};

/** Helper para obtener la configuración del banco seleccionado o una por defecto */
export function getBankConfig(bankName: string): BankConfig {
  return SIMULATED_BANK_CREDENTIALS[bankName] || SIMULATED_BANK_CREDENTIALS['Bancolombia'];
}

// ── CONFIGURACIÓN DE TARJETAS DEMO PARA EVALUACIÓN ──

export interface SimulatedCardConfig {
  id: string;
  name: string;
  brand: 'Visa' | 'Mastercard' | 'American Express';
  type: 'approved' | 'declined';
  cardNumber: string;
  cardHolder: string;
  cardExp: string;
  cardCvv: string;
  authCode: string; // 3D Secure / OTP SMS
  brandColor: string;
  brandIcon: string;
  description: string;
}

export const SIMULATED_CARDS_CONFIG: SimulatedCardConfig[] = [
  {
    id: 'visa-approved',
    name: 'Visa Débito/Crédito (Aprobada)',
    brand: 'Visa',
    type: 'approved',
    cardNumber: '4242 4242 4242 4242',
    cardHolder: 'JUAN PEREZ DEMO',
    cardExp: '12/28',
    cardCvv: '123',
    authCode: '123456',
    brandColor: '#1a1f71',
    brandIcon: '💳 Visa',
    description: 'Transacción exitosa aprobada (Luhn válido)'
  },
  {
    id: 'mastercard-approved',
    name: 'Mastercard Gold (Aprobada)',
    brand: 'Mastercard',
    type: 'approved',
    cardNumber: '5555 5555 5555 4444',
    cardHolder: 'MARIA GOMEZ DEMO',
    cardExp: '10/29',
    cardCvv: '456',
    authCode: '123456',
    brandColor: '#eb001b',
    brandIcon: '💳 Mastercard',
    description: 'Transacción exitosa aprobada (Luhn válido)'
  },
  {
    id: 'card-declined',
    name: 'Tarjeta Rechazo (Declinada)',
    brand: 'Visa',
    type: 'declined',
    cardNumber: '4000 0000 0000 0002',
    cardHolder: 'CARLOS DECLINADO DEMO',
    cardExp: '05/27',
    cardCvv: '999',
    authCode: '000000',
    brandColor: '#ff4444',
    brandIcon: '❌ Declinada',
    description: 'Simula rechazo bancario por fondos insuficientes'
  }
];

export function detectCardBrand(cardNumber: string): { brand: string; icon: string; color: string } {
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.startsWith('4')) {
    return { brand: 'Visa', icon: '💳 Visa', color: '#1a1f71' };
  }
  if (clean.startsWith('5')) {
    return { brand: 'Mastercard', icon: '💳 Mastercard', color: '#eb001b' };
  }
  if (clean.startsWith('3')) {
    return { brand: 'American Express', icon: '💳 AMEX', color: '#007bc1' };
  }
  return { brand: 'Tarjeta', icon: '💳 Tarjeta', color: '#333333' };
}
