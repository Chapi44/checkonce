const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactusController');

// Routes
router.post('/contacts', contactController.createContact);

router.get('/contacts', contactController.getAllContacts);
router.get('/contacts/:id', contactController.getContactById);

module.exports = router;
