const express = require('express');
const router = express.Router();

router.get('/', (request, response) => {
    response.render('index', {
        user : request.user,
        _user: request._user,
    });
});

module.exports = router;