import React, { useEffect, useState } from "react";

/**
 * The consultant dashboard table. Every list page (call logs, wallet,
 * withdrawals) renders through this so header, rows, loading, empty state,
 * pagination and mobile card layout are identical.
 *
 * Styling comes from dashboard-theme.css (.cds-* classes). Rows collapse to
 * labelled cards under 640px via data-label attributes.
 *
 * Props
 *   columns   [{ label, key, render?(row), className? }]
 *   data      rows
 *   title / subtitle / action (ReactNode)   card header
 *   emptyTitle / emptyText / emptyIcon      empty state
 *   loading   boolean
 *   pageSize  default 10
 */
const UserTable = ({
  columns,
  data = [],
  title,
  subtitle,
  action,
  loading,
  emptyTitle = "Nothing here yet",
  emptyText = "Records will appear here once there is activity.",
  emptyIcon = null,
  pageSize = 10,
}) => {
  const [page, setPage] = useState(1);
  const total = data.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  // Reset to the first page when the data set changes size.
  useEffect(() => {
    setPage(1);
  }, [total]);

  const start = (page - 1) * pageSize;
  const rows = data.slice(start, start + pageSize);

  return (
    <section className="cds-card">
      {(title || action) && (
        <div className="cds-card-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}

      {loading ? (
        <div className="cds-loading" role="status">
          <span className="cds-spinner" aria-hidden="true" />
          Loading…
        </div>
      ) : total === 0 ? (
        <div className="cds-empty">
          {emptyIcon && (
            <span className="cds-empty-icon" aria-hidden="true">{emptyIcon}</span>
          )}
          <div className="cds-empty-title">{emptyTitle}</div>
          <div className="cds-empty-text">{emptyText}</div>
        </div>
      ) : (
        <div className="cds-table-wrap">
          <table className="cds-table--cards">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={col.className}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row._id || row.id || start + index}>
                  {columns.map((col) => (
                    <td key={col.key} data-label={col.label} className={col.className}>
                      {col.render ? col.render(row) : row[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && pages > 1 && (
        <div className="cds-table-foot">
          <span>
            {start + 1}–{Math.min(start + pageSize, total)} of {total}
          </span>
          <div className="cds-pager">
            <button
              type="button"
              className="cds-btn cds-btn--sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <button
              type="button"
              className="cds-btn cds-btn--sm"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default UserTable;
