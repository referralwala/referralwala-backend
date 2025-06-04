const express = require('express');
const router = express.Router();
const { login } = require('../adminControllers/adminAuthController'); 


router.post('/login', login);

module.exports = router;
