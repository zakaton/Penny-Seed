require('dotenv').config();

const mongoose = require('mongoose');

const Web3 = require('web3');
    const web3 = new Web3(process.env.WEB3_PROVIDER);

const contractSchema = new mongoose.Schema({
    address : String,
    jsonInterface : String,
});

contractSchema.methods.getContract = function(callback) {
    const contractInstance = new web3.eth.Contract(JSON.parse(this.jsonInterface), this.address);
    callback(contractInstance);
}

contractSchema.statics.getContract = function(callback) {
    this.findOne({})
        .then(contract => {
            contract.getContract(_contract => {
                callback(_contract);
            });
        });
}

const Contract = mongoose.model('Contract', contractSchema);

module.exports = Contract;