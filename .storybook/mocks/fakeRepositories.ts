import type {
  IChatSessionRepository,
  IConvenioRepository,
  IConvenioUploadRepository,
  IUserPlanRepository,
  ListConveniosFilters,
  ConfirmUploadInput,
  ConfirmUploadResult,
  ConvenioProcessingStatus,
  UploadedPdf,
  UploadIdentity,
  UserPlan,
} from "@/application/ports";
import type {
  ChatMessageRecord,
} from "@/application/ports/IChatSessionRepository";
import type {
  Convenio,
  ConversationSummary,
  PerfilJson,
  UserConvenio,
} from "@core/types";

interface FakeConvenioRepoOptions {
  convenios?: Convenio[];
  userConvenios?: UserConvenio[];
  perfil?: PerfilJson | null;
}

export function createFakeConvenioRepository(
  options: FakeConvenioRepoOptions = {},
): IConvenioRepository {
  const convenios = options.convenios ?? [];
  const userConvenios = options.userConvenios ?? [];
  const perfil = options.perfil ?? null;
  return {
    async getById(id) {
      return convenios.find((c) => c.id === id) ?? null;
    },
    async list(_filters: ListConveniosFilters) {
      return convenios;
    },
    async listOwnedByUser(_userId) {
      return userConvenios;
    },
    async getPerfil(_convenioId) {
      return perfil;
    },
    async getSignedPdfUrl(_convenioId) {
      return null;
    },
  };
}

export function createFakeChatSessionRepository(
  conversations: ConversationSummary[] = [],
): IChatSessionRepository {
  return {
    async listByUser() {
      return conversations;
    },
    async deleteById() {},
    async create() {
      return null;
    },
    async loadMessages(): Promise<ChatMessageRecord[] | null> {
      return [];
    },
    async getConvenioIdForSession() {
      return null;
    },
  };
}

export function createFakeUserPlanRepository(
  plan: UserPlan = "free",
): IUserPlanRepository {
  return {
    async getPlan() {
      return plan;
    },
  };
}

export function createFakeConvenioUploadRepository(): IConvenioUploadRepository {
  return {
    async getUploadIdentity(): Promise<UploadIdentity | null> {
      return null;
    },
    async uploadPdf(): Promise<UploadedPdf> {
      return { signedUrl: "", filePath: "" };
    },
    async confirmUpload(_input: ConfirmUploadInput): Promise<ConfirmUploadResult> {
      return { status: "started", convenioId: null, existingNombre: null };
    },
    async fetchProcessingStatus(): Promise<ConvenioProcessingStatus> {
      return {
        estado: "indexado",
        errorMessage: null,
        progressStage: null,
        progressValue: 100,
        progressMessage: null,
      };
    },
  };
}
