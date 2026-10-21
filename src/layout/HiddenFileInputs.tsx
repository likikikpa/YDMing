import type { ReadyApp } from "../app/useAppModel";

export function HiddenFileInputs({ app }: { app: ReadyApp }) {
  const {
    activeTexture,
    coverInput,
    fileInput,
    imageInput,
    importLocal,
    openProjectFile,
    textureInput,
    uploadCover,
    uploadTexture,
  } = app;
  return (
    <>
      <input
        ref={textureInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void uploadTexture(activeTexture, file);
        }}
      />
      <input
        ref={coverInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void uploadCover(activeTexture, file);
        }}
      />
      <input
        ref={fileInput}
        className="hidden-input"
        type="file"
        accept=".ydming,.atlasforge,.json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void openProjectFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={imageInput}
        className="hidden-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importLocal(f);
          e.target.value = "";
        }}
      />
    </>
  );
}
