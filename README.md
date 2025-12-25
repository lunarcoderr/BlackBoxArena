# BlackBox Arena

BlackBox Arena is a privacy-first loot mini-game built on Zama FHE. Players start with four sealed boxes; each open either mints 1-100 GameGold (a confidential ERC7984 token) or grants an extra box. Balances stay encrypted on-chain and can be decrypted by the owner in the frontend using the Zama relayer flow.

## Project Goals
- Prove that confidential tokens can support game mechanics without revealing balances.
- Keep the core loop fully on-chain with no backend server.
- Provide a simple reference implementation for Zama FHE + ERC7984 + React.

## Problems It Solves
- Public token balances reveal player progress; encrypted balances keep rewards private.
- Centralized loot systems require off-chain trust; this keeps rewards on-chain.
- Users still need to prove ownership to decrypt; the relayer flow keeps keys client-side.

## Advantages
- Confidential rewards with FHE while black box counts remain public and auditable.
- Low-friction onboarding: players are initialized on first interaction.
- Single-contract gameplay with deterministic deployments and a clean test loop.
- Clear separation of concerns: viem for reads, ethers for writes in the frontend.
- Frontend configuration is explicit in code, not hidden in environment variables.

## Game Mechanics
1. Each player starts with 4 unopened black boxes.
2. `openBlackBox()` consumes one box and derives a pseudo-random seed.
3. 50% chance: mint 1-100 GameGold to the caller (encrypted mint).
4. 50% chance: grant an extra black box, effectively refunding the opened box.
5. Balances are stored as encrypted `euint64` and can be decrypted only by the holder.

## Smart Contracts
- `contracts/GameGold.sol`: ERC7984 token with black box logic.
- `contracts/FHECounter.sol`: Example FHE counter (not part of the game loop).

### Notable Contract APIs
- `blackBoxesOf(address player)` (view): remaining boxes for any player.
- `joinGame()`: initializes a player with the default 4 boxes.
- `openBlackBox()`: opens a box and returns the encrypted mint, remaining boxes, and reward type.

## Tech Stack
- Solidity 0.8.27
- Hardhat + hardhat-deploy
- Zama FHEVM (`@fhevm/solidity`, `@fhevm/hardhat-plugin`), ERC7984
- TypeScript
- Frontend: React + Vite + wagmi + RainbowKit + viem + ethers v6
- Zama relayer SDK for client-side decryption

## Repository Layout
- `contracts/` smart contracts
- `deploy/` deployment scripts
- `tasks/` Hardhat tasks
- `test/` Hardhat tests
- `frontend/` React app (custom CSS, no Tailwind)

## Prerequisites
- Node.js 20+
- npm
- A funded Sepolia account for deployments

## Environment
Create a `.env` file with the following values (no mnemonics):

```
PRIVATE_KEY=<hex private key with funds>
INFURA_API_KEY=<infura project id>
ETHERSCAN_API_KEY=<optional for verification>
```

## Install
```bash
npm install
```

## Test
```bash
npx hardhat test
```
Tests run against the FHEVM mock; Sepolia-specific tests are skipped unless running on that network.

## Deploy
```bash
# Local FHE mock
npx hardhat deploy --network hardhat

# Sepolia (requires funded PRIVATE_KEY and INFURA_API_KEY)
npx hardhat deploy --network sepolia --tags GameGold
```
Deployment artifacts are written to `deployments/<network>`. Copy the deployed address and ABI from `deployments/sepolia/GameGold.json` into the frontend constants.

## Frontend
1. Update `frontend/src/config/contracts.ts`:
   - Replace `GAME_GOLD_ADDRESS` with the deployed address.
   - Replace `GAME_GOLD_ABI` with the ABI from `deployments/sepolia/GameGold.json`.
2. Run the app:

```bash
cd frontend
npm install
npm run dev
```
The UI reads with viem, writes with ethers, and decrypts balances using the Zama relayer. The app targets Sepolia.

## Tasks
- `npx hardhat task:gamegold-address` print the GameGold address
- `npx hardhat task:blackboxes --player <address>` show unopened boxes
- `npx hardhat task:encrypted-balance --player <address>` print encrypted and clear balances
- `npx hardhat task:open-blackbox` open a box and display the outcome

## Known Limitations
- Randomness uses block data and is not resistant to manipulation; use a stronger source for production.
- `BlackBoxOpened` emits the clear reward amount for UX/debugging, which reduces privacy.
- This repository is not audited.

## Future Plans
- Replace pseudo-randomness with a verifiable randomness source or FHE-based randomness.
- Reduce clear-text emissions and rely more on encrypted-only signals.
- Add seasonal gameplay (leaderboards, resets, or challenges).
- Expand rewards (tiers, NFTs, items) while preserving confidentiality.
- Improve UX with better transaction recovery and status history.
