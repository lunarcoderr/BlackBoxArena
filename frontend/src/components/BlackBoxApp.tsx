import { useCallback, useEffect, useState } from 'react';
import { Contract, Interface } from 'ethers';
import type{  InterfaceAbi } from 'ethers';
import { useAccount, usePublicClient } from 'wagmi';

import { GAME_GOLD_ABI, GAME_GOLD_ADDRESS } from '../config/contracts';
import { Header } from './Header';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import '../styles/BlackBoxApp.css';

const gameGoldInterface = new Interface(GAME_GOLD_ABI as InterfaceAbi);
const ZERO_HANDLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

type Reward = {
  mintedTokens: boolean;
  clearRewardAmount: bigint;
  blackBoxesRemaining: bigint;
  txHash: string;
};

export function BlackBoxApp() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const signer = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [boxesAvailable, setBoxesAvailable] = useState<number>(4);
  const [encryptedBalance, setEncryptedBalance] = useState<string>('');
  const [decryptedBalance, setDecryptedBalance] = useState<string | null>(null);
  const [lastReward, setLastReward] = useState<Reward | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [txError, setTxError] = useState<string>('');

  const contractReady = true

  const refreshState = useCallback(async () => {
    if (!publicClient || !address || !contractReady) return;

    try {
      const [boxCount, balance] = await Promise.all([
        publicClient.readContract({
          address: GAME_GOLD_ADDRESS as `0x${string}`,
          abi: GAME_GOLD_ABI,
          functionName: 'blackBoxesOf',
          args: [address],
        }),
        publicClient.readContract({
          address: GAME_GOLD_ADDRESS as `0x${string}`,
          abi: GAME_GOLD_ABI,
          functionName: 'confidentialBalanceOf',
          args: [address],
        }),
      ]);

      setBoxesAvailable(Number(boxCount));
      setEncryptedBalance(balance as string);
    } catch (error) {
      console.error('Failed to refresh on-chain state', error);
    }
  }, [publicClient, address, contractReady]);

  useEffect(() => {
    setDecryptedBalance(null);
    setLastReward(null);
    setStatus('');
    setTxError('');
    refreshState();
  }, [address, refreshState]);

  const decryptBalance = useCallback(async () => {
    if (!instance) {
      setTxError('Encryption service is not ready yet.');
      return;
    }
    if (!address) {
      setTxError('Connect your wallet to decrypt.');
      return;
    }
    if (!encryptedBalance || encryptedBalance === ZERO_HANDLE) {
      setDecryptedBalance('0');
      return;
    }

    const resolvedSigner = await signer;
    if (!resolvedSigner) {
      setTxError('Unable to access signer.');
      return;
    }

    setIsDecrypting(true);
    setTxError('');

    try {
      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: encryptedBalance,
          contractAddress: GAME_GOLD_ADDRESS,
        },
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [GAME_GOLD_ADDRESS];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);

      const signature = await resolvedSigner.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const decrypted = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const clearValue = decrypted[encryptedBalance] ?? '0';
      setDecryptedBalance(BigInt(clearValue).toString());
    } catch (error) {
      console.error('Failed to decrypt balance', error);
      setTxError('Failed to decrypt balance. Please try again.');
    } finally {
      setIsDecrypting(false);
    }
  }, [instance, address, encryptedBalance, signer]);

  const openBlackBox = useCallback(async () => {
    if (!contractReady) {
      setTxError('Set a deployed GameGold address in deployments/sepolia/GameGold.json.');
      return;
    }
    if (!isConnected) {
      setTxError('Connect your wallet to open a black box.');
      return;
    }

    const resolvedSigner = await signer;
    if (!resolvedSigner) {
      setTxError('Unable to access signer.');
      return;
    }

    setIsOpening(true);
    setTxError('');
    setStatus('Opening black box...');

    try {
      const contract = new Contract(GAME_GOLD_ADDRESS, GAME_GOLD_ABI, resolvedSigner);
      const tx = await contract.openBlackBox();
      const receipt = await tx.wait();

      setStatus(receipt?.status === 1 ? 'Black box opened' : 'Transaction reverted');

      const parsedEvent = receipt?.logs
        .map((log: any) => {
          try {
            return gameGoldInterface.parseLog(log);
          } catch (err) {
            return null;
          }
        })
        .find((log:any) => log && log.name === 'BlackBoxOpened');

      if (parsedEvent) {
        const { mintedTokens, clearRewardAmount, blackBoxesRemaining } = parsedEvent.args as unknown as {
          mintedTokens: boolean;
          clearRewardAmount: bigint;
          blackBoxesRemaining: bigint;
        };

        setLastReward({
          mintedTokens,
          clearRewardAmount,
          blackBoxesRemaining,
          txHash: tx.hash,
        });
      }

      setDecryptedBalance(null);
      await refreshState();
    } catch (error) {
      console.error('Failed to open black box', error);
      setTxError(error instanceof Error ? error.message : 'Opening black box failed');
      setStatus('');
    } finally {
      setIsOpening(false);
    }
  }, [contractReady, isConnected, refreshState, signer]);

  const encryptedLabel = encryptedBalance ? `${encryptedBalance.slice(0, 10)}...${encryptedBalance.slice(-6)}` : '—';

  return (
    <div className="blackbox-app">
      <Header />
      <div className="surface">
        <div className="headline">
          <div>
            <p className="eyebrow">Fully homomorphic loot</p>
            <h1>Black Box Arena</h1>
            <p className="lede">
              Crack open four mysterious boxes, mint GameGold, and decrypt your winnings without revealing them on-chain.
            </p>
          </div>
          <div className="pill">
            <span className="dot" />
            Sepolia · GameGold
          </div>
        </div>

        {!contractReady && (
          <div className="warning">Deploy GameGold to Sepolia and set its address in deployments/sepolia/GameGold.json</div>
        )}
        {zamaError && <div className="warning">{zamaError}</div>}

        <div className="grid">
          <div className="card gradient">
            <div className="card-header">
              <p>Encrypted balance</p>
              <span className="chip">Zama relayer</span>
            </div>
            <h2 className="value">{encryptedLabel}</h2>
            <p className="muted">Decrypt to reveal your GameGold.</p>
            <div className="actions">
              <button onClick={decryptBalance} disabled={isDecrypting || !isConnected || zamaLoading}>
                {isDecrypting ? 'Decrypting...' : 'Decrypt balance'}
              </button>
              {decryptedBalance !== null && <span className="badge">{decryptedBalance} GameGold</span>}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <p>Black boxes</p>
              <span className="chip">Start with four</span>
            </div>
            <div className="value-row">
              <h2 className="value large">{boxesAvailable}</h2>
              <p className="muted">Ready to open</p>
            </div>
            <button className="primary" onClick={openBlackBox} disabled={isOpening || !isConnected || !contractReady}>
              {isOpening ? 'Opening...' : 'Open a black box'}
            </button>
            {status && <p className="status">{status}</p>}
          </div>
        </div>

        {lastReward && (
          <div className="card reward">
            <div className="card-header">
              <p>Latest outcome</p>
              <span className={`chip ${lastReward.mintedTokens ? 'success' : 'neutral'}`}>
                {lastReward.mintedTokens ? 'GameGold minted' : 'Extra black box'}
              </span>
            </div>
            <div className="reward-grid">
              <div>
                <p className="muted">Reward</p>
                <h3>{lastReward.mintedTokens ? `${lastReward.clearRewardAmount.toString()} GameGold` : 'Another black box joined your stack'}</h3>
              </div>
              <div>
                <p className="muted">Boxes remaining</p>
                <h3>{lastReward.blackBoxesRemaining.toString()}</h3>
              </div>
              <div>
                <p className="muted">Transaction</p>
                <a
                  className="link"
                  href={`https://sepolia.etherscan.io/tx/${lastReward.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {lastReward.txHash.slice(0, 10)}...{lastReward.txHash.slice(-6)}
                </a>
              </div>
            </div>
          </div>
        )}

        {txError && <div className="warning">{txError}</div>}
      </div>
    </div>
  );
}
