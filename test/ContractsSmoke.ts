import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("Contract smoke tests", function () {
  it("deploys FarmManager", async function () {
    const [owner] = await ethers.getSigners();
    const gold = await ethers.deployContract("Gold", owner);
    const items = await ethers.deployContract("FarmItems", owner);
    const tiles = await ethers.deployContract("SoilTiles", [await items.getAddress()], owner);
    const c = await ethers.deployContract("FarmManager", [await gold.getAddress(), await tiles.getAddress(), await items.getAddress()], owner);
    await c.waitForDeployment();
    expect(await c.MAX_TILES()).to.equal(20n);
  });

  it("deploys Marketplace", async function () {
    const [owner] = await ethers.getSigners();
    const gold = await ethers.deployContract("Gold", owner);
    const items = await ethers.deployContract("FarmItems", owner);
    const tiles = await ethers.deployContract("SoilTiles", [await items.getAddress()], owner);
    const c = await ethers.deployContract("Marketplace", [await gold.getAddress(), await items.getAddress(), await tiles.getAddress()], owner);
    await c.waitForDeployment();
    expect(await c.getAddress()).to.be.properAddress;
  });

  it("deploys DailyContracts", async function () {
    const [owner] = await ethers.getSigners();
    const gold = await ethers.deployContract("Gold", owner);
    const c = await ethers.deployContract("DailyContracts", [await gold.getAddress()], owner);
    await c.waitForDeployment();
    expect(await c.getAddress()).to.be.properAddress;
  });

  it("deploys FarmItems", async function () {
    const [owner] = await ethers.getSigners();
    const c = await ethers.deployContract("FarmItems", owner);
    await c.waitForDeployment();
    expect(await c.getAddress()).to.be.properAddress;
  });
});