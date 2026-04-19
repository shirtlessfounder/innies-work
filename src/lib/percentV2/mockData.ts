export const percentV2MockData = {
  walletAddress: '7xKXrF9v2L3M9F5Q2b4R8n7Q3t6J2mV1P8wX9Y2zA1Bc',
  solBalance: 12.345,
  zcBalance: 125000,
  status: 'Pending' as const,
  finalizedAt: Date.parse('2025-10-18T20:57:03Z'),
  pfgPercentage: 8.42
};

export const proposalMock = {
  id: 42,
  title: 'Should Percent launch the October growth market?',
  description: 'This is a frozen UI clone of the Percent app shell. Trading, charting, and wallet actions are mocked locally so the visible interface stays faithful to the original source commit.',
  status: 'Pending' as const,
  finalizedAt: Date.parse('2025-10-25T20:57:03Z'),
  pfgPercentage: 8.42,
  passValue: { zc: 182340, sol: 14.821 },
  failValue: { zc: 92310, sol: 8.217 }
};

export const tradeMock = [
  {
    id: 1,
    userAddress: '9h3nKpQ4LmTR4gJYB6a2V5eK8cP1tWz7sM4rQ2xK2R4',
    market: 'pass' as const,
    side: 'Buy',
    amount: '1200 ZC',
    txSignature: '5nX1dQz3bL9vP2mK4yRt8wQa6cNv2ZpL3xF7eJ9KpL',
    age: '2m'
  },
  {
    id: 2,
    userAddress: '7m2vJxN9QeL4bRs6uT5pZ3cK8aY1wDh4nP2fR6xM7Hk',
    market: 'fail' as const,
    side: 'Sell',
    amount: '3.250 SOL',
    txSignature: '8zQ3mLp2nR7xV4cT1wHk9pQa6yJ2fDs4bM7rK5xCvN',
    age: '7m'
  }
];
