import { formatCedis } from '../../lib/money';

interface MoneyProps {
  /** Amount in pesewas (integer). */
  pesewas: number;
  className?: string;
}

/**
 * Renders pesewas as GHS with two decimal places.
 * This is the ONLY place cedi formatting occurs (SDD §5.3).
 */
export function Money({ pesewas, className }: MoneyProps) {
  return <span className={className}>{formatCedis(pesewas)}</span>;
}
