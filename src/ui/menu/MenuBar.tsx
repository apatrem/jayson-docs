import type { FC } from "react";
import { FileMenu, type FileMenuProps } from "./FileMenu";

export interface MenuBarProps extends FileMenuProps {
  statusMessage?: string | null;
}

export const MenuBar: FC<MenuBarProps> = ({ statusMessage, ...fileMenuProps }) => (
  <header role="menubar" aria-label="Application menu">
    <FileMenu {...fileMenuProps} />
    {statusMessage ? <p role="status">{statusMessage}</p> : null}
  </header>
);
