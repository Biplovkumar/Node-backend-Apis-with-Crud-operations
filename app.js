
const express = require("express");
require("./db/config");
const User = require('./db/User');
const app = express();
const cors = require("cors");
const Product = require("./db/Product")
const port = 4000

app.use(express.json());
app.use(cors());

app.post("/register", async (req, resp) => {
  let user = new User(req.body);
  let result = await user.save();
  result = result.toObject();
  delete result.password
  resp.send(result)
})

app.post("/login", async (req, resp) => {
  if (req.body.password && req.body.email) {
      let user = await User.findOne(req.body).select("-password");
      if (user) {
        resp.send({user,auth:'token'})
          // Jwt.sign({user}, jwtKey, {expiresIn:"2h"},(err,token)=>{
          //     if(err){
          //         resp.send("Something went wrong")  
          //     }
          //     resp.send({user,auth:token})
          // })
      } else {
          resp.send({ result: "No User found" })
      }
  } else {
      resp.send({ result: "No User found" })
  }
});

app.post("/add-product", async (req, resp) => {
  let product = new Product(req.body);
  let result = await product.save();
  resp.send(result);
});

app.get("/products", async (req, resp) => {
  const products = await Product.find();
  if (products.length > 0) {
      resp.send(products)
  } else {
      resp.send({ result: "No Product found" })
  }
});

app.delete("/product/:id", async (req, resp) => {
  let result = await Product.deleteOne({ _id: req.params.id });
  resp.send(result)
});


app.get("/product/:id", async (req, resp) => {
  let result = await Product.findOne({ _id: req.params.id })
  if (result) {
      resp.send(result)
  } else {
      resp.send({ "result": "No Record Found." })
  }
})

app.put("/product/:id", async (req, resp) => {
let result = await Product.updateOne(
  { _id: req.params.id },
  { $set: req.body }
)
resp.send(result)
});


app.get("/search/:key", async (req, resp) => {
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

app.get("/search/:key", async (req, resp) => {
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


//This is for testing purpose
     app.get('/', (req, res) => {
  res.send('Hello World!')
})


//This is for Terminal
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})