import { Header } from '../../components/percentV2/Header';
import { MarketPanel } from '../../components/percentV2/MarketPanel';
import { ProposalHeader } from '../../components/percentV2/ProposalHeader';
import { TradeHistoryTable } from '../../components/percentV2/TradeHistoryTable';

export default function PercentV2Page() {
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
          </div>
        </div>
      </div>
    </main>
  );
}
