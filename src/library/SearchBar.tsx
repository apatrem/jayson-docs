import type { CSSProperties, FC } from "react";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar: FC<SearchBarProps> = ({ value, onChange }) => (
  <label style={styles.label}>
    <span style={styles.text}>Search by client, project, or tag</span>
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search by client, project, tag..."
      style={styles.input}
    />
  </label>
);

const styles: Record<string, CSSProperties> = {
  label: {
    display: "grid",
    gap: "0.25rem",
  },
  text: {
    fontWeight: 700,
  },
  input: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.375rem",
    padding: "0.5rem",
    width: "100%",
  },
};
