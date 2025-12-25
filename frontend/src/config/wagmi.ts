import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'BlackBox Arena',
  projectId: '0f0c62d0b7f246f69c2b230b66e0b8f3',
  chains: [sepolia],
  ssr: false,
});
