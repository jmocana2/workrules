import type { Convenio, ConversationSummary, PerfilJson } from "@core/types";

/**
 * Mock data para Convenios Colectivos
 * Usado en desarrollo, tests y Storybook
 */

export const MOCK_CONVENIOS: Convenio[] = [
  {
    // ID real del convenio indexado en Supabase local
    id: "42c6ada7-2290-4145-8b33-e49fc1b3161a",
    nombre: "Convenio colectivo de Hosteleria de Madrid",
    ambito: "provincial",
    codigo_regcon: "BOCM-20240406",
    url_pdf:
      "https://www.ccoo-servicios.es/archivos/BOCM-20240406-Conv-hosteleria.pdf",
    fecha_vigencia: "2024-01-01",
    estado: "activo",
    visibilidad: "publico",
    created_at: "2024-04-06T10:00:00Z",
    updated_at: new Date().toISOString(),
  },
  {
    id: "1ee80c2a-64f5-4416-bd75-7b098feaecb1",
    nombre: "Convenio TIC",
    ambito: "estatal",
    codigo_regcon: "BOE-A-2023-23456",
    url_pdf: "https://boe.es/buscar/doc.php?id=BOE-A-2023-23456",
    fecha_vigencia: "2023-04-01",
    estado: "activo",
    visibilidad: "publico",
    created_at: "2023-03-20T10:00:00Z",
    updated_at: "2023-03-20T10:00:00Z",
  },
  {
    id: "c3d4e5f6-a7b8-9012-cdef-345678901234",
    nombre: "Comercio de Barcelona",
    ambito: "provincial",
    codigo_regcon: "BOE-A-2023-34567",
    url_pdf: "https://boe.es/buscar/doc.php?id=BOE-A-2023-34567",
    fecha_vigencia: "2023-03-01",
    estado: "activo",
    visibilidad: "publico",
    created_at: "2023-02-10T10:00:00Z",
    updated_at: "2023-02-10T10:00:00Z",
  },
  {
    id: "d4e5f6a7-b8c9-0123-def0-456789012345",
    nombre: "Construcción y Obras Públicas",
    ambito: "estatal",
    codigo_regcon: "BOE-A-2023-45678",
    url_pdf: "https://boe.es/buscar/doc.php?id=BOE-A-2023-45678",
    fecha_vigencia: "2023-05-01",
    estado: "activo",
    visibilidad: "publico",
    created_at: "2023-04-15T10:00:00Z",
    updated_at: "2023-04-15T10:00:00Z",
  },
  {
    id: "e5f6a7b8-c9d0-1234-ef01-567890123456",
    nombre: "Empresa XYZ S.A.",
    ambito: "empresa",
    codigo_regcon: "BOE-A-2023-56789",
    url_pdf: "https://boe.es/buscar/doc.php?id=BOE-A-2023-56789",
    fecha_vigencia: "2023-06-01",
    estado: "activo",
    visibilidad: "publico",
    created_at: "2023-05-20T10:00:00Z",
    updated_at: "2023-05-20T10:00:00Z",
  },
];

export const MOCK_PERFIL_HOSTELERIA: PerfilJson = {
  convenio: "Convenio colectivo de Hosteleria de Madrid",
  variables_criticas: ["Categoría Profesional", "Antigüedad", "Jornada"],
  valores_posibles: {
    "Categoría Profesional": [
      "Camarero/a",
      "Cocinero/a",
      "Recepcionista",
      "Gobernanta",
      "Jefe/a de sala",
      "Ayudante de cocina",
    ],
    "Antigüedad": ["0-2 años", "2-5 años", "5-10 años", "+10 años"],
    "Jornada": ["Completa", "Parcial 20h", "Parcial 30h"],
  },
  descripciones: {
    "Categoría Profesional": "Selecciona tu puesto de trabajo",
    "Antigüedad": "Años trabajados en la empresa",
    "Jornada": "Tipo de contrato por horas",
  },
};

export const MOCK_CONVERSATIONS: ConversationSummary[] = [
  {
    id: "1",
    title: "Cálculo de salario camarero",
    convenioId: "37173794-1562-45b0-9ac9-0e7d1d15847c",
    convenioNombre: "Convenio colectivo de Hosteleria de Madrid",
    lastMessageAt: new Date().toISOString(),
    preview:
      "¿Cuál es el salario base para un camarero con 3 años de antigüedad?",
  },
  {
    id: "2",
    title: "Vacaciones y permisos",
    convenioId: "37173794-1562-45b0-9ac9-0e7d1d15847c",
    convenioNombre: "Convenio colectivo de Hosteleria de Madrid",
    lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
    preview: "¿Cuántos días de vacaciones corresponden?",
  },
  {
    id: "3",
    title: "Pagas extraordinarias",
    convenioId: "b2c3d4e5-f6a7-8901-bcde-f23456789012",
    convenioNombre: "Convenio Estatal de Hostelería",
    lastMessageAt: new Date(Date.now() - 172800000).toISOString(),
    preview: "¿Cuándo se cobran las pagas extra?",
  },
];

/**
 * Mock de mensajes de chat para desarrollo
 */
export const MOCK_CHAT_MESSAGES = [
  {
    id: "1",
    role: "user" as const,
    content:
      "¿Cuál es el salario base para un camarero con 3 años de antigüedad?",
  },
  {
    id: "2",
    role: "assistant" as const,
    content:
      "Según el **Convenio de Hostelería de Madrid**, el salario base para un camarero con 3 años de antigüedad es de **1.450€ brutos mensuales**.\n\nEsto incluye:\n- Salario base del grupo profesional\n- Plus de antigüedad (trienio)\n\nNo incluye pagas extraordinarias ni otros complementos.",
    sources: [
      {
        title: "BOE-A-2023-12345 - Convenio Hostelería Madrid",
        url: "https://boe.es/buscar/doc.php?id=BOE-A-2023-12345",
      },
    ],
  },
];
