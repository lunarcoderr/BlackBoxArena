# BlackBox Arena Frontend

A Vite + React dashboard for the GameGold FHE token. Players connect with RainbowKit, open black boxes with ethers, read encrypted balances with viem, and decrypt rewards using the Zama relayer SDK.

## Scripts
```bash
npm install
npm run dev     # start local dev server
npm run build   # production build
```

## Configuration
- Uses Sepolia by default (no environment variables in the UI).
- Contract ABI is sourced from `deployments/sepolia/GameGold.json`. Update the `GAME_GOLD_ADDRESS` constant in `src/config/contracts.ts` after deploying to Sepolia.

## Features
- Display unopened black boxes (starts at four per player).
- Open a black box; either mint 1-100 GameGold or receive another box.
- Read encrypted balances via viem and decrypt with the Zama relayer.
- Wallet connection via RainbowKit; writes use ethers while reads use viem.
