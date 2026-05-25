import type { CSSProperties, FC } from "react";
import type { Meta } from "../schema/meta";
import {
  DEFAULT_LIBRARY_FILTER_STATE,
  toggleFilterValue,
  type LibraryEntry,
  type LibraryFilterState,
} from "./filter";

export interface FilterSidebarProps {
  entries: LibraryEntry[];
  state: LibraryFilterState;
  onChange: (state: LibraryFilterState) => void;
}

const statuses: Meta["status"][] = [
  "draft",
  "in-review",
  "sent",
  "won",
  "lost",
  "archived",
];

const kinds: Meta["docKind"][] = ["proposal", "report", "audit", "memo", "deck", "other"];
const languages: Meta["language"][] = ["en", "fr"];

export const FilterSidebar: FC<FilterSidebarProps> = ({ entries, state, onChange }) => {
  const sectors = [...new Set(entries.map((entry) => entry.meta.sector).filter(isString))];

  return (
    <aside style={styles.sidebar} aria-label="Library filters">
      <FilterGroup
        label="Status"
        options={statuses}
        selected={state.status}
        count={(status) => entries.filter((entry) => entry.meta.status === status).length}
        onToggle={(value, checked) =>
          onChange({ ...state, status: toggleFilterValue(state.status, value, checked) })
        }
      />
      <FilterGroup
        label="Kind"
        options={kinds}
        selected={state.docKind}
        count={(kind) => entries.filter((entry) => entry.meta.docKind === kind).length}
        onToggle={(value, checked) =>
          onChange({ ...state, docKind: toggleFilterValue(state.docKind, value, checked) })
        }
      />
      <FilterGroup
        label="Sector"
        options={sectors}
        selected={state.sector}
        count={(sector) => entries.filter((entry) => entry.meta.sector === sector).length}
        onToggle={(value, checked) =>
          onChange({ ...state, sector: toggleFilterValue(state.sector, value, checked) })
        }
      />
      <FilterGroup
        label="Language"
        options={languages}
        selected={state.language}
        count={(language) => entries.filter((entry) => entry.meta.language === language).length}
        onToggle={(value, checked) =>
          onChange({ ...state, language: toggleFilterValue(state.language, value, checked) })
        }
      />
      <fieldset style={styles.group}>
        <legend style={styles.legend}>Owner</legend>
        <label>
          <input
            type="radio"
            name="ownerMode"
            checked={state.ownerMode === "me"}
            onChange={() => onChange({ ...state, ownerMode: "me" })}
          />{" "}
          Me
        </label>
        <label>
          <input
            type="radio"
            name="ownerMode"
            checked={state.ownerMode === "all"}
            onChange={() => onChange({ ...state, ownerMode: "all" })}
          />{" "}
          All
        </label>
      </fieldset>
      <label>
        <input
          type="checkbox"
          checked={state.showArchived}
          onChange={(event) =>
            onChange({ ...state, showArchived: event.target.checked })
          }
        />{" "}
        Show archived
      </label>
      <button type="button" onClick={() => onChange(DEFAULT_LIBRARY_FILTER_STATE)}>
        Reset filters
      </button>
    </aside>
  );
};

const FilterGroup = <T extends string>({
  label,
  options,
  selected,
  count,
  onToggle,
}: {
  label: string;
  options: T[];
  selected: T[] | null;
  count: (value: T) => number;
  onToggle: (value: T, checked: boolean) => void;
}) => (
  <fieldset style={styles.group}>
    <legend style={styles.legend}>{label}</legend>
    {options.map((option) => (
      <label key={option}>
        <input
          type="checkbox"
          checked={selected?.includes(option) ?? false}
          onChange={(event) => onToggle(option, event.target.checked)}
        />{" "}
        {option} ({count(option)})
      </label>
    ))}
  </fieldset>
);

function isString(value: string | undefined): value is string {
  return value !== undefined;
}

const styles: Record<string, CSSProperties> = {
  sidebar: {
    alignContent: "start",
    borderRight: "1px solid ButtonBorder",
    display: "grid",
    gap: "1rem",
    minWidth: "15rem",
    paddingRight: "1rem",
  },
  group: {
    border: 0,
    display: "grid",
    gap: "0.25rem",
    margin: 0,
    padding: 0,
  },
  legend: {
    fontWeight: 700,
    marginBottom: "0.25rem",
  },
};
