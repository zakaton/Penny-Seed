const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

console.log(web3);

web3.eth.getAccounts(function (error, result) {
    console.log(result);
});