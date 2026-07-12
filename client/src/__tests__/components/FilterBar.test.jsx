import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterBar from '../../components/ui/FilterBar';

const fields = [
  { key: 'status', label: 'Status', type: 'select', options: [{ value: '', label: 'All' }, { value: 'ACTIVE', label: 'Active' }] },
  { key: 'startDate', label: 'Start Date', type: 'date' },
  { key: 'search', label: 'Search', type: 'search', placeholder: 'Search...' },
];

function renderFilterBar(overrides = {}) {
  const onChange = vi.fn();
  const onClear = vi.fn();
  const props = {
    filters: { status: '', startDate: '', search: '' },
    onChange,
    onClear,
    fields,
    hasActiveFilters: false,
    ...overrides,
  };
  render(<FilterBar {...props} />);
  return { onChange, onClear };
}

describe('FilterBar', () => {
  it('Renders a <select> element for the type="select" field', () => {
    renderFilterBar();
    const select = screen.getByLabelText('Status');
    expect(select.tagName).toBe('SELECT');
  });

  it('Renders an <input type="date"> element for the type="date" field', () => {
    renderFilterBar();
    const dateInput = screen.getByLabelText('Start Date');
    expect(dateInput.tagName).toBe('INPUT');
    expect(dateInput).toHaveAttribute('type', 'date');
  });

  it('Renders an <input type="text"> element for the type="search" field', () => {
    renderFilterBar();
    const searchInput = screen.getByLabelText('Search');
    expect(searchInput.tagName).toBe('INPUT');
    expect(searchInput).toHaveAttribute('type', 'text');
  });

  it('Calls onChange("status", "ACTIVE") when the select changes to "ACTIVE"', () => {
    const { onChange } = renderFilterBar();
    const select = screen.getByLabelText('Status');
    fireEvent.change(select, { target: { value: 'ACTIVE' } });
    expect(onChange).toHaveBeenCalledWith('status', 'ACTIVE');
  });

  it('Calls onChange("startDate", "2024-01-01") when the date input changes', () => {
    const { onChange } = renderFilterBar();
    const dateInput = screen.getByLabelText('Start Date');
    fireEvent.change(dateInput, { target: { value: '2024-01-01' } });
    expect(onChange).toHaveBeenCalledWith('startDate', '2024-01-01');
  });

  it('Calls onChange("search", "hello") when the text input changes', () => {
    const { onChange } = renderFilterBar();
    const searchInput = screen.getByLabelText('Search');
    fireEvent.change(searchInput, { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('search', 'hello');
  });

  it('Does NOT render "Clear all" button when hasActiveFilters=false', () => {
    renderFilterBar({ hasActiveFilters: false });
    expect(screen.queryByRole('button', { name: /clear all/i })).toBeNull();
  });

  it('Renders "Clear all" button when hasActiveFilters=true', () => {
    renderFilterBar({ hasActiveFilters: true });
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
  });

  it('Calls onClear() when "Clear all" is clicked', () => {
    const { onClear } = renderFilterBar({ hasActiveFilters: true });
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }));
    expect(onClear).toHaveBeenCalled();
  });

  it('Renders all 3 fields from the fields array (labels: Status, Start Date, Search)', () => {
    renderFilterBar();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('Renders select options correctly — "All" and "Active" options are in the DOM', () => {
    renderFilterBar();
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
