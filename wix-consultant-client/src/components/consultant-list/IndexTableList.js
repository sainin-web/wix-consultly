import {
  IndexTable,
  LegacyCard,
  IndexFilters,
  useSetIndexFiltersMode,
  useBreakpoints,
  Pagination,
  Spinner,
  Button,
} from "@shopify/polaris";
import { useState, useCallback } from "react";

/**
 * The one admin table. Every list page renders through this so loading,
 * empty, filter and pagination behaviour is identical everywhere.
 *
 * Empty state: pass emptyTitle / emptyDescription / emptyAction, or rely on
 * the defaults derived from resourceName.
 * Filters: hidden automatically when there are no tabs and no query handler,
 * so pages without search never show a dead search bar.
 */
function IndexTableList({
  hideFilters,
  itemStrings = [],
  sortOptions = [],
  data = [],
  headings = [],
  renderRow,
  resourceName = { singular: "item", plural: "items" },
  queryPlaceholder = "Search",
  onTabChange,
  onQueryChange,
  onSortChange,
  page,
  setPage,
  limit,
  totalItems,
  setType,
  loading,
  onHandleCancel,
  emptyTitle,
  emptyDescription,
  emptyAction,
}) {
  const tabs = itemStrings.map((item, index) => ({
    content: item,
    index,
    onAction: () => {},
    id: `${item}-${index}`,
    isLocked: index === 0,
  }));

  const [selected, setSelected] = useState(0);
  const [sortSelected, setSortSelected] = useState(
    sortOptions.length > 0 ? [sortOptions[0].value] : [],
  );
  const { mode, setMode } = useSetIndexFiltersMode();
  const [queryValue, setQueryValue] = useState("");
  const { smDown } = useBreakpoints();

  const showFilters =
    hideFilters === undefined ? tabs.length > 0 || Boolean(onQueryChange) : !hideFilters;

  const handleTabChange = useCallback(
    (selectedIndex) => {
      setSelected(selectedIndex);
      if (setType) setType(selectedIndex);
      if (onTabChange) onTabChange(selectedIndex);
    },
    [setType, onTabChange],
  );

  const handleFiltersQueryChange = useCallback(
    (value) => {
      setQueryValue(value);
      if (onQueryChange) onQueryChange(value);
    },
    [onQueryChange],
  );

  const handleQueryValueRemove = useCallback(() => {
    setQueryValue("");
    if (onQueryChange) onQueryChange("");
  }, [onQueryChange]);

  const handleSortChange = useCallback(
    (sortValue) => {
      setSortSelected(sortValue);
      if (onSortChange) onSortChange(sortValue);
    },
    [onSortChange],
  );

  const hasPagination = page !== undefined && setPage !== undefined && limit !== undefined;
  const totalCount = totalItems !== undefined ? totalItems : data.length;
  const totalPages = hasPagination ? Math.max(1, Math.ceil(totalCount / limit)) : 1;
  const currentPage = page || 1;
  const startItem = hasPagination ? (currentPage - 1) * limit + 1 : 1;
  const endItem = hasPagination ? Math.min(currentPage * limit, totalCount) : data.length;

  const isEmpty = !loading && data.length === 0;
  const plural = resourceName.plural || "items";

  const emptyMarkup = (
    <div className="saas-empty">
      <span className="saas-empty-icon" aria-hidden="true">
        <i className="bi bi-inbox" />
      </span>
      <p className="saas-empty-title">{emptyTitle || `No ${plural} found`}</p>
      <p className="saas-empty-text">
        {emptyDescription ||
          (queryValue
            ? `Nothing matches "${queryValue}". Try a different search.`
            : `There are currently no ${plural}.`)}
      </p>
      {emptyAction && (
        <div className="saas-empty-action">
          <Button onClick={emptyAction.onAction}>{emptyAction.content}</Button>
        </div>
      )}
    </div>
  );

  return (
    <LegacyCard>
      {showFilters && (
        <IndexFilters
          sortOptions={sortOptions}
          sortSelected={sortSelected}
          queryValue={queryValue}
          queryPlaceholder={queryPlaceholder}
          onQueryChange={handleFiltersQueryChange}
          onQueryClear={handleQueryValueRemove}
          onSort={handleSortChange}
          cancelAction={{ onAction: onHandleCancel, disabled: false, loading: false }}
          tabs={tabs}
          selected={selected}
          onSelect={handleTabChange}
          canCreateNewView={false}
          filters={[]}
          appliedFilters={[]}
          onClearAll={handleQueryValueRemove}
          mode={mode}
          setMode={setMode}
        />
      )}

      {loading ? (
        <div className="saas-loading" role="status">
          <Spinner size="small" accessibilityLabel="Loading" />
          <span>Loading {plural}…</span>
        </div>
      ) : isEmpty ? (
        emptyMarkup
      ) : (
        <IndexTable
          condensed={smDown}
          selectable={false}
          resourceName={resourceName}
          itemCount={data.length}
          headings={headings}
        >
          {data.map((item, index) => (renderRow ? renderRow(item, index) : null))}
        </IndexTable>
      )}

      {hasPagination && !loading && totalPages > 1 && (
        <div className="saas-pagination">
          <span>
            {startItem}–{endItem} of {totalCount} {plural}
          </span>
          <Pagination
            hasPrevious={currentPage > 1}
            onPrevious={() => setPage(currentPage - 1)}
            hasNext={currentPage < totalPages}
            onNext={() => setPage(currentPage + 1)}
          />
        </div>
      )}
    </LegacyCard>
  );
}

export default IndexTableList;
