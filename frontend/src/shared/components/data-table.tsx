import type { ReactNode } from 'react';

export interface TableColumn<Row> {
  key: string;
  title: string;
  render: (item: Row) => ReactNode;
}
interface DataTableProps<Row> {
  columns: Array<TableColumn<Row>>;
  rows: Row[];
  getRowKey: (item: Row) => string;
  emptyMessage?: string;
}
export function DataTable<Row>({
  columns, rows, getRowKey, emptyMessage = 'Nenhum registro encontrado.',
}: DataTableProps<Row>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line-subtle bg-white">
      <table className="w-full min-w-[600px] text-left text-sm">
        <thead className="bg-surface-page text-ink-secondary">
          <tr>
            {columns.map((column) => <th key={column.key} scope="col" className="px-4 py-3">{column.title}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="border-t border-line-subtle">
              {columns.map((column) => <td key={column.key} className="px-4 py-4">{column.render(row)}</td>)}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-ink-secondary">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
