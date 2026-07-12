import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UniversalTable from '../../components/ui/UniversalTable';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'date', label: 'Date', align: 'center' },
];
const mockData = [
  { name: 'Alice', amount: 100, date: '2024-01-01' },
  { name: 'Bob', amount: 200, date: '2024-01-02' },
];
const renderRow = (row, idx) => (
  <tr key={idx}>
    <td>{row.name}</td>
    <td>{row.amount}</td>
    <td>{row.date}</td>
  </tr>
);

function renderTable(overrides = {}) {
  const onPageChange = vi.fn();
  const props = {
    columns,
    data: mockData,
    loading: false,
    page: 1,
    pageSize: 10,
    total: 2,
    onPageChange,
    renderRow,
    ...overrides,
  };
  render(<UniversalTable {...props} />);
  return { onPageChange };
}

describe('UniversalTable', () => {
  it('Renders column header labels (Name, Amount, Date)', () => {
    renderTable();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
  });

  it('Renders data rows via renderRow — Alice and Bob appear in the DOM', () => {
    renderTable();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('Shows loading spinner (element with class animate-spin) when loading=true, no data rows rendered', () => {
    renderTable({ loading: true });
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
    expect(screen.queryByText('Alice')).toBeNull();
    expect(screen.queryByText('Bob')).toBeNull();
  });

  it('Shows emptyMessage text when data=[]', () => {
    renderTable({ data: [], total: 0, emptyMessage: 'No records found.' });
    expect(screen.getByText('No records found.')).toBeInTheDocument();
  });

  it('Shows emptyIcon content when data=[] and emptyIcon="receipt"', () => {
    renderTable({ data: [], total: 0, emptyMessage: 'No records', emptyIcon: 'receipt' });
    // The icon is rendered as a span with the icon name as its text content
    expect(screen.getByText('receipt')).toBeInTheDocument();
    expect(screen.getByText('No records')).toBeInTheDocument();
  });

  it('Does NOT render footer when total <= pageSize (total=5, pageSize=10) and no footerLeft', () => {
    renderTable({ data: mockData, total: 5, pageSize: 10 });
    expect(screen.queryByText(/Showing/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /previous/i })).toBeNull();
  });

  it('Renders footer when total > pageSize (total=25, pageSize=10)', () => {
    renderTable({ data: mockData, total: 25, pageSize: 10 });
    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
  });

  it('Shows "Showing 1–10 of 25 records" for page=1, pageSize=10, total=25', () => {
    renderTable({ data: mockData, page: 1, pageSize: 10, total: 25 });
    // Note: the component uses an en-dash (–) U+2013, not a hyphen.
    expect(screen.getByText('Showing 1–10 of 25 records')).toBeInTheDocument();
  });

  it('Shows "Showing 11–20 of 25 records" for page=2, pageSize=10, total=25', () => {
    renderTable({ data: mockData, page: 2, pageSize: 10, total: 25 });
    expect(screen.getByText('Showing 11–20 of 25 records')).toBeInTheDocument();
  });

  it('Shows "Showing 21–25 of 25 records" for page=3, pageSize=10, total=25', () => {
    renderTable({ data: mockData, page: 3, pageSize: 10, total: 25 });
    expect(screen.getByText('Showing 21–25 of 25 records')).toBeInTheDocument();
  });

  it('Previous button is disabled when page=1', () => {
    renderTable({ data: mockData, page: 1, pageSize: 10, total: 25 });
    const prev = screen.getByRole('button', { name: /previous/i });
    expect(prev).toBeDisabled();
  });

  it('Next button is disabled when page equals totalPages (page=3, total=25, pageSize=10)', () => {
    renderTable({ data: mockData, page: 3, pageSize: 10, total: 25 });
    const next = screen.getByRole('button', { name: /next/i });
    expect(next).toBeDisabled();
  });

  it('Clicking page 2 button calls onPageChange(2)', () => {
    const { onPageChange } = renderTable({ data: mockData, page: 1, pageSize: 10, total: 25 });
    fireEvent.click(screen.getByText('2'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('Clicking Previous button calls onPageChange(page - 1) (page=2 → calls with 1)', () => {
    const { onPageChange } = renderTable({ data: mockData, page: 2, pageSize: 10, total: 25 });
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('Clicking Next button calls onPageChange(page + 1) (page=1 → calls with 2)', () => {
    const { onPageChange } = renderTable({ data: mockData, page: 1, pageSize: 10, total: 25 });
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('Renders footerLeft content when provided (e.g. <span>Extra</span> appears)', () => {
    renderTable({
      data: mockData,
      page: 1,
      pageSize: 10,
      total: 2,
      footerLeft: <span>Extra</span>,
    });
    expect(screen.getByText('Extra')).toBeInTheDocument();
  });

  it('Renders max 5 page number buttons (seed total=100, pageSize=10 → 10 pages, but only 5 buttons)', () => {
    renderTable({ data: mockData, page: 1, pageSize: 10, total: 100 });
    // The page number buttons are <button> elements whose text is a number 1..n.
    // Collect them and ensure length is exactly 5.
    const allButtons = screen.getAllByRole('button');
    const pageButtons = allButtons.filter((b) => /^\d+$/.test(b.textContent));
    expect(pageButtons.length).toBe(5);
  });

  it('Column with align="right" has <th> with class "text-right"; align="center" has "text-center"', () => {
    renderTable();
    const amountTh = screen.getByText('Amount').closest('th');
    const dateTh = screen.getByText('Date').closest('th');
    expect(amountTh.className).toContain('text-right');
    expect(dateTh.className).toContain('text-center');
  });
});
