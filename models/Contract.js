const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
    address : String,
    jsonInterface : String,
});

const Contract = mongoose.model('Contract', contractSchema);

module.exports = Contract;