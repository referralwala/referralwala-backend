const express = require('express');
const router = express.Router();
const { login } = require('../admincontrollers/adminAuthController'); 


router.post('/login', login);

module.exports = router;
