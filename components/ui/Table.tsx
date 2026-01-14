'use client';

import { type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  selectedKeys?: Set<string>;
  className?: string;
}

function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No data available',
  onRowClick,
  selectedKeys,
  className = '',
}: TableProps<T>) {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
        <div className="animate-pulse">
          <div className="h-12 bg-slate-100 border-b border-slate-200" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 border-b border-slate-100 flex items-center px-6 gap-4">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-200 rounded w-1/5" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
        <div className="py-16 text-center">
          <p className="text-slate-500">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider
                    ${alignClasses[column.align || 'left']}
                  `}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, index) => {
              const key = keyExtractor(item);
              const isSelected = selectedKeys?.has(key);

              return (
                <tr
                  key={key}
                  className={`
                    transition-colors duration-150
                    ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}
                    ${isSelected ? 'bg-indigo-50' : ''}
                  `}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <td
                      key={`${key}-${column.key}`}
                      className={`
                        px-6 py-4 text-sm text-slate-900
                        ${alignClasses[column.align || 'left']}
                      `}
                    >
                      {column.render
                        ? column.render(item, index)
                        : (item as Record<string, unknown>)[column.key] as ReactNode}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { Table };

