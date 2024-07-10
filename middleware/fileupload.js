const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "DEV",
  },
  allowedFormats: ["jpg", "png", "jpeg", "mp4", "doc", "pdf"],
}); 

const cloudUploadTry = multer({ storage: storage }).fields([
  { name: 'coverPage', maxCount: 1 }, // Assuming only one cover page file is expected
  { name: 'files', maxCount: 10 } // Adjust maxCount as needed for lesson files
]);

module.exports = {
  cloudUploadTry
};
