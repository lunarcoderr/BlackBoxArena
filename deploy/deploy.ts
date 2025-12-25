import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  if (!deployer) {
    throw new Error("Missing deployer account. Set PRIVATE_KEY in your environment before deploying.");
  }

  const deployedGameGold = await deploy("GameGold", {
    from: deployer,
    log: true,
  });

  console.log(`GameGold contract: `, deployedGameGold.address);
};
export default func;
func.id = "deploy_gameGold"; // id required to prevent reexecution
func.tags = ["GameGold"];
