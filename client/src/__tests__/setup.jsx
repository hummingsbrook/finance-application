// Client test bootstrap: jest-dom matchers + global mocks
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock echarts-for-react — it calls canvas APIs unavailable in jsdom
vi.mock('echarts-for-react', () => ({
  default: ({ option }) => (
    <div
      data-testid="echarts-mock"
      data-series={JSON.stringify(option?.series?.length)}
    />
  ),
}));

// Mock react-router-dom navigate (keep all real exports)
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});
