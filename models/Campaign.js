const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    campaigner : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    },
    deadline : Date,
    amount : String,
    pledgers : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    }],
    minimumNumberOfPledgers : {
        type : Number,
        min : 1,
    },
    transactionHash : String,
});

const Campaign = mongoose.model('Campaign', campaignSchema);

module.exports = Campaign;