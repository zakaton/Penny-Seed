const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    id : String,
    customerId : String,
    connectId : String,
    etherAddress : String,
});

const User = mongoose.model('User', UserSchema);

module.exports = User;