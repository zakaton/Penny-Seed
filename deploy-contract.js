require('dotenv').config();

const Web3 = require('web3');
    const web3 = new Web3(process.env.WEB3_PROVIDER);
    const solc = require('solc');
    
const fs = require('fs');
    const sourceCode = fs.readFileSync('./contracts/PennySeed.sol').toString();

const {MONGODB_CONNECTION_STRING} = process.env;
    const mongoose = require('mongoose');
    const Contract = require('./models/Contract');
        
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
    const bytecode = compiledCode.contracts["PennySeed.sol"].PennySeed.evm.bytecode.object;
    const interface = compiledCode.contracts["PennySeed.sol"].PennySeed.abi;
        const contract = new web3.eth.Contract(interface);

web3.eth.getAccounts()
    .then(_accounts => {
        accounts = _accounts;
        contract.deploy({
            data : bytecode,
        }).send({
            from : accounts[0],
            gas : 4700000
        }).then(_contract => {
            const {address, jsonInterface} = _contract.options;
            mongoose.connect(MONGODB_CONNECTION_STRING, {useNewUrlParser : true})
                .then(() => {
                    Contract.deleteMany({}, error => {
                        if(!error) {
                            const contract = new Contract({
                                address,
                                jsonInterface: JSON.stringify(jsonInterface),
                            });
                            contract.save();
                        }
                        else
                            console.error(error);
                    });
                })
                .catch(error => {
                    console.error(error);
                });
        });
    });