import type { FC } from "react";

export interface FileMenuProps {
  canSave: boolean;
  canExport: boolean;
  onOpen: () => Promise<void> | void;
  onSave: () => Promise<void> | void;
  onSaveAs: () => Promise<void> | void;
  onExportPdf: () => Promise<void> | void;
  /** Import an Authored block via a file picker (T-164). */
  onImportBlock?: () => Promise<void> | void;
}

export const FileMenu: FC<FileMenuProps> = ({
  canSave,
  canExport,
  onOpen,
  onSave,
  onSaveAs,
  onExportPdf,
  onImportBlock,
}) => (
  <div role="menu" aria-label="File menu">
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        void onOpen();
      }}
    >
      Open
    </button>
    <button
      type="button"
      role="menuitem"
      disabled={!canSave}
      onClick={() => {
        void onSave();
      }}
    >
      Save
    </button>
    <button
      type="button"
      role="menuitem"
      disabled={!canSave}
      onClick={() => {
        void onSaveAs();
      }}
    >
      Save As
    </button>
    <button
      type="button"
      role="menuitem"
      disabled={!canExport}
      onClick={() => {
        void onExportPdf();
      }}
    >
      Export PDF
    </button>
    {onImportBlock !== undefined ? (
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          void onImportBlock();
        }}
      >
        Import block…
      </button>
    ) : null}
  </div>
);
