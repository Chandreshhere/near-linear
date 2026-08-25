/**
 * Profile helpers shared by onboarding and Settings → Profile.
 *
 * Every profile answer now has a column on the shared contract and is written
 * through the transaction queue like any other edit: name/displayName/
 * initials/avatarUrl and `title` on `UserData`, `newsletterOptIn` on
 * `UserSettingsData` (both added in SCHEMA_VERSION 7 — the localStorage
 * "linearProfile" workaround that used to stand in for them is gone).
 *
 * What is left here is pure computation with no storage of its own.
 */

/** "Ada Lovelace" → "AL"; falls back to the first two characters. */
export function initialsFor(name: string): string {
  const parts = name
    .trim()
    .split(/[\s._-]+/)
    .filter((p) => p.length > 0);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return `${(parts[0] ?? "")[0] ?? ""}${(parts[1] ?? "")[0] ?? ""}`.toUpperCase();
}

const AVATAR_PX = 128;

/**
 * Read an image file and return a square, downscaled data URL.
 * Avatars ride the same transaction queue as every other write, so they are
 * cropped to 128×128 JPEG (~8–15 KB) instead of shipping the raw upload.
 */
export function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file"));
    reader.onload = () => {
      const source = typeof reader.result === "string" ? reader.result : "";
      if (source === "") {
        reject(new Error("Empty image file"));
        return;
      }
      const image = new Image();
      image.onerror = () => reject(new Error("Could not decode the image"));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = AVATAR_PX;
        canvas.height = AVATAR_PX;
        const ctx = canvas.getContext("2d");
        if (ctx === null) {
          resolve(source); // no canvas — keep the original
          return;
        }
        const side = Math.min(image.width, image.height);
        ctx.drawImage(
          image,
          (image.width - side) / 2,
          (image.height - side) / 2,
          side,
          side,
          0,
          0,
          AVATAR_PX,
          AVATAR_PX,
        );
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = source;
    };
    reader.readAsDataURL(file);
  });
}
