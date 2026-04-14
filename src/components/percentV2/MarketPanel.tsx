import { proposalMock } from '../../lib/percentV2/mockData';
import { ChartPlaceholder } from './ChartPlaceholder';

interface MarketPanelProps {
  variant: 'pass' | 'fail';
}

export function MarketPanel({ variant }: MarketPanelProps) {
  const marketData = variant === 'pass' ? proposalMock.passValue : proposalMock.failValue;
  const accent = variant === 'pass' ? 'text-emerald-400' : 'text-rose-400';
  const label = variant === 'pass' ? 'If Pass' : 'If Fail';

  return (
    <div className="overflow-hidden rounded-lg">
      <div className="bg-[#1A1A1A] p-4">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${accent}`}>{label}</span>
          <div className="flex items-center gap-2 text-base font-bold text-white">
            <span>{marketData.zc.toLocaleString()} $ZC</span>
            <span className="text-gray-600">|</span>
            <span>{marketData.sol.toFixed(3)} SOL</span>
          </div>
        </div>
      </div>
      <ChartPlaceholder label={label} />
    </div>
  );
}
