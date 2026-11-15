import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("DailyContracts", function () {
  it("completes a quest once per day", async function () {
    const [owner, player] = await ethers.getSigners();
    const gold = await ethers.deployContract("Gold", owner);
    await gold.setIsFeeExempt(owner.address, true);
    const dc = await ethers.deployContract("DailyContracts", [await gold.getAddress()], owner);
    await dc.waitForDeployment();
    await gold.transfer(await dc.getAddress(), ethers.parseEther("100"));

    const balBefore = await gold.balanceOf(player.address);
    await dc.connect(player).completeQuest(0);
    expect(await gold.balanceOf(player.address)).to.be.gt(balBefore);

    await expect(dc.connect(player).completeQuest(0)).to.be.revertedWith("already completed today");
  });

  it("reverts second quest same day", async function () {
    const [owner, player] = await ethers.getSigners();
    const gold = await ethers.deployContract("Gold", owner);
    await gold.setIsFeeExempt(owner.address, true);
    const dc = await ethers.deployContract("DailyContracts", [await gold.getAddress()], owner);
    await dc.waitForDeployment();
    await gold.transfer(await dc.getAddress(), ethers.parseEther("100"));
    await dc.connect(player).completeQuest(1);
    await expect(dc.connect(player).completeQuest(2)).to.be.revertedWith("already completed today");
  });
});
