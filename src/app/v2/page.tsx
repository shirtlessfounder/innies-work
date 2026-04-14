'use client';

import { useState } from 'react';
import { Header } from '../../components/percentV2/Header';
import { MarketEntryControls } from '../../components/percentV2/MarketEntryControls';
import { MarketPanel } from '../../components/percentV2/MarketPanel';
import { ProposalHeader } from '../../components/percentV2/ProposalHeader';
import { TradeHistoryTable } from '../../components/percentV2/TradeHistoryTable';
import { TradingInterface } from '../../components/percentV2/TradingInterface';

export default function PercentV2Page() {
  const [selectedMarket, setSelectedMarket] = useState<'pass' | 'fail'>('pass');
  const [marketMode, setMarketMode] = useState<'enter' | 'exit'>('enter');
  const [amount, setAmount] = useState('1.00');
  const [selectedToken, setSelectedToken] = useState<'sol' | 'zc'>('sol');

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="flex h-screen bg-[#0a0a0a]">
        <div className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 p-8 pr-10 overflow-y-auto border-r border-[#2A2A2A]">
              <ProposalHeader />
              <div className="mb-8">
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <MarketPanel variant="pass" />
                  <MarketPanel variant="fail" />
                </div>
              </div>
              <TradeHistoryTable />
            </div>
            <div className="w-[352px] p-8 overflow-y-auto">
              <div className="sticky top-0 space-y-6">
                <MarketEntryControls
                  marketMode={marketMode}
                  amount={amount}
                  selectedToken={selectedToken}
                  onAmountChange={setAmount}
                  onTokenChange={setSelectedToken}
                  onMarketModeChange={setMarketMode}
                  onMaxClick={() => setAmount(selectedToken === 'sol' ? '12.345' : '125000')}
                />
                <TradingInterface
                  selectedMarket={selectedMarket}
                  onMarketChange={setSelectedMarket}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
