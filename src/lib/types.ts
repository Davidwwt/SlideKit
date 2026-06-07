export interface Card {
  id: number;
  type: 'cover' | 'intro' | 'analysis' | 'trend' | 'summary' | 'cta';
  headline: string;
  subheadline: string | null;
  body: string | null;
  bullet_points: string[] | null;
  data_callout: string | null;
  footer_note: string | null;
  needs_image: boolean;
  image_prompt: string | null;
  image_placement: 'background' | 'top_half' | 'side' | null;
  image_url: string | null;
}

export interface ProjectMeta {
  topic: string;
  series_tag: string;
  read_time: string;
  total_cards: number;
}

export interface SlideKitProject {
  project_id: string;
  created_at: string;
  meta: ProjectMeta;
  cards: Card[];
}

export interface GenerateRequest {
  topic: string;
  angle?: string;
  vol_number?: number;
  reference_image_paths?: string[];
}

export interface RegenerateRequest {
  project_id: string;
  card_id: number;
  context: {
    topic: string;
    all_cards_summary: string;
    reference_image_paths?: string[];
  };
}

export type AppState =
  | 'input'
  | 'loading_copy'
  | 'copy_review'
  | 'loading_images'
  | 'image_review'
  | 'editor';

export interface LoadingStatus {
  step: 'researching' | 'writing' | 'generating_images' | 'assembling';
  message: string;
}

export interface ImageGenerationStatus {
  cardId: number;
  status: 'pending' | 'generating' | 'done' | 'error';
  errorMessage?: string;
}
