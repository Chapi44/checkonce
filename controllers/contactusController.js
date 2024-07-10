const Contact = require('../model/contactus');
const { StatusCodes } = require("http-status-codes");

// Controller methods
const createContact = async (req, res) => {
    try {
      const newContact = new Contact(req.body);
      const savedContact = await newContact.save();
      res.status(StatusCodes.CREATED).json(savedContact);
    } catch (error) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
    }
  };
  
  const getAllContacts = async (req, res) => {
    try {
      // Parse query parameters for pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10; // Default limit is 10
      const skip = (page - 1) * limit;
  
      // Fetch total number of contacts
      const totalContacts = await Contact.countDocuments();
  
      // Fetch contacts with pagination
      const contacts = await Contact.find({})
        .skip(skip)
        .limit(limit);
  
      res.status(StatusCodes.OK).json({
        contacts,
        currentPage: page,
        totalPages: Math.ceil(totalContacts / limit),
        totalCount: totalContacts
      });
    } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
  };
  
  const getContactById = async (req, res) => {
    try {
      const contact = await Contact.findById(req.params.id);
      if (!contact) {
        throw new CustomError.NotFoundError('Contact not found');
      }
      res.status(StatusCodes.OK).json(contact);
    } catch (error) {
      if (error instanceof CustomError.NotFoundError) {
        res.status(StatusCodes.NOT_FOUND).json({ message: error.message });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
      }
    }
  };
  
  module.exports = {
    createContact,
    getAllContacts,
    getContactById
  };