import type { CSSProperties, FC } from "react";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import { ProseRenderer } from "../ProseRenderer";
import type { TableBlock, TableColumnAlign } from "../../schema/blocks/table";

export interface TableProps {
  block: TableBlock;
}

function textAlignForColumn(align: TableColumnAlign): CSSProperties["textAlign"] {
  return align;
}

export const Table: FC<TableProps> = ({ block }) => {
  const brand = useBrandTokens();
  const borderColor = resolveBrandToken(brand, "colors.semantic.border");
  const headerBg = resolveBrandToken(brand, "colors.semantic.surfaceBackground");
  const textPrimary = resolveBrandToken(brand, "colors.semantic.textPrimary");
  const textSecondary = resolveBrandToken(brand, "colors.semantic.textSecondary");

  const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: textPrimary,
    marginBottom: brand.spacing.unit * 3,
  };

  const headerCellStyle = (align: TableColumnAlign): CSSProperties => ({
    padding: `${brand.spacing.unit * 2}px ${brand.spacing.unit * 3}px`,
    border: `1px solid ${borderColor}`,
    backgroundColor: headerBg,
    fontWeight: 600,
    textAlign: textAlignForColumn(align),
  });

  const bodyCellStyle = (align: TableColumnAlign): CSSProperties => ({
    padding: `${brand.spacing.unit * 2}px ${brand.spacing.unit * 3}px`,
    border: `1px solid ${borderColor}`,
    textAlign: textAlignForColumn(align),
    verticalAlign: "top",
  });

  const rowStyle: CSSProperties = {
    breakInside: "avoid",
    pageBreakInside: "avoid",
  };

  const captionStyle: CSSProperties = {
    captionSide: "bottom",
    marginTop: brand.spacing.unit * 2,
    fontSize: brand.typography.scale.caption,
    color: textSecondary,
    textAlign: "left",
  };

  return (
    <figure
      data-block-id={block.id}
      data-block-type="table"
      style={{ margin: 0 }}
    >
      <table style={tableStyle}>
        {block.columns.some((col) => col.width) ? (
          <colgroup>
            {block.columns.map((col, index) => (
              <col
                key={index}
                style={col.width ? { width: col.width } : undefined}
              />
            ))}
          </colgroup>
        ) : null}
        <thead>
          <tr style={rowStyle}>
            {block.columns.map((col, index) => (
              <th key={index} style={headerCellStyle(col.align)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex} style={rowStyle}>
              {row.cells.map((cell, cellIndex) => {
                const align =
                  block.columns[cellIndex]?.align ?? ("left" as const);
                return (
                  <td key={cellIndex} style={bodyCellStyle(align)}>
                    <ProseRenderer fragment={cell} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {block.caption ? (
        <figcaption style={captionStyle}>{block.caption}</figcaption>
      ) : null}
    </figure>
  );
};
