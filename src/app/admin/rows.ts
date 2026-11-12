import type { Exercise } from "@/db/schema";

/** Lo que el panel necesita de cada ejercicio. */
export interface AdminRow {
  slug: string;
  nameEs: string;
  nameEn: string;
  muscles: string[];
  equipment: string | null;
  reviewed: boolean;
  contentStatus: Exercise["contentStatus"];
  videoId: string | null;
  videoTitle: string | null;
  videoChannel: string | null;
  videoSource: Exercise["youtubeSource"];
  images: string[];
  imagesEdited: boolean;
}

export function toAdminRow(e: Exercise): AdminRow {
  return {
    slug: e.slug,
    nameEs: e.nameEs,
    nameEn: e.nameEn,
    muscles: e.primaryMuscles,
    equipment: e.equipment,
    reviewed: e.reviewed,
    contentStatus: e.contentStatus,
    videoId: e.youtubeVideoId,
    videoTitle: e.youtubeTitle,
    videoChannel: e.youtubeChannel,
    videoSource: e.youtubeSource,
    images: e.images,
    imagesEdited: e.imagesEdited,
  };
}
