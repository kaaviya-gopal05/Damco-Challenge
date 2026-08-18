import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Archive } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(<EmptyState icon={Archive} title="Nothing here yet" description="Try a different category." />);
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    expect(screen.getByText('Try a different category.')).toBeInTheDocument();
  });

  it('omits the description paragraph when none is given', () => {
    render(<EmptyState icon={Archive} title="Nothing here yet" />);
    expect(screen.queryByText('Try a different category.')).not.toBeInTheDocument();
  });

  it('renders and wires up the action slot', async () => {
    const onClick = vi.fn();
    render(<EmptyState icon={Archive} title="No spaces yet" action={<button onClick={onClick}>Create a space</button>} />);
    await userEvent.click(screen.getByRole('button', { name: 'Create a space' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
