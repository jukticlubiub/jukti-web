/**
 * How each kind of image is shown on the site, so the admin cropper can frame it to the
 * card it will appear in and save it at the size that card needs (about 2× its largest
 * size on screen, for sharp high-density displays).
 */
export type CropShape = {
  label: string;
  /** width / height. Null keeps the photo's own shape. */
  aspect: number | null;
  /** Width of the saved image in px (height follows the aspect). For `null`, the longest side. */
  width: number;
};

export type ImagePreset = {
  /** Where it appears, shown in the cropper. */
  usedFor: string;
  shapes: CropShape[];
  /** A circle mask in the cropper (for avatars shown round). */
  round?: boolean;
  /** Keep transparency (for cut-out portraits); otherwise the background is the site's black. */
  transparent?: boolean;
};

const original: CropShape = { label: "Original shape", aspect: null, width: 2000 };

export const imagePresets = {
  teamPortrait: {
    usedFor: "the portrait cards on /team (416 × 657) and the member chips on the homepage",
    shapes: [{ label: "Team card", aspect: 416 / 657, width: 920 }],
    transparent: true,
  },
  alumnus: {
    usedFor: "the round alumni photos on /team",
    shapes: [{ label: "Square", aspect: 1, width: 600 }],
    round: true,
    transparent: true,
  },
  developer: {
    usedFor: "the portrait cards on /developers",
    shapes: [{ label: "Developer card (2:3)", aspect: 2 / 3, width: 1000 }],
  },
  eventCover: {
    usedFor: "event cards and phones (16:9); on large screens the square cover is used if there is one",
    shapes: [{ label: "Wide (16:9)", aspect: 16 / 9, width: 1920 }, { label: "Event card (16:10)", aspect: 16 / 10, width: 1800 }, original],
  },
  eventCoverSquare: {
    usedFor: "the featured event and the event page on large screens (1:1)",
    shapes: [{ label: "Square (1:1)", aspect: 1, width: 1400 }],
  },
  logCover: {
    usedFor: "log cards and the featured log (16:10)",
    shapes: [{ label: "Log card (16:10)", aspect: 16 / 10, width: 1800 }, original],
  },
  avatar: {
    usedFor: "the round author photo on logs",
    shapes: [{ label: "Square", aspect: 1, width: 400 }],
    round: true,
  },
  memberAvatar: {
    usedFor: "your profile, member card and the members directory",
    shapes: [{ label: "Profile photo", aspect: 1, width: 512 }],
    round: true,
  },
  storyPhoto: {
    usedFor: "the story map on /about (4:3 cards)",
    shapes: [{ label: "Story card (4:3)", aspect: 4 / 3, width: 1600 }],
  },
  memorialPhoto: {
    usedFor: "the photo grid on the memorial page (4:3 tiles)",
    shapes: [{ label: "Photo tile (4:3)", aspect: 4 / 3, width: 1600 }, { label: "Portrait (4:5)", aspect: 4 / 5, width: 1200 }, original],
  },
} satisfies Record<string, ImagePreset>;

export type ImagePresetName = keyof typeof imagePresets;
