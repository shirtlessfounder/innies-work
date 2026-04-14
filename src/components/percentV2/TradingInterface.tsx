'use client';

interface TradingInterfaceProps {
  selectedMarket: 'pass' | 'fail';
  onMarketChange: (market: 'pass' | 'fail') => void;
}

export function TradingInterface({ selectedMarket, onMarketChange }: TradingInterfaceProps) {
  return (
    <div className="rounded-lg border border-[#2A2A2A] bg-[#121212] overflow-hidden">
      <div className="border-b border-[#2A2A2A] p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onMarketChange('pass')}
            className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${selectedMarket === 'pass' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-[#2A2A2A] bg-[#1A1A1A] text-gray-400 hover:text-white'}`}
          >
            Pass
          </button>
          <button
            type="button"
            onClick={() => onMarketChange('fail')}
            className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${selectedMarket === 'fail' ? 'border-rose-500/50 bg-rose-500/10 text-rose-300' : 'border-[#2A2A2A] bg-[#1A1A1A] text-gray-400 hover:text-white'}`}
          >
            Fail
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="rounded-lg bg-[#1A1A1A] p-4">
          <div className="text-xs tracking-[0.18em] uppercase text-[#9C9D9E] mb-2">Market Price</div>
          <div className="text-3xl font-semibold text-white">{selectedMarket === 'pass' ? '0.58' : '0.42'}</div>
        </div>

        <div className="rounded-lg bg-[#1A1A1A] p-4">
          <div className="text-xs tracking-[0.18em] uppercase text-[#9C9D9E] mb-3">Potential Payout</div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-white">
              <span>If {selectedMarket === 'pass' ? 'Pass' : 'Fail'}</span>
              <span>{selectedMarket === 'pass' ? '1.72x' : '2.38x'}</span>
            </div>
            <div className="flex items-center justify-between text-[#9C9D9E]">
              <span>Implied edge</span>
              <span>{selectedMarket === 'pass' ? '+8.4%' : '-8.4%'}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="w-full rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-4 py-3 text-sm font-medium text-[#9C9D9E] hover:text-white transition"
        >
          Mock Trade Action
        </button>
      </div>
    </div>
  );
}
