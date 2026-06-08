import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ConfirmUploadInput,
  ConfirmUploadResult,
  ConvenioProcessingStatus,
  IConvenioUploadRepository,
  UploadIdentity,
  UploadedPdf,
} from "@/application/ports";
import { SUPABASE_URL } from "@/infrastructure/clients/supabaseClient";

/**
 * Adaptador Supabase para el pipeline de upload de convenios:
 * autenticacion, storage, edge function de confirmacion y polling de estado.
 */
export class SupabaseConvenioUploadRepository
  implements IConvenioUploadRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async getUploadIdentity(): Promise<UploadIdentity | null> {
    const { data: userData } = await this.client.auth.getUser();
    if (!userData.user) return null;

    const {
      data: { session },
    } = await this.client.auth.getSession();
    if (!session?.access_token) return null;

    return {
      userId: userData.user.id,
      accessToken: session.access_token,
    };
  }

  async uploadPdf(input: {
    file: File;
    userId: string;
    accessToken: string;
    signal?: AbortSignal;
  }): Promise<UploadedPdf> {
    const filePath = `${input.userId}/${Date.now()}-${input.file.name}`;
    const encodedFilePath = filePath
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/convenios-pdf/${encodedFilePath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "cache-control": "3600",
          "x-upsert": "false",
          "Content-Type": input.file.type || "application/pdf",
        },
        body: input.file,
        signal: input.signal,
      },
    );

    if (!uploadResponse.ok) {
      let uploadMessage = "Error subiendo archivo";
      try {
        const errorBody = await uploadResponse.json();
        uploadMessage = errorBody?.message || errorBody?.error || uploadMessage;
      } catch {
        uploadMessage = `${uploadMessage} (${uploadResponse.status})`;
      }
      throw new Error(uploadMessage);
    }

    const { data: urlData, error: urlError } = await this.client.storage
      .from("convenios-pdf")
      .createSignedUrl(filePath, 3600);

    if (urlError) throw urlError;

    return {
      signedUrl: urlData.signedUrl,
      filePath,
    };
  }

  async confirmUpload(input: ConfirmUploadInput): Promise<ConfirmUploadResult> {
    const { data, error } = await this.client.functions.invoke(
      "upload-convenio",
      {
        body: {
          file_url: input.fileUrl,
          file_path: input.filePath,
          nombre_archivo: input.nombreArchivo,
          visibilidad: input.visibilidad,
          pdf_hash: input.pdfHash,
        },
      },
    );

    if (error) throw error;

    if (data?.status === "duplicate") {
      return {
        status: "duplicate",
        convenioId: null,
        existingNombre: data.existing_convenio?.nombre ?? null,
      };
    }

    return {
      status: "started",
      convenioId: data?.convenio_id ?? null,
      existingNombre: null,
    };
  }

  async fetchProcessingStatus(
    convenioId: string,
  ): Promise<ConvenioProcessingStatus> {
    const [convenioRes, progressRes] = await Promise.all([
      this.client
        .from("convenios")
        .select("estado, error_message")
        .eq("id", convenioId)
        .single(),
      this.client
        .from("convenio_processing_status")
        .select("stage, progress, message")
        .eq("convenio_id", convenioId)
        .maybeSingle(),
    ]);

    if (convenioRes.error) {
      throw new Error(
        convenioRes.error.message || "Error consultando estado del convenio",
      );
    }

    const progress = progressRes.data;
    return {
      estado: String(convenioRes.data.estado),
      errorMessage: convenioRes.data.error_message ?? null,
      progressStage: progress ? String(progress.stage) : null,
      progressValue: progress ? Number(progress.progress) || 0 : null,
      progressMessage: progress?.message ?? null,
    };
  }
}
