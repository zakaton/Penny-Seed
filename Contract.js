const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');
const solc = require('solc');
const fs = require('fs');

const {MONGODB_CONNECTION_STRING} = process.env;
const mongoose = require('mongoose');
const Contract = require('./models/Contract');

module.exports = () => {
    return new Promise((resolve, reject) => {
        mongoose.connect(MONGODB_CONNECTION_STRING, {useNewUrlParser : true})
            .then(() => {
                Contract.findOne({})
                    .then(contract => {
                        if(contract !== null) {
                            const contractInstance = new web3.eth.Contract(JSON.parse(contract.jsonInterface), contract.address);
                            resolve(contractInstance);
                        }
                        else {
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
    
                            const ContractModel = require('./models/Contract');
    
                            const compiledCode = JSON.parse(solc.compile(JSON.stringify(sourceObject)));
                            const pennySeedInterface = compiledCode.contracts["PennySeed.sol"].PennySeed.abi;
                            const pennySeedBytecode = compiledCode.contracts["PennySeed.sol"].PennySeed.evm.bytecode.object;
                            const Contract = new web3.eth.Contract(pennySeedInterface);
    
                            web3.eth.getAccounts()
                                .then(_accounts => {
                                    accounts = _accounts;
                                    Contract.deploy({
                                        data : pennySeedBytecode,
                                    }).send({
                                        from : accounts[0],
                                        gas : 4700000
                                    }).then(contract => {
                                        const contractModel = new ContractModel({
                                            address : contract.options.address,
                                            jsonInterface : JSON.stringify(contract.options.jsonInterface),
                                        });
                                        contractModel.save();
                                        resolve(contract);
                                    });
                                });
                        }
                    })
            })
            .catch(error => console.log(error));
    })
}