import type { CSSProperties, FC } from "react";
import { useMemo, useState } from "react";
import { DocList } from "./DocList";
import { FilterSidebar } from "./FilterSidebar";
import { LibraryHeader } from "./LibraryHeader";
import { SearchBar } from "./SearchBar";
import {
  DEFAULT_LIBRARY_FILTER_STATE,
  applyFilters,
  applySort,
  type LibraryEntry,
  type LibraryFilterState,
} from "./filter";

export interface LibraryViewProps {
  entries: LibraryEntry[];
  currentUserEmail: string;
  onOpen: (entry: LibraryEntry) => void;
  onOpenAsReviewer: (entry: LibraryEntry) => void;
  onDuplicate: (entry: LibraryEntry) => void;
  onArchive: (entry: LibraryEntry) => void;
  onShowInFolder: (entry: LibraryEntry) => void;
  onOpenFromDisk: () => void;
  onRefresh: () => void;
  onSettings: () => void;
  onNewFromTemplate?: () => void;
}

export const LibraryView: FC<LibraryViewProps> = ({
  entries,
  currentUserEmail,
  onOpen,
  onOpenAsReviewer,
  onDuplicate,
  onArchive,
  onShowInFolder,
  onOpenFromDisk,
  onRefresh,
  onSettings,
  onNewFromTemplate,
}) => {
  const [filters, setFilters] = useState<LibraryFilterState>(
    DEFAULT_LIBRARY_FILTER_STATE,
  );
  const visibleEntries = useMemo(
    () => applySort(applyFilters(entries, filters, currentUserEmail), filters.sort),
    [currentUserEmail, entries, filters],
  );

  return (
    <main style={styles.shell}>
      <LibraryHeader
        onOpenFromDisk={onOpenFromDisk}
        onRefresh={onRefresh}
        onSettings={onSettings}
        {...(onNewFromTemplate === undefined ? {} : { onNewFromTemplate })}
      />
      {entries.length === 0 ? (
        <section style={styles.empty} role="status">
          <h2>Your library is empty.</h2>
          <p>Create your first document or open one from disk.</p>
          <button type="button" onClick={onOpenFromDisk}>
            Open from disk
          </button>
        </section>
      ) : (
        <div style={styles.layout}>
          <FilterSidebar entries={entries} state={filters} onChange={setFilters} />
          <section style={styles.main} aria-label="Documents">
            <SearchBar
              value={filters.search}
              onChange={(search) => setFilters({ ...filters, search })}
            />
            <Controls filters={filters} onChange={setFilters} />
            <DocList
              entries={visibleEntries}
              view={filters.view}
              onResetFilters={() => setFilters(DEFAULT_LIBRARY_FILTER_STATE)}
              onOpen={onOpen}
              onOpenAsReviewer={onOpenAsReviewer}
              onDuplicate={onDuplicate}
              onArchive={onArchive}
              onShowInFolder={onShowInFolder}
            />
          </section>
        </div>
      )}
    </main>
  );
};

const Controls: FC<{
  filters: LibraryFilterState;
  onChange: (state: LibraryFilterState) => void;
}> = ({ filters, onChange }) => (
  <div style={styles.controls}>
    <label>
      Sort{" "}
      <select
        value={filters.sort}
        onChange={(event) =>
          onChange({
            ...filters,
            sort: event.target.value as LibraryFilterState["sort"],
          })
        }
      >
        <option value="updated-desc">Updated newest</option>
        <option value="updated-asc">Updated oldest</option>
        <option value="client-asc">Client A-Z</option>
        <option value="created-desc">Created newest</option>
      </select>
    </label>
    <button
      type="button"
      aria-pressed={filters.view === "grid"}
      onClick={() => onChange({ ...filters, view: "grid" })}
    >
      Grid
    </button>
    <button
      type="button"
      aria-pressed={filters.view === "list"}
      onClick={() => onChange({ ...filters, view: "list" })}
    >
      List
    </button>
  </div>
);

const styles: Record<string, CSSProperties> = {
  shell: {
    display: "grid",
    gap: "1rem",
    padding: "1rem",
  },
  layout: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "minmax(12rem, 15rem) minmax(0, 1fr)",
  },
  main: {
    display: "grid",
    gap: "1rem",
  },
  controls: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  empty: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.5rem",
    padding: "2rem",
    textAlign: "center",
  },
};

export default LibraryView;
