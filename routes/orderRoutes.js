const express = require('express');
const router = express.Router();
const tutorder = require('../controllers/orderTutorController')



const {
  getAllOrders,
  getSingleOrder,
  getCurrentUserOrders,
  createOrder,
  updateOrder,
  createOrderascompany,createOrdertutor
 
} = require('../controllers/orderController')

router
  .route('/')
  .post( createOrder)
  .get( getAllOrders);
 router.post("/orderascompany", createOrderascompany )
 
router.route('/showAllMyOrders').get( getCurrentUserOrders);

router
  .route('/:id')
  .get( getSingleOrder)
  .patch( updateOrder);





module.exports = router;
