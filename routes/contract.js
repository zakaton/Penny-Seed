require('dotenv').config();

const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');
    const Contract = require('../models/Contract');
    const User = require('../models//User');

var contract = {};
mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {useNewUrlParser : true})
    .then(() => {
        Contract.findOne({})
            .then(_contract => {
                contract = _contract;
            })
    });

router.get('/', (request, response) => {
    const {address, jsonInterface} = contract;
    response.json({
        address,
        jsonInterface : JSON.parse(jsonInterface),
    });
});

module.exports = router;