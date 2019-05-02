var PennySeed = artifacts.require("./PennySeed.sol");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(PennySeed);
};