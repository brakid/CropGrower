import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("FarmItems", function () {
  it("mills seeds from crops", async function () {
    const [owner, player] = await ethers.getSigners();
    const items = await ethers.deployContract("FarmItems", owner);
    await items.waitForDeployment();
    const MINTER_ROLE = await items.MINTER_ROLE();
    await items.grantRole(MINTER_ROLE, owner.address);
    await items.mintReward(player.address, 1, 5);
    await items.connect(player).millSeeds(0, 5);
    expect(await items.balanceOf(player.address, 1)).to.equal(0n);
  });

  it("millSeeds runs for various crop indices", async function () {
    const [owner, player] = await ethers.getSigners();
    const items = await ethers.deployContract("FarmItems", owner);
    await items.waitForDeployment();
    const MINTER_ROLE = await items.MINTER_ROLE();
    await items.grantRole(MINTER_ROLE, owner.address);
    for (let crop = 0; crop < 5; crop++) {
      await items.mintReward(player.address, crop + 1, 10);
      await items.connect(player).millSeeds(crop, 10);
      expect(await items.balanceOf(player.address, crop + 1)).to.equal(0n);
      const seeds = await items.balanceOf(player.address, crop + 11);
      expect(seeds).to.be.lte(20n);
    }
  });

  it("burn reduces balance", async function () {
    const [owner, player] = await ethers.getSigners();
    const items = await ethers.deployContract("FarmItems", owner);
    await items.waitForDeployment();
    const MINTER_ROLE = await items.MINTER_ROLE();
    await items.grantRole(MINTER_ROLE, owner.address);
    await items.mintReward(player.address, 2, 7);
    await items.burn(player.address, 2, 3);
    expect(await items.balanceOf(player.address, 2)).to.equal(4n);
  });

  it("mintReward requires MINTER_ROLE", async function () {
    const [owner, player] = await ethers.getSigners();
    const items = await ethers.deployContract("FarmItems", owner);
    await items.waitForDeployment();
    await expect(items.connect(player).mintReward(player.address, 1, 1)).to.revert(ethers);
  });
});
