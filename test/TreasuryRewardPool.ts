import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("TreasuryRewardPool", function () {
  it("deposits and pays out via role", async function () {
    const [owner, player] = await ethers.getSigners();
    const gold = await ethers.deployContract("Gold", owner);
    const pool = await ethers.deployContract("TreasuryRewardPool", [await gold.getAddress()], owner);
    await gold.setIsFeeExempt(owner.address, true);
    await gold.setIsFeeExempt(await pool.getAddress(), true);
    await pool.waitForDeployment();

    await gold.transfer(await pool.getAddress(), ethers.parseEther("10"));
    expect(await pool.balance()).to.equal(ethers.parseEther("10"));

    const PAYOUT_ROLE = await pool.PAYOUT_ROLE();
    await pool.grantRole(PAYOUT_ROLE, owner.address);
    await pool.payout(player.address, ethers.parseEther("3"));
    expect(await gold.balanceOf(player.address)).to.equal(ethers.parseEther("3"));
  });
});