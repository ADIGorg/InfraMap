// src/modules/occurrences/infrastructure/repositories/supabase-occurrence.repository.ts

import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AiAnalysisData,
  CategoryData,
  FinalizeOccurrenceInput,
  IOccurrenceRepository,
  UserRoleData,
} from '../../domain/repositories/occurrence.repository.js';

function mapPgError(message: string): Error {
  for (const prefix of ['FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'BAD_REQUEST']) {
    if (message.includes(`${prefix}:`)) {
      return new Error(message.replace(`${prefix}:`, '').trim());
    }
  }
  return new Error(`Erro no banco: ${message}`);
}

export class SupabaseOccurrenceRepository implements IOccurrenceRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  // ==========================================================
  // OCC-01 — leitura básica
  // ==========================================================

  async getUserRole(userId: string): Promise<UserRoleData | null> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('role, is_active')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new Error(`Erro ao buscar role: ${error.message}`);
    if (!data) return null;

    return {
      role: data.role as 'CITIZEN' | 'ADMIN',
      isActive: data.is_active,
    };
  }

  async getAiAnalysis(analysisId: string): Promise<AiAnalysisData | null> {
    const { data, error } = await this.supabase
      .from('ai_analyses')
      .select('id, user_id, status, suggested_category_id, suggested_description')
      .eq('id', analysisId)
      .maybeSingle();

    if (error) throw new Error(`Erro ao buscar análise: ${error.message}`);
    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      status: data.status as string,
      suggestedCategoryId: data.suggested_category_id,
      suggestedDescription: data.suggested_description,
    };
  }

  async getCategory(categoryId: string): Promise<CategoryData | null> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('id, is_active')
      .eq('id', categoryId)
      .maybeSingle();

    if (error) throw new Error(`Erro ao buscar categoria: ${error.message}`);
    if (!data) return null;

    return {
      id: data.id,
      isActive: data.is_active,
    };
  }

  // ==========================================================
  // OCC-01 — finalizar (chama RPC transacional)
  // ==========================================================

  async finalize(
    input: FinalizeOccurrenceInput,
    userId: string
  ): Promise<string> {
    const { data, error } = await this.supabase.rpc('finalize_occurrence', {
      p_author_id: userId,
      p_ai_analysis_id: input.aiAnalysisId,
      p_category_id: input.categoryId,
      p_description: input.description,
      p_lat: input.location.lat,
      p_lng: input.location.lng,
      p_category_source: input.categorySource,
      p_description_source: input.descriptionSource,
      p_photos: input.photos.map((p) => ({
        storagePath: p.storagePath,
        mimeType: p.mimeType,
        sizeBytes: p.sizeBytes,
      })),
    });

    if (error) throw mapPgError(error.message);
    return data as string;
  }
}