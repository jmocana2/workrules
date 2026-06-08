import type {
  ConvenioProcessingStatus,
  IConvenioUploadRepository,
  UploadIdentity,
  UploadedPdf,
} from "@/application/ports";

interface UploadDeps {
  repo: IConvenioUploadRepository;
}

/**
 * Calcula el hash SHA-256 de un archivo (se usa para deteccion de duplicados).
 * No depende de la infraestructura: usa la WebCrypto API estandar.
 */
export async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getUploadIdentity(
  deps: UploadDeps,
): Promise<UploadIdentity | null> {
  return deps.repo.getUploadIdentity();
}

export async function uploadConvenioPdf(
  input: {
    file: File;
    identity: UploadIdentity;
    signal?: AbortSignal;
  },
  deps: UploadDeps,
): Promise<UploadedPdf> {
  return deps.repo.uploadPdf({
    file: input.file,
    userId: input.identity.userId,
    accessToken: input.identity.accessToken,
    signal: input.signal,
  });
}

export interface ConfirmConvenioUploadInput {
  fileUrl: string;
  filePath: string;
  nombreArchivo: string;
  visibilidad: "publico" | "privado";
  pdfHash: string | null;
}

export interface ConfirmConvenioUploadResult {
  convenioId: string;
}

/**
 * Confirma el upload. Lanza error en caso de duplicado o respuesta invalida
 * para que la UI pueda mostrar el mensaje al usuario.
 */
export async function confirmConvenioUpload(
  input: ConfirmConvenioUploadInput,
  deps: UploadDeps,
): Promise<ConfirmConvenioUploadResult> {
  const result = await deps.repo.confirmUpload(input);

  if (result.status === "duplicate") {
    const existing = result.existingNombre ?? "desconocido";
    throw new Error(
      `Ya tienes un convenio con este PDF: "${existing}". No es necesario subirlo de nuevo.`,
    );
  }

  if (!result.convenioId) {
    throw new Error("Respuesta inválida del servidor: falta convenio_id");
  }

  return { convenioId: result.convenioId };
}

export async function fetchConvenioProcessingStatus(
  convenioId: string,
  deps: UploadDeps,
): Promise<ConvenioProcessingStatus> {
  return deps.repo.fetchProcessingStatus(convenioId);
}
