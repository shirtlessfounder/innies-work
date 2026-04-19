interface MarketEntryControlsProps {
  marketMode: 'enter' | 'exit';
  amount: string;
  selectedToken: 'sol' | 'zc';
  onAmountChange: (amount: string) => void;
  onTokenChange: (token: 'sol' | 'zc') => void;
  onMarketModeChange: (mode: 'enter' | 'exit') => void;
  onMaxClick: () => void;
}

export function MarketEntryControls({
  marketMode,
  amount,
  selectedToken,
  onAmountChange,
  onTokenChange,
  onMarketModeChange,
  onMaxClick
}: MarketEntryControlsProps) {
  return (
    <div className="p-3 rounded-lg border border-orange-500/30">
      <div className="relative mb-3">
        <input
          type="text"
          inputMode="decimal"
          pattern="[0-9]*[.]?[0-9]*"
          value={amount}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (nextValue === '' || /^\d*\.?\d*$/.test(nextValue)) {
              onAmountChange(nextValue);
            }
          }}
          placeholder="0.0"
          className="w-full px-3 py-3 pr-32 bg-[#2a2a2a] rounded-lg text-white placeholder-gray-600 focus:outline-none border border-[#2A2A2A]"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            onClick={onMaxClick}
            className="px-2 h-7 bg-[#333] rounded hover:bg-[#404040] transition cursor-pointer text-xs text-[#AFAFAF] font-medium"
          >
            MAX
          </button>
          <button
            onClick={() => onTokenChange(selectedToken === 'sol' ? 'zc' : 'sol')}
            className="flex items-center justify-center px-2 h-7 bg-[#333] rounded hover:bg-[#404040] transition cursor-pointer"
          >
            {selectedToken === 'sol' ? (
              <span className="text-xs text-[#AFAFAF] font-medium">SOL</span>
            ) : (
              <span className="text-xs text-[#AFAFAF] font-bold">$ZC</span>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Enter / Exit</span>
          <button
            onClick={() => onMarketModeChange(marketMode === 'enter' ? 'exit' : 'enter')}
            className="relative w-11 h-6 rounded-full border border-[#2A2A2A] bg-[#1a1a1a] cursor-pointer hover:border-[#404040] transition flex items-center"
          >
            <div
              className={`absolute w-5 h-5 rounded-full bg-orange-500 transition-all duration-200 ease-in-out ${marketMode === 'enter' ? 'left-[2px]' : 'left-[22px]'}`}
            />
          </button>
        </div>

        <button
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${amount ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-[#2a2a2a] text-gray-600 cursor-not-allowed'}`}
          disabled={!amount}
          type="button"
        >
          <span className="text-sm">
            {marketMode === 'enter' ? 'Enter Market' : 'Exit Market'}
          </span>
        </button>
      </div>
    </div>
  );
}
