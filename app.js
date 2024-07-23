
const express = require("express");
const mongoose = require('mongoose');
const multer = require("multer");
const path = require('path');
const Jwt = require('jsonwebtoken');
const fs = require('fs');

require("./src/utils/config");
const User = require('./src/db/User');
const Product = require("./src/db/Product")
const ContactUs = require("./src/db/ContactUs")
const validateObjectId = require('./src/utils/middleware/validateObjectId');
const verifyToken = require('./src/utils/middleware/verifyToken');


const jwtKey = 'e-com';

const app = express();
const cors = require("cors");
const port = 4000
app.use(express.json());
app.use(cors());


// Set up Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Set the destination folder where the file will be saved
  },
  filename: (req, file, cb) => {
    // Set the filename to be the original name of the file
    cb(null, file?.originalname.split('.')[0] + "_" + Date.now() + "." + file?.mimetype.split('/')[1])
  },
});


// Create Multer upload middleware
const upload = multer({ storage: storage });


// Upload profile image using Multer
// Upload thumbnail and images using Multer
const uploadFields = [
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images', maxCount: 5 }
];

// If files are uploaded, update the file paths with dynamic URLs
const imgPrefixUrl = (req) => req.protocol + '://' + req.get('host') + '/image/';
const removeUploadsDir = (filePath) => filePath && filePath.includes('uploads\\') ? filePath.replace('uploads\\', '') : filePath.replace('uploads/', '');

const validateRequiredFields = (data, fields) => {
  for (const field of fields) {
    if (!data[field]) {
      return false;
    }
  }
  return true;
};

const validateNumberFields = (data, fields) => {
  for (const field of fields) {
    if (data[field] && isNaN(Number(data[field]))) {
      return { valid: false, field };
    }
  }
  return { valid: true };
};


app.post("/register", async (req, resp) => {
  const { firstName, lastName, email, mobile, password, gender, dateOfBirth, address, zipcode } = req.body
  if (!firstName || !lastName || !email || !mobile || !password || !gender || !dateOfBirth || !address || !zipcode) {
    return resp.status(400).send({ result: "All fields are required" });
  } else {
    const doesEmailExist = await User.findOne({ email: req.body.email });
    if (doesEmailExist) {
      resp.status(409).send({ result: "Email already exists" });
    } else {
      let user = new User(req.body);
      let result = await user.save();
      result = result.toObject();
      delete result.password
      Jwt.sign({ result }, jwtKey, { expiresIn: "100d" }, (err, token) => {
        if (err) {
          resp.status(401).send({ result: "Something went wrong" });
        }
        resp.send({ result, auth: token })
      })
    }
  }
})

app.post("/login", async (req, resp) => {
  if (!req.body.email || !req.body.password) {
    resp.status(400).send({ result: "Enter correct details" });
  } else {
    let user = await User.findOne(req.body).select("-password");

    if (user) {
      Jwt.sign({ user }, jwtKey, { expiresIn: "100d" }, (err, token) => {
        if (err) {
          resp.status(401).send({ result: "Something went wrong" });
        }
        let fullUrl = user && user.profileImage ? req.protocol + '://' + req.get('host') + '/image/' + user.profileImage : null
        user.profileImage = fullUrl;
        resp.send({ result: user, auth: token })
      })
    } else {
      resp.status(400).send({ result: "No User found" });
    }
  }
});

// POST endpoint to create a new query
app.post("/add-query", async (req, resp) => {
  // Extract the fields from the request body
  const data = { ...req.body };

  const requiredFields = ['name', 'email', 'subject'];

  if (!validateRequiredFields(data, requiredFields)) {
    return resp.status(400).send({ result: "Enter correct details" });
  }

  // Create a new ContactUs Quesry instance with the form data
  let temp = new ContactUs(data);

  try {
    // Save the temp to the database
    let result = await temp.save();
    resp.send(result);
  } catch (error) {
    resp.status(500).send({ result: "Error saving Query", error });
  }
});

//Get all Queries from server
app.get("/queries", async (req, resp) => {
  const queries = await ContactUs.find();
  if (queries.length > 0) {
    resp.send(queries)
  } else {
    resp.send({ result: "No Record found" })
  }
});

//get perticular query detail
app.get("/queries/:id", validateObjectId, async (req, resp) => {
  let result = await ContactUs.findOne({ _id: req.params.id })
  if (result) { resp.send(result) }
  else { resp.send({ "result": "No Record Found." }) }
})


// Middleware to verify JWT token
//Add product Rest Api
app.post("/add-product", verifyToken, upload.fields(uploadFields), async (req, resp) => {
  const productData = { ...req.body };
  // Handle file fields
  if (req.files['thumbnail']) {
    productData.thumbnail = req.files['thumbnail'][0].path
  }
  if (req.files['images']) {
    productData.images = req.files['images'].map(file => file.path);
  }


  const requiredFields = ['name'];
  const numberFields = ['price', 'quantity', 'rating'];

  if (!validateRequiredFields(productData, requiredFields)) {
    return resp.status(400).send({ result: "Enter correct details" });
  }

  const numberValidation = validateNumberFields(productData, numberFields);
  if (!numberValidation.valid) {
    return resp.status(400).send({ result: `${numberValidation.field} must be a number` });
  }
  // Create a new product instance with the form data
  let product = new Product(productData);

  try {
    // Save the product to the database
    let result = await product.save();
    resp.send(result);
  } catch (error) {
    resp.status(500).send({ result: "Error saving product", error });
  }
});


//Get all products
app.get("/products", async (req, resp) => {
  const products = await Product.find();
  if (products.length > 0) {
    const updatedProducts = products.map(item => {
      if (item.thumbnail) item.thumbnail = imgPrefixUrl(req) + removeUploadsDir(item.thumbnail);
      if (item.images && item.images.length) item.images = item.images.map(image => imgPrefixUrl(req) + removeUploadsDir(image));
      return item;
    });
    resp.send(updatedProducts)
  } else {
    resp.send({ result: "No Product found" })
  }
});

//Delete one product
app.delete("/product/:id", async (req, resp) => {
  let result = await Product.deleteOne({ _id: req.params.id });
  resp.send(result)
});

//get perticular product detail
app.get("/product/:id", async (req, resp) => {
  let result = await Product.findOne({ _id: req.params.id })
  if (result) {
    if (result.thumbnail) result.thumbnail = imgPrefixUrl(req) + removeUploadsDir(result.thumbnail);
    if (result.images && result.images.length) result.images = result.images.map(image => imgPrefixUrl(req) + removeUploadsDir(image));
    resp.send(result)
  } else {
    resp.send({ "result": "No Record Found." })
  }
})


const updateProduct = async (id, updateData) => {
  try {
    const result = await Product.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!result) return { status: 404, data: { result: "Product not found" } };
    return { status: 200, data: result };
  } catch (error) {
    return { status: 500, data: { result: "Error updating product", error } };
  }
};

//Update the product With ID field
app.put("/product/:id", async (req, resp) => {
  const { id } = req.params;

  if (req.is('multipart/form-data')) {
    return upload.fields(uploadFields)(req, resp, async (err) => {
      if (err) return resp.status(500).send({ result: "Error processing form data", error: err });

      const updateData = { ...req.body };
      if (req.files['thumbnail']) {
        updateData.thumbnail = req.files['thumbnail'][0].path;
      }
      if (req.files['images']) {
        updateData.images = req.files['images'].map(file => file.path);
      }

      const requiredFields = ['name', 'price', 'category', 'company'];
      const numberFields = ['price', 'quantity', 'rating'];

      if (!validateRequiredFields(updateData, requiredFields)) {
        return resp.status(400).send({ result: "Enter correct details" });
      }

      const numberValidation = validateNumberFields(updateData, numberFields);
      if (!numberValidation.valid) {
        return resp.status(400).send({ result: `${numberValidation.field} must be a number` });
      }

      const result = await updateProduct(id, updateData);


      // let fullUrl = result && result.profileImage ? req.protocol + '://' + req.get('host') + '/image/' + result.profileImage : null
      // result.profileImage = fullUrl;


      return resp.status(result.status).send(result.data);
    });
  }

  if (req.is('application/json')) {
    const updateData = req.body;
    const requiredFields = ['name', 'price', 'category', 'company'];
    const numberFields = ['price', 'quantity', 'rating'];

    if (!validateRequiredFields(updateData, requiredFields)) {
      return resp.status(400).send({ result: "Enter correct details" });
    }

    const numberValidation = validateNumberFields(updateData, numberFields);
    if (!numberValidation.valid) {
      return resp.status(400).send({ result: `${numberValidation.field} must be a number` });
    }

    const result = await updateProduct(id, updateData);
    return resp.status(result.status).send(result.data);
  }

  resp.status(400).send({ result: "Unsupported Content-Type" });
});


//Search product with key
app.get("/search/:key", verifyToken, async (req, resp) => {
  let result = await Product.find({
    "$or": [
      {
        name: { $regex: req.params.key }
      },
      {
        company: { $regex: req.params.key }
      },
      {
        category: { $regex: req.params.key }
      }
    ]
  });
  resp.send(result);
})

//Update profile
app.put("/user/:id", verifyToken, async (req, resp) => {
  let result = await User.updateOne(
    { _id: req.params.id },
    { $set: req.body }
  )
  resp.send(result)
});


// Handle POST requests with file uploads
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    // const profileImage = req?.file?.filename;
    res.status(201).json({ message: 'Image uploaded successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Handle update user with file uploads
app.put('/updateUser/:id', verifyToken, upload.single('profileImage'), async (req, res) => {
  try {
    const id = req.params.id;
    const profileImage = req?.file?.filename;
    const updatedUserData = { $set: req.body, profileImage };
    let validID = mongoose.Types.ObjectId.isValid(id);
    if (!validID) { return res.status(401).json({ result: 'Enter valid ID' }); }

    let result = await User.findByIdAndUpdate(id, updatedUserData, { new: true });
    if (!result) { return res.status(404).json({ result: 'User not found' }) }
    result = result.toObject();
    delete result.password
    Jwt.sign({ result }, jwtKey, { expiresIn: "100d" }, (err, token) => {
      if (err) { res.status(401).send({ result: "Something went wrong" }); }

      if (result && result.profileImage) result.profileImage = imgPrefixUrl(req) + result.profileImage;

      res.send({ result, auth: token })
    })

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


//get perticular User detail
app.get("/user/:id", verifyToken, async (req, resp) => {
  let result = await User.findById(req.params.id)
  if (result) {
    result = result.toObject();
    delete result.password
    let fullUrl = result && result.profileImage ? req.protocol + '://' + req.get('host') + '/image/' + result.profileImage : null
    result.profileImage = fullUrl;
    resp.send(result)
  } else {
    resp.send({ "result": 'User not found.' })
  }
})


// http://localhost:4000/image/name
// Define a route to serve the saved image
app.get('/image/:name', (req, res) => {
  const imageName = req.params.name;
  // Replace with your actual image file name
  const filePath = path.join(`${__dirname}/uploads/`, imageName).split("%20").join(" ");
  try {
    //Checking if the path exists
    const exists = fs.existsSync(filePath);
    if (!exists) {
      res.status(404).json({ result: 'Image not found' })
      return false;
    } else {
      res.sendFile(path.join(`${__dirname}/uploads/`, imageName));
    }
  } catch (error) { res.status(404).json({ result: error }) }
});


//Verify all filled
function areAllFieldsFilled(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (obj[key] == null || obj[key] === undefined || obj[key] === '') {
        return false;
      }
    }
  }
  return true;
}

//Testing api
app.post("/test", (req, resp) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return resp.status(400).send({ result: "No data found" });
  } else {
    // Generate a random token by 6 digit values
    const randomNumber = Math.floor(Math.random() * 900000) + 100000;
    const concatenatedObject = { ...req.body, ...{ value: randomNumber } };
    resp.send(concatenatedObject);
  }
});

//This is for testing purpose
app.get('/', (req, res) => {
  res.send('Hello World!')
})

//This is for Terminal
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})