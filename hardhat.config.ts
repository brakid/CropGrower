import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { defineConfig } from "hardhat/config";
import { config } from "dotenv";

config();

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.38",
      },
      production: {
        version: "0.8.38",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    brakidchain: {
      type: "http",
      chainType: "l1",
      url: "http://raspberrypi.fritz.box:8545",
      accounts: {
        mnemonic: process.env.MNEMONIC!,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 10,
      },
    },
  },
});
