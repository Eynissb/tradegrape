'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Column<Row> {
  key: string;
  label: ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right';
  mono?: boolean;
  render: (row: Row) => ReactNode;
}

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

export interface TableProps<Row> {
  columns: Column<Row>[];
  data: Row[];
  rowKey: (row: Row) => string;
  sort?: SortState | null;
  onSort?: (key: string) => void;
  rowHref?: (row: Row) => string;
  isSelected?: (row: Row) => boolean;
  empty?: ReactNode;
}

export default function Table<Row>({
  columns,
  data,
  rowKey,
  sort,
  onSort,
  isSelected,
  empty,
}: TableProps<Row>) {
  if (data.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort?.key === col.key;
              const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(col.align === 'right' && 'num')}
                  aria-sort={col.sortable ? ariaSort : undefined}
                >
                  {col.sortable && onSort ? (
                    <button type="button" className="th-sort" onClick={() => onSort(col.key)}>
                      {col.label}
                      {active ? (
                        sort.dir === 'asc' ? (
                          <ArrowUp aria-hidden="true" />
                        ) : (
                          <ArrowDown aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={rowKey(row)} className={cn(isSelected?.(row) && 'is-selected')}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(col.align === 'right' && 'num')}
                  data-label={typeof col.label === 'string' ? col.label : undefined}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
