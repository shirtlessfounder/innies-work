import { tradeMock } from '../../lib/percentV2/mockData';

const GRID_COLUMNS = '1.5fr 0.7fr 0.7fr 1.5fr 1.5fr 0.7fr';

export function TradeHistoryTable() {
  return (
    <div className="border-b border-l border-r border-[#282828]">
      <div
        className="grid gap-4 px-4 py-3 text-xs text-[#9C9D9E] font-medium border-b border-[#2A2A2A]"
        style={{ gridTemplateColumns: GRID_COLUMNS }}
      >
        <div>Trader</div>
        <div>Bet</div>
        <div>Type</div>
        <div>Amount</div>
        <div>Tx</div>
        <div className="text-right">Age</div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {tradeMock.map((trade) => (
          <div
            key={trade.id}
            className="grid gap-4 px-4 py-3 text-xs hover:bg-[#272A2D]/30 transition-colors"
            style={{ gridTemplateColumns: GRID_COLUMNS }}
          >
            <div className="text-white">{`${trade.userAddress.slice(0, 4)}...${trade.userAddress.slice(-4)}`}</div>
            <div className={trade.market === 'pass' ? 'text-emerald-400' : 'text-rose-400'}>
              {trade.market === 'pass' ? 'Pass' : 'Fail'}
            </div>
            <div className={trade.side === 'Buy' ? 'text-emerald-400' : 'text-rose-400'}>
              {trade.side}
            </div>
            <div className="text-white">{trade.amount}</div>
            <div className="text-white">{`${trade.txSignature.slice(0, 4)}...${trade.txSignature.slice(-4)}`}</div>
            <div className="text-[#9C9D9E] text-right">{trade.age}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
