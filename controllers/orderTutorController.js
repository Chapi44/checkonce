const Order = require('../model/ordertutor');

const Product1 = require('../model/instructor');


const { StatusCodes } = require('http-status-codes');
const CustomError = require('../errors');

const fakeStripeAPI = async ({ amount, currency }) => {
  const client_secret = 'someRandomValue';
  return { client_secret, amount };
};


const createOrdertutor = async (req, res) => {
  const { items: cartItems, encrypted_url, userId } = req.body;

  try {
    if (!userId) {
      throw new CustomError.BadRequestError('User ID is required');
    }

    if (!cartItems || cartItems.length === 0) {
      throw new CustomError.BadRequestError('Cart items are required');
    }

    console.log('Cart Items:', cartItems); // Log cart items for debugging

    const orderItems = [];
    let subtotal = 0;

    for (const item of cartItems) {
      const { tutorinstructorId } = item;
      console.log('Processing item:', item); // Log each item for debugging

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

  try {
    const order = await Order.findById(orderId).populate('orderItems.product').populate('user');

    if (!order) {
      throw new CustomError.NotFoundError(`Order with ID ${orderId} not found`);
    }

    res.status(StatusCodes.OK).json({ order });
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
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

  updateOrder,

  createOrdertutor
};
