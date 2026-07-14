import type { AppSetting, Note, Photo } from "../../types/models";

const seedTime = new Date("2026-07-14T09:00:00").getTime();

const createArtwork = (from: string, to: string, accent: string, shape: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient></defs>
    <rect width="800" height="1000" fill="url(#g)"/>
    <circle cx="620" cy="210" r="150" fill="${accent}" opacity=".58"/>
    <path d="${shape}" fill="white" opacity=".48"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export const seedPhotos: Photo[] = [
  {
    id: "photo-dawn",
    src: createArtwork("#f7b89c", "#567f91", "#ffe5bd", "M0 760 Q220 560 410 760 T800 680 V1000 H0Z"),
    alt: "暖色晨曦与远山的抽象插画",
    createdAt: seedTime,
  },
  {
    id: "photo-ocean",
    src: createArtwork("#99d5df", "#2f6681", "#dff7ed", "M0 650 Q180 560 350 690 T800 630 V1000 H0Z"),
    alt: "蓝绿色海浪的抽象插画",
    createdAt: seedTime - 1,
  },
  {
    id: "photo-night",
    src: createArtwork("#68739f", "#202d4c", "#d8c9ff", "M0 800 Q250 480 470 760 T800 650 V1000 H0Z"),
    alt: "蓝紫色夜空与山丘的抽象插画",
    createdAt: seedTime - 2,
  },
  {
    id: "photo-garden",
    src: createArtwork("#b9d6b0", "#527761", "#f7d6be", "M0 720 Q170 510 370 720 T800 590 V1000 H0Z"),
    alt: "柔和绿色花园的抽象插画",
    createdAt: seedTime - 3,
  },
];

export const seedNotes: Note[] = [
  {
    id: "note-welcome",
    title: "欢迎使用 Notes",
    content: "这里可以记录简单的文字。内容会自动保存在本机。",
    createdAt: seedTime,
    updatedAt: seedTime,
  },
];

export const seedSettings: AppSetting[] = [
  { key: "productName", value: "PhoneVerse" },
  { key: "version", value: "v0.2" },
];
