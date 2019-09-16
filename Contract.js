const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');
const solc = require('solc');
const fs = require('fs');

module.exports = () => {
    const sourceCode = fs.readFileSync('./contracts/PennySeed.sol').toString();
    
    const sourceObject = {
        language: 'Solidity',
        sources: {
            'PennySeed.sol': {
                content: sourceCode
            }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': [ '*' ]
                }
            }
        }
    };
    
    const compiledCode = JSON.parse(solc.compile(JSON.stringify(sourceObject)));
    const pennySeedInterface = compiledCode.contracts["PennySeed.sol"].PennySeed.abi;
    const pennySeedBytecode = compiledCode.contracts["PennySeed.sol"].PennySeed.evm.bytecode.object;
    const Contract = new web3.eth.Contract(pennySeedInterface);

    return new Promise((resolve, reject) => {
        web3.eth.getAccounts()
            .then(_accounts => {
                accounts = _accounts;
                Contract.deploy({
                    data : pennySeedBytecode,
                }).send({
                    from : accounts[0],
                    gas : 4700000
                }).then(contract => {
                    resolve(contract);
                });
            });
    })
}