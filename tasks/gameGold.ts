import { task } from "hardhat/config";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { TaskArguments } from "hardhat/types";

task("task:gamegold-address", "Prints the GameGold contract address").setAction(async function (
  _taskArguments: TaskArguments,
  hre,
) {
  const { deployments } = hre;
  const gameGold = await deployments.get("GameGold");
  console.log(`GameGold address: ${gameGold.address}`);
});

task("task:blackboxes", "Returns how many black boxes a player can open")
  .addOptionalParam("player", "Player address to query")
  .addOptionalParam("address", "Optionally specify the GameGold contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const { player, address } = taskArguments as { player?: string; address?: string };

    const gameGoldDeployment = address ? { address } : await deployments.get("GameGold");
    const signer = (await ethers.getSigners())[0];
    const account = player ?? signer.address;

    const contract = await ethers.getContractAt("GameGold", gameGoldDeployment.address);
    const boxes = await contract.blackBoxesOf(account);

    console.log(`Player: ${account}`);
    console.log(`Black boxes available: ${boxes.toString()}`);
  });

task("task:encrypted-balance", "Shows encrypted and decrypted GameGold balance")
  .addOptionalParam("player", "Player address to query")
  .addOptionalParam("address", "Optionally specify the GameGold contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const { player, address } = taskArguments as { player?: string; address?: string };
    const signer = (await ethers.getSigners())[0];
    const gameGoldDeployment = address ? { address } : await deployments.get("GameGold");
    const account = player ?? signer.address;

    const contract = await ethers.getContractAt("GameGold", gameGoldDeployment.address);
    const encryptedBalance = await contract.confidentialBalanceOf(account);

    console.log(`GameGold: ${gameGoldDeployment.address}`);
    console.log(`Encrypted balance: ${encryptedBalance}`);

    if (encryptedBalance === ethers.ZeroHash) {
      console.log("Clear balance: 0");
      return;
    }

    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      gameGoldDeployment.address,
      signer,
    );
    console.log(`Clear balance: ${clearBalance}`);
  });

task("task:open-blackbox", "Opens a black box and displays the new status")
  .addOptionalParam("address", "Optionally specify the GameGold contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const { address } = taskArguments as { address?: string };
    const [signer] = await ethers.getSigners();
    const gameGoldDeployment = address ? { address } : await deployments.get("GameGold");

    const contract = await ethers.getContractAt("GameGold", gameGoldDeployment.address);

    const tx = await contract.connect(signer).openBlackBox();
    console.log(`Waiting for tx ${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`Status: ${receipt?.status}`);

    const boxes = await contract.blackBoxesOf(signer.address);
    const encryptedBalance = await contract.confidentialBalanceOf(signer.address);
    const clearBalance =
      encryptedBalance === ethers.ZeroHash
        ? 0
        : await fhevm.userDecryptEuint(FhevmType.euint64, encryptedBalance, gameGoldDeployment.address, signer);

    console.log(`Black boxes remaining: ${boxes.toString()}`);
    console.log(`Clear balance: ${clearBalance}`);
  });
