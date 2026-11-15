import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Marketplace", function () {
  async function setup() {
    const [owner, player] = await ethers.getSigners();
    const gold = await ethers.deployContract("Gold", owner);
    const items = await ethers.deployContract("FarmItems", owner);
    const tiles = await ethers.deployContract("SoilTiles", [await items.getAddress()], owner);
    const market = await ethers.deployContract("Marketplace", [await gold.getAddress(), await items.getAddress(), await tiles.getAddress()], owner);
    await market.waitForDeployment();
    await gold.transfer(await market.getAddress(), ethers.parseEther("100"));
    await gold.setIsFeeExempt(owner.address, true);
    const MINTER_ROLE = await items.MINTER_ROLE();
    await items.grantRole(MINTER_ROLE, owner.address);
    await items.mintReward(player.address, 1, 10);
    await items.connect(player).setApprovalForAll(await market.getAddress(), true);
    return { owner, player, gold, items, market };
  }

  it("sells crops to NPC for gold", async function () {
    const { player, gold, items, market } = await setup();
    const balBefore = await gold.balanceOf(player.address);
    await market.connect(player).sellCropsToNPC(1, 3);
    expect(await gold.balanceOf(player.address)).to.be.gt(balBefore);
    expect(await items.balanceOf(player.address, 1)).to.equal(7n);
  });

  it("NPC buy requires gold transfer", async function () {
    const { owner, player, gold, market } = await setup();
    await gold.transfer(player.address, ethers.parseEther("5"));
    await gold.connect(player).approve(await market.getAddress(), ethers.parseEther("2"));
    const balBefore = await gold.balanceOf(player.address);
    await market.connect(player).buyNPCItem(1, 2);
    expect(await gold.balanceOf(player.address)).to.be.lt(balBefore);
  });

  it("openMysteryBox charges gold", async function () {
    const { owner, player, gold, market } = await setup();
    await gold.transfer(player.address, ethers.parseEther("1000"));
    await gold.connect(player).approve(await market.getAddress(), ethers.parseEther("1000"));
    const balBefore = await gold.balanceOf(player.address);
    await market.connect(player).openMysteryBox(0);
    expect(await gold.balanceOf(player.address)).to.be.lt(balBefore);
  });

  it("sellCropsToNPC burns crops", async function () {
    const { player, items, market } = await setup();
    await market.connect(player).sellCropsToNPC(1, 5);
    expect(await items.balanceOf(player.address, 1)).to.equal(5n);
  });
});
