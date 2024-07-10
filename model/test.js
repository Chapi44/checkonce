const Order = require('../model/order');
const Product1 = require('../model/course');

const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');
const { checkPermissions } = require('../utils');

const fakeStripeAPI = async ({ amount, currency }) => {
  const client_secret = 'someRandomValue';
  return { client_secret, amount };
};



const createOrdertutor = async (req, res) => {
  const { items: cartItems, encrypted_url } = req.body;

  const {userId} = req.body;
  if (!userId) {
    throw new CustomError.BadRequestError('User not found');
  }

  if (!cartItems || cartItems.length < 1) {
    throw new CustomError.BadRequestError('No cart items provided');
  }

  // Fetch user's previous orders
  const userOrders = await Order.find({ user: userId });

  let orderItems = [];
  let subtotal = 0;

  for (const item of cartItems) {
    const dbProduct1 = await Product1.findOne({ _id: item.Product1 });
    if (!dbProduct1) {
      throw new CustomError.NotFoundError(
        `No Product1 with id : ${item.Product1}`
      );
    }

    // // Check if the user has already ordered this Product1
    // const Product1Ordered = userOrders.some(order =>
    //   order.orderItems.some(orderItem => orderItem.Product1.equals(dbProduct1._id))
    // );

    // // if (Product1Ordered) {
    // //   throw new CustomError.BadRequestError('You have already enrolled this course');
    // // }

    const { images, courseName, price, _id } = dbProduct1;
    const singleOrderItem = {
      amount: 1, // Fixed amount to 1
      price,
      images,
      courseName,
      Product1: _id,
      
    };

    // add item to order
    orderItems.push(singleOrderItem);
    // calculate subtotal
    subtotal += price; // Since amount is always 1, no need to multiply with amount
  }

  // calculate total
  const total = subtotal;
  // get client secret
  const paymentIntent = await fakeStripeAPI({
    amount: total,
    currency: 'usd',
  });

  // create the order with populated orderItems
  const order = await Order.create({
    orderItems,
    total,
    subtotal,
    clientSecret: paymentIntent.client_secret,
    encrypted_url,
    user: userId,
  });

  // Populate Product1 details in orderItems
  await Order.populate(order, { path: 'orderItems.Product1' });

  // send the order details in the response
  res
    .status(StatusCodes.CREATED)
    .json({ order, clientSecret: order.clientSecret });
};