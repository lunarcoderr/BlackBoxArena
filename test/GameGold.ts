import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

import { GameGold, GameGold__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("GameGold")) as GameGold__factory;
  const gameGold = (await factory.deploy()) as GameGold;
  const address = await gameGold.getAddress();

  return { gameGold, address };
}

describe("GameGold", () => {
  let signers: Signers;
  let gameGold: GameGold;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("GameGold tests require the FHEVM mock network");
      this.skip();
    }

    ({ gameGold, address: contractAddress } = await deployFixture());
  });

  it("assigns four black boxes to new players without using msg.sender in views", async function () {
    const aliceBoxes = await gameGold.blackBoxesOf(signers.alice.address);
    const bobBoxesFromAlice = await gameGold.connect(signers.alice).blackBoxesOf(signers.bob.address);

    expect(aliceBoxes).to.eq(4);
    expect(bobBoxesFromAlice).to.eq(4);
  });

  it("opens a black box and tracks encrypted rewards", async function () {
    const initialBoxes = await gameGold.blackBoxesOf(signers.alice.address);
    expect(initialBoxes).to.eq(4);

    await gameGold.connect(signers.alice).joinGame();
    const openTx = await gameGold.connect(signers.alice).openBlackBox();
    const receipt = await openTx.wait();

    const parsedEvent = receipt?.logs
      .map((log) => {
        try {
          return gameGold.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((log) => log && log.name === "BlackBoxOpened");

    expect(parsedEvent).to.not.be.undefined;

    const boxesAfter = await gameGold.blackBoxesOf(signers.alice.address);
    expect([3n, 4n]).to.include(boxesAfter);

    const encryptedBalance = await gameGold.confidentialBalanceOf(signers.alice.address);
    if (encryptedBalance !== ethers.ZeroHash) {
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        contractAddress,
        signers.alice,
      );
      expect(clearBalance).to.be.greaterThan(0);

      if (parsedEvent) {
        const clearRewardAmount = parsedEvent.args?.clearRewardAmount as bigint;
        expect(clearBalance).to.equal(clearRewardAmount);
      }
    } else {
      expect(parsedEvent?.args?.mintedTokens).to.equal(false);
      expect(parsedEvent?.args?.clearRewardAmount).to.equal(0);
    }
  });
});
