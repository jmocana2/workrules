/**
 * Resultado de subir el PDF al storage.
 */
export interface UploadedPdf {
  signedUrl: string;
  filePath: string;
}

/**
 * Identidad del usuario que sube. El adaptador conoce como obtenerla;
 * la aplicacion solo necesita estos campos.
 */
export interface UploadIdentity {
  userId: string;
  accessToken: string;
}

/**
 * Snapshot del progreso de procesamiento publicado por n8n.
 */
export interface ConvenioProcessingStatus {
  estado: string;
  errorMessage: string | null;
  progressStage: string | null;
  progressValue: number | null;
  progressMessage: string | null;
}

export interface ConfirmUploadInput {
  fileUrl: string;
  filePath: string;
  nombreArchivo: string;
  visibilidad: "publico" | "privado";
  pdfHash: string | null;
}

export interface ConfirmUploadResult {
  status: "started" | "duplicate";
  convenioId: string | null;
  existingNombre: string | null;
}

/**
 * Puerto para el pipeline de upload de convenios (PDF -> n8n -> indexado).
 */
export interface IConvenioUploadRepository {
  /** Devuelve la identidad del usuario actual o `null` si no esta autenticado. */
  getUploadIdentity(): Promise<UploadIdentity | null>;

  /** Sube un PDF al Storage y devuelve la URL firmada + ruta. */
  uploadPdf(input: {
    file: File;
    userId: string;
    accessToken: string;
    signal?: AbortSignal;
  }): Promise<UploadedPdf>;

  /** Confirma la subida llamando a la Edge Function de upload-convenio. */
  confirmUpload(input: ConfirmUploadInput): Promise<ConfirmUploadResult>;

  /** Consulta el estado de procesamiento de un convenio. */
  fetchProcessingStatus(convenioId: string): Promise<ConvenioProcessingStatus>;
}
