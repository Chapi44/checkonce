const Order = require('../model/order');
const Product = require('../model/course');
const Product1 = require('../model/instructor');


const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');

const fakeStripeAPI = async ({ amount, currency }) => {
  const client_secret = 'someRandomValue';
  return { client_secret, amount };
};

const createOrder = async (req, res) => {
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
    const dbProduct = await Product.findOne({ _id: item.product });
    if (!dbProduct) {
      throw new CustomError.NotFoundError(
        `No product with id : ${item.product}`
      );
    }

    // // Check if the user has already ordered this product
    // const productOrdered = userOrders.some(order =>
    //   order.orderItems.some(orderItem => orderItem.product.equals(dbProduct._id))
    // );

    // // if (productOrdered) {
    // //   throw new CustomError.BadRequestError('You have already enrolled this course');
    // // }

    const { images, courseName, price, _id } = dbProduct;
    const singleOrderItem = {
      amount: 1, // Fixed amount to 1
      price,
      images,
      courseName,
      product: _id,
      
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

  // Populate product details in orderItems
  await Order.populate(order, { path: 'orderItems.product' });

  // send the order details in the response
  res
    .status(StatusCodes.CREATED)
    .json({ order, clientSecret: order.clientSecret });
};

const createOrdertutor = async (req, res) => {
  const { items: cartItems, encrypted_url } = req.body;
  const { userId } = req.body;

  try {
    if (!userId) {
      throw new CustomError.BadRequestError('User ID is required');
    }

    if (!cartItems || cartItems.length === 0) {
      throw new CustomError.BadRequestError('Cart items are required');
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of cartItems) {
      const { tutorinstructorId } = item;
      const product = await Product1.findById(tutorinstructorId);

      if (!product) {
        throw new CustomError.NotFoundError(`Product with ID ${tutorinstructorId} not found`);
      }

      const { _id, images, courseName, price } = product;

      const singleOrderItem = {
        amount: 1,
        price,
        images,
        courseName,
        product: _id,
      };

      orderItems.push(singleOrderItem);
      subtotal += price;
    }

    const total = subtotal;
    const paymentIntent = await fakeStripeAPI({
      amount: total,
      currency: 'usd',
    });

    const order = await Order.create({
      orderItems,
      total,
      subtotal,
      clientSecret: paymentIntent.client_secret,
      encrypted_url,
      user: userId,
    });

    await Order.populate(order, { path: 'orderItems.product' });

    res.status(StatusCodes.CREATED).json({ order, clientSecret: order.clientSecret });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};


const createOrderascompany = async (req, res) => {
  const { items: cartItems, encrypted_url, userId, emails } = req.body;
  // const category = 'multiple'

  if (!userId) {
    throw new CustomError.BadRequestError('User not found');
  }

  if (!cartItems || cartItems.length < 1) {
    throw new CustomError.BadRequestError('No cart items provided');
  }

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    throw new CustomError.BadRequestError('No emails provided or invalid email format');
  }

  let orderItems = [];
  let subtotal = 0;

  for (const item of cartItems) {
    const dbProduct = await Product.findOne({ _id: item.product });
    if (!dbProduct) {
      throw new CustomError.NotFoundError(`No product with id: ${item.product}`);
    }

    const { images, courseName, price, _id } = dbProduct;
    const singleOrderItem = {
      amount: item.amount, // Use the provided amount
      price,
      images,
      courseName,
      product: _id,
      emails
    };

    // Add item to order
    orderItems.push(singleOrderItem);
    // Calculate subtotal
    subtotal += price * item.amount; // Multiply price by the amount
  }

  // Calculate total
  const total = subtotal;
  // Get client secret
  const paymentIntent = await fakeStripeAPI({
    amount: total,
    currency: 'usd',
  });

  // Create the order with populated orderItems
  const order = await Order.create({
    orderItems,
    total,
    subtotal,
    clientSecret: paymentIntent.client_secret,
    encrypted_url,
    category: 'multiple',
    user: userId,
    emails
  });

  // Populate product details in orderItems
  await Order.populate(order, { path: 'orderItems.product' });

  // Send the order details in the response
  res.status(StatusCodes.CREATED).json({ order, clientSecret: order.clientSecret });
};

const getAllOrders = async (req, res) => {
  try {
    // Parse query parameters for pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default limit is 10
    const skip = (page - 1) * limit;

    // Fetch total number of orders
    const totalOrders = await Order.countDocuments();

    // Fetch orders with pagination and population
    const orders = await Order.find({})
      .populate('orderItems.product')
      .populate('user')
      .skip(skip)
      .limit(limit);

    res.status(StatusCodes.OK).json({ orders, currentPage: page, totalPages: Math.ceil(totalOrders / limit) });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
};



const getSingleOrder = async (req, res) => {
  const { id: orderId } = req.params;
  const order = await Order.findOne({ _id: orderId });
  if (!order) {
    throw new CustomError.NotFoundError(`No order with id : ${orderId}`);
  }
  // checkPermissions(req.user, order.user);
  res.status(StatusCodes.OK).json({ order });
};
const getCurrentUserOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user.userId });
  res.status(StatusCodes.OK).json({ orders, count: orders.length });
};
const updateOrder = async (req, res) => {
  const { id: orderId } = req.params;
  const { paymentIntentId } = req.body;

  const order = await Order.findOne({ _id: orderId });
  if (!order) {
    throw new CustomError.NotFoundError(`No order with id : ${orderId}`);
  }
  // checkPermissions(req.user, order.user);

  order.paymentIntentId = paymentIntentId;
  order.status = 'paid';
  await order.save();

  res.status(StatusCodes.OK).json({ order });
};

module.exports = {
  getAllOrders,
  getSingleOrder,
  getCurrentUserOrders,
  createOrder,
  updateOrder,
  createOrderascompany,
  createOrdertutor
};
