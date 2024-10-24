import { chapters } from "../services/prisma";

export type ChaptersWithSubChaptersWithinTopic = {
  id: bigint;
  topicTitle: string | null;
  description: string | null;
  chapters: {
    id: bigint;
    topic_id: bigint;
    parent_chapter_id: bigint | null;
    chapter_number: string;
    title: string;
    sub_title: string;
    created_at: Date | null;
    SubChapters: chapters[];
    FileChapter: {
      file_name: string;
    }[];
  }[];
};
