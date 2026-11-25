export const RECENT_ACTIVITY_KEY = "cb_recent_activity_items";

export type SelectedPageItem = {
  id: number;
  title: string;
  description: string;
  href: string;
  icon?: string;
};

export type RecentActivityItem = {
  id: string;
  type: "single" | "multi";
  title: string;
  selectedPages: SelectedPageItem[];
  visitedAt: string;
};

// Fungsi untuk menyimpan activity terbaru ke localStorage
export const saveRecentActivity = (
  pages: SelectedPageItem[] | SelectedPageItem,
) => {
  try {
    const normalizedPages = Array.isArray(pages) ? pages : [pages];

    if (!normalizedPages || normalizedPages.length === 0) return;

    const existing = localStorage.getItem(RECENT_ACTIVITY_KEY);
    let activities: RecentActivityItem[] = existing ? JSON.parse(existing) : [];

    const normalizedKey = normalizedPages.map((page) => page.id).join("-");
    const type = normalizedPages.length === 1 ? "single" : "multi";

    // Hapus activity yang sama
    activities = activities.filter(
      (item) =>
        !(
          item.type === type &&
          item.selectedPages.map((page) => page.id).join("-") === normalizedKey
        ),
    );

    const newItem: RecentActivityItem = {
      id: `${type}-${normalizedKey}`,
      type,
      title:
        normalizedPages.length === 1
          ? normalizedPages[0].title
          : `${normalizedPages[0].title} +${normalizedPages.length - 1} more`,
      selectedPages: normalizedPages,
      visitedAt: new Date().toISOString(),
    };

    activities.unshift(newItem);

    if (activities.length > 10) {
      activities = activities.slice(0, 10);
    }

    // Simpan kembali ke localStorage
    localStorage.setItem(RECENT_ACTIVITY_KEY, JSON.stringify(activities));
  } catch (error) {
    console.error("Failed to save recent activity:", error);
  }
};

// Mengambil semua recent activities
export const getRecentActivities = (): RecentActivityItem[] => {
  try {
    const existing = localStorage.getItem(RECENT_ACTIVITY_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error("Failed to read recent activities:", error);
    return [];
  }
};

// Hapus semua recent activities
export const clearRecentActivities = () => {
  try {
    localStorage.removeItem(RECENT_ACTIVITY_KEY);
  } catch (error) {
    console.error("Failed to clear recent activities:", error);
  }
};
