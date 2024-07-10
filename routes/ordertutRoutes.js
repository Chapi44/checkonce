const express = require('express');
const router = express.Router();
const {
  createOrdertutor,
  getAllOrders,
  getSingleOrder,
} = require('../controllers/orderTutorController');

router.route('/').post(createOrdertutor).get(getAllOrders);
router.route('/:id').get(getSingleOrder);

module.exports = router;
