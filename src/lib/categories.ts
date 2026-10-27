export type Category = {
  slug: string;
  label: string;
  /** YouTube videoCategoryId used with chart=mostPopular */
  youtubeCategoryId: string;
  emoji: string;
};

/** Categories backed by YouTube's own category charts — cheap (1 quota unit) and curated. */
export const CATEGORIES: Category[] = [
  { slug: "film", label: "Film & Animation", youtubeCategoryId: "1", emoji: "🎬" },
  { slug: "autos", label: "Autos & Vehicles", youtubeCategoryId: "2", emoji: "🚗" },
  { slug: "music", label: "Music", youtubeCategoryId: "10", emoji: "🎵" },
  { slug: "pets", label: "Pets & Animals", youtubeCategoryId: "15", emoji: "🐾" },
  { slug: "sports", label: "Sports", youtubeCategoryId: "17", emoji: "⚽" },
  { slug: "travel", label: "Travel & Events", youtubeCategoryId: "19", emoji: "✈️" },
  { slug: "gaming", label: "Gaming", youtubeCategoryId: "20", emoji: "🎮" },
  { slug: "people", label: "People & Blogs", youtubeCategoryId: "22", emoji: "👤" },
  { slug: "comedy", label: "Comedy", youtubeCategoryId: "23", emoji: "😂" },
  { slug: "entertainment", label: "Entertainment", youtubeCategoryId: "24", emoji: "✨" },
  { slug: "howto", label: "How-to & Style", youtubeCategoryId: "26", emoji: "🛠️" },
  { slug: "education", label: "Education", youtubeCategoryId: "27", emoji: "📚" },
  { slug: "tech", label: "Science & Tech", youtubeCategoryId: "28", emoji: "🔬" },
];

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
