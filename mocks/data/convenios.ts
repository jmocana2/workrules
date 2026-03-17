import type { Convenio, PerfilJson, ConversationSummary } from '@core/types';

/**
 * Mock data para Convenios Colectivos
 * Usado en desarrollo, tests y Storybook
 */

export const MOCK_CONVENIOS: Convenio[] = [
  {
    id: '1',
    nombre: 'Hostelería de Madrid',
    ambito: 'provincial',
    codigo_boe: 'BOE-A-2023-12345',
    url_boe: 'https://boe.es/buscar/doc.php?id=BOE-A-2023-12345',
    fecha_publicacion: '2023-01-15',
    fecha_vigencia_inicio: '2023-02-01',
    created_at: '2023-01-15T10:00:00Z',
    updated_at: '2023-01-15T10:00:00Z',
  },
  {
    id: '2',
    nombre: 'Convenio Estatal de Hostelería',
    ambito: 'estatal',
    codigo_boe: 'BOE-A-2023-23456',
    url_boe: 'https://boe.es/buscar/doc.php?id=BOE-A-2023-23456',
    fecha_publicacion: '2023-03-20',
    fecha_vigencia_inicio: '2023-04-01',
    created_at: '2023-03-20T10:00:00Z',
    updated_at: '2023-03-20T10:00:00Z',
  },
  {
    id: '3',
    nombre: 'Comercio de Barcelona',
    ambito: 'provincial',
    codigo_boe: 'BOE-A-2023-34567',
    url_boe: 'https://boe.es/buscar/doc.php?id=BOE-A-2023-34567',
    fecha_publicacion: '2023-02-10',
    fecha_vigencia_inicio: '2023-03-01',
    created_at: '2023-02-10T10:00:00Z',
    updated_at: '2023-02-10T10:00:00Z',
  },
  {
    id: '4',
    nombre: 'Construcción y Obras Públicas',
    ambito: 'estatal',
    codigo_boe: 'BOE-A-2023-45678',
    url_boe: 'https://boe.es/buscar/doc.php?id=BOE-A-2023-45678',
    fecha_publicacion: '2023-04-15',
    fecha_vigencia_inicio: '2023-05-01',
    created_at: '2023-04-15T10:00:00Z',
    updated_at: '2023-04-15T10:00:00Z',
  },
  {
    id: '5',
    nombre: 'Empresa XYZ S.A.',
    ambito: 'empresa',
    codigo_boe: 'BOE-A-2023-56789',
    url_boe: 'https://boe.es/buscar/doc.php?id=BOE-A-2023-56789',
    fecha_publicacion: '2023-05-20',
    fecha_vigencia_inicio: '2023-06-01',
    created_at: '2023-05-20T10:00:00Z',
    updated_at: '2023-05-20T10:00:00Z',
  },
];

export const MOCK_PERFIL_HOSTELERIA: PerfilJson = {
  convenio: 'Hostelería de Madrid',
  variables_criticas: ['Categoría Profesional', 'Antigüedad', 'Jornada'],
  valores_posibles: {
    'Categoría Profesional': [
      'Camarero/a',
      'Cocinero/a',
      'Recepcionista',
      'Gobernanta',
      'Jefe/a de sala',
      'Ayudante de cocina',
    ],
    'Antigüedad': ['0-2 años', '2-5 años', '5-10 años', '+10 años'],
    'Jornada': ['Completa', 'Parcial 20h', 'Parcial 30h'],
  },
  descripciones: {
    'Categoría Profesional': 'Selecciona tu puesto de trabajo',
    'Antigüedad': 'Años trabajados en la empresa',
    'Jornada': 'Tipo de contrato por horas',
  },
};

export const MOCK_CONVERSATIONS: ConversationSummary[] = [
  {
    id: '1',
    title: 'Cálculo de salario camarero',
    convenioId: '1',
    convenioNombre: 'Hostelería de Madrid',
    lastMessageAt: new Date().toISOString(),
    preview: '¿Cuál es el salario base para un camarero con 3 años de antigüedad?',
  },
  {
    id: '2',
    title: 'Vacaciones y permisos',
    convenioId: '1',
    convenioNombre: 'Hostelería de Madrid',
    lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
    preview: '¿Cuántos días de vacaciones corresponden?',
  },
  {
    id: '3',
    title: 'Pagas extraordinarias',
    convenioId: '2',
    convenioNombre: 'Convenio Estatal de Hostelería',
    lastMessageAt: new Date(Date.now() - 172800000).toISOString(),
    preview: '¿Cuándo se cobran las pagas extra?',
  },
];

/**
 * Mock de mensajes de chat para desarrollo
 */
export const MOCK_CHAT_MESSAGES = [
  {
    id: '1',
    role: 'user' as const,
    content: '¿Cuál es el salario base para un camarero con 3 años de antigüedad?',
  },
  {
    id: '2',
    role: 'assistant' as const,
    content:
      'Según el **Convenio de Hostelería de Madrid**, el salario base para un camarero con 3 años de antigüedad es de **1.450€ brutos mensuales**.\n\nEsto incluye:\n- Salario base del grupo profesional\n- Plus de antigüedad (trienio)\n\nNo incluye pagas extraordinarias ni otros complementos.',
    sources: [
      {
        title: 'BOE-A-2023-12345 - Convenio Hostelería Madrid',
        url: 'https://boe.es/buscar/doc.php?id=BOE-A-2023-12345',
      },
    ],
  },
];
