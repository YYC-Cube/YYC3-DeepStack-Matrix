import { render, screen } from '@testing-library/react';
import { GlassCard } from './GlassCard';

describe('GlassCard', () => {
  it('renders children correctly', () => {
    render(
      <GlassCard>
        <span>Test Content</span>
      </GlassCard>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies gradient class when gradient prop is true', () => {
    const { container } = render(
      <GlassCard gradient>
        <span>Test Content</span>
      </GlassCard>
    );
    expect(container.firstChild).toHaveClass('glass-card-gradient');
  });
});
