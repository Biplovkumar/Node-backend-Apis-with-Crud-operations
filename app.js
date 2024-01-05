
const express = require("express");
const mongoose = require('mongoose');
const multer = require("multer");
const path = require('path');
const Jwt = require('jsonwebtoken');

require("./db/config");
const User = require('./db/User');
const Product = require("./db/Product")
const jwtKey = 'e-com';

const app = express();
const cors = require("cors");

const port = 4000

app.use(express.json());
app.use(cors());

app.post("/register", async (req, resp) => {
 if (!req.body.name || !req.body.email ||  !req.body.password) {
    return resp.status(400).send({ result: "All fields are required"});
  }else{
    let user = new User(req.body);
    let result = await user.save();
    result = result.toObject();
    delete result.password
    Jwt.sign({result}, jwtKey, {expiresIn:"2h"},(err,token)=>{
        if(err){
            resp.status(401).send({ result:"Something went wrong"}); 
        }
        resp.send({result,auth:token})
    })
   }
})

app.post("/login", async (req, resp) => {
  if (!req.body.email ||  !req.body.password) {
       resp.status(400).send({ result:"Enter correct details"});
  }else{
        let user = await User.findOne(req.body).select("-password");

        if (user) {
            Jwt.sign({user}, jwtKey, {expiresIn:"2h"},(err,token)=>{
                if(err){
                    resp.status(401).send({ result:"Something went wrong"});
                }
                resp.send({user,auth:token})
            })
        } else {
            resp.status(400).send({ result:"No User found"});
        }
    }
});

//Add product
app.post("/add-product", verityToken, async (req, resp) => {
if (!req.body.name ||  !req.body.price || !req.body.category ||  !req.body.company) {
    resp.status(400).send({ result:"Enter correct details"});
  }else{
  let product = new Product(req.body);
  let result = await product.save();
  resp.send(result);
}
});

//Get all products
app.get("/products", verityToken, async (req, resp) => {
  const products = await Product.find();
  if (products.length > 0) {
      resp.send(products)
  } else {
      resp.send({ result: "No Product found" })
  }
});

//Delete one product
app.delete("/product/:id", verityToken, async (req, resp) => {
  let result = await Product.deleteOne({ _id: req.params.id });
  resp.send(result)
});

//get perticular product detail
app.get("/product/:id", verityToken, async (req, resp) => {
  let result = await Product.findOne({ _id: req.params.id })
  if (result) {
      resp.send(result)
  } else {
      resp.send({ "result": "No Record Found." })
  }
})

//Update perticular product
app.put("/product/:id", verityToken, async (req, resp) => {
let result = await Product.updateOne(
  { _id: req.params.id },
  { $set: req.body }
)
resp.send(result)
});

//Search product with key
app.get("/search/:key", verityToken, async (req, resp) => {
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
app.put("/user/:id", verityToken, async (req, resp) => {
  console.log('req :', req);
let result = await User.updateOne(
  { _id: req.params.id },
  { $set: req.body }
)
resp.send(result)
});

// Set up Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Set the destination folder where the file will be saved
  },
  filename: (req, file, cb) => {
    // Set the filename to be the original name of the file
     cb(null, file?.originalname.split('.')[0]  + "_" + Date.now() + "." + file?.mimetype.split('/')[1])
  },
});

const upload = multer({ storage: storage });

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
app.put('/updateUser/:id', verityToken, upload.single('profileImage'), async (req, res) => {
    try {
    const id = req.params.id; 
    const profileImage = req?.file?.filename;
    const updatedUserData = { $set: req.body, profileImage };
    let validID = mongoose.Types.ObjectId.isValid(id);
    if (!validID) { return res.status(401).json({  result: 'Enter valid ID' });}

    const result = await User.findByIdAndUpdate(id, updatedUserData, { new: true });
    if (!result) { return res.status(404).json({ result: 'User not found' })}

    res.send(result)
    // Save user with profile image to the database
    // const {name, email, password} = req.body;
    // const newUser = new User({name, email, password, profileImage });
    // await newUser.save();
    // res.status(201).json({ message: 'User created successfully' });
   } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


//get perticular User detail
app.get("/user/:id", verityToken, async (req, resp) => {
  let result = await User.findById(req.params.id)
  if (result) {
      result = result.toObject();
      delete result.password
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
  res.sendFile(path.join(`${__dirname}/uploads/`, imageName));
});

//Verify token
function verityToken(req, resp, next){
let token = req.headers['authorization'];
if(token){
token = token.split(' ')[1];
Jwt.verify(token, jwtKey, (err, valid)=>{
    if(err){
    resp.status(401).send({result: 'Please provide a valid token'})
    }else{
    next();
    }
})}
 else{
      resp.status(403).send({result: 'Please provide a token'})
     }
}

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
  }else{
// Generate a random token by 6 digit values
const randomNumber = Math.floor(Math.random() * 900000) + 100000;
const concatenatedObject = { ...req.body, ...{value:randomNumber} };
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