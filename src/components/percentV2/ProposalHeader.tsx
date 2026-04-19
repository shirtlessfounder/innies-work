'use client';

import { useState } from 'react';
import { proposalMock } from '../../lib/percentV2/mockData';
import { CountdownTimer } from './CountdownTimer';
import { StatusBadge } from './StatusBadge';

export function ProposalHeader() {
  const [activeTab, setActiveTab] = useState<'trade' | 'description'>('trade');

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={proposalMock.status} />
          <span className="w-px h-4 bg-[#282828]" />
          <span className="text-xs text-gray-500">
            {new Date(proposalMock.finalizedAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })} at {new Date(proposalMock.finalizedAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          <span className="w-px h-4 bg-[#282828]" />
          <div className="flex items-center gap-2">
            <span className="text-gray-400">TIMER</span>
            <span className="text-sm font-mono font-bold text-white">
              <CountdownTimer endsAt={proposalMock.finalizedAt} />
            </span>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-2">
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-400 mb-1">TWAP Pass-Fail Gap (PFG)</span>
            <span className="text-lg font-bold text-white">
              {proposalMock.pfgPercentage.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h1 className="text-3xl font-semibold mb-4">{proposalMock.title}</h1>

        <div className="inline-flex border-b border-[#2A2A2A] mb-6">
          <button
            onClick={() => setActiveTab('trade')}
            className={`px-6 py-2 text-sm font-medium transition-colors relative ${activeTab === 'trade' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}
          >
            Trade
            {activeTab === 'trade' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('description')}
            className={`px-6 py-2 text-sm font-medium transition-colors relative ${activeTab === 'description' ? 'text-white' : 'text-gray-400 hover:text-gray-300'}`}
          >
            Description
            {activeTab === 'description' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
        </div>

        {activeTab === 'description' && (
          <div className="bg-[#1A1A1A] rounded-lg p-6">
            <p className="text-sm text-[#d3d3d3] leading-6">{proposalMock.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
