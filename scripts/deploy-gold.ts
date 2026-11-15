import { network } from "hardhat";

const { ethers } = await network.create();
const [deployer] = await ethers.getSigners();

console.log("Deploying with account:", deployer.address);

const gold = await ethers.deployContract("Gold");
await gold.waitForDeployment();

console.log("Gold:", await gold.getAddress());
