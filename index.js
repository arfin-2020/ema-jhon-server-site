const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const ObjectID = require("mongodb").ObjectId;
require("dotenv").config();
var admin = require("firebase-admin");


const app = express();
const port = process.env.PORT || 5000;


//Firebase Admin Initialization



var serviceAccount = require("./simple-firebase-authenti-905b1-firebase-adminsdk-3me00-1fec12f31a.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



//MiddleWare

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server successfully run.");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r5j5a.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// console.log(uri)
const verifyToken = async(req,res,next) =>{
    if(req.headers?.authorization?.startsWith("Bearer ")){
        const idToken = req.headers.authorization.split("Bearer ")[1];
        // console.log("inside id separate:",idToken)
        try{
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            // console.log(decodedUser.name);
            req.decodedName = decodedUser.name;
        }catch(error){
            console.log(error)
        }
    }
    next();
}

const run = async () => {
  try {
    await client.connect();
    const productCollections = client
      .db("emajhonUpdated")
      .collection("products1");
    const ordersCollections = client.db("emajhonUpdated").collection("orders");
    // console.log('Connected successfully to server')

    // GET Methods

    app.get("/products", async (req, res) => {
      // console.log(req.query)
      const cursor = productCollections.find({});

      const page = req.query.page;
      const size = parseInt(req.query.size);
      // console.log(page,size)
      let products;
      const count = await cursor.count();
      // console.log(count)
      if (page) {
        products = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
        // console.log(products)
      } else {
        const products = await cursor.toArray();
        //   console.log(products)
      }

      res.send({
        count,
        products,
      });

      // Post methods to get data using unique keys

      app.post("/products/byKeys", async (req, res) => {
        // console.log("O bagi ase ne?--",req.body)
        const keys = req.body;
        const query = { key: { $in: keys } };
        const products = await productCollections.find(query).toArray();
        res.json(products);
      });

      // Get All orders

      app.get("/orders", verifyToken, async (req, res) => {
          const name = req.query.name;
        //   console.log(name);
          if(req.decodedName === name){
              
              const query = { name: name };
               
               const allOrdersFromDB = ordersCollections.find(query);
               await allOrdersFromDB
                 .toArray()
                 .then(allOrdersFromDB => {
                   console.log("Data come from DB");
                   res.json(allOrdersFromDB);
                 })
                 .catch(err => {
                   console.log(err);
                 });
        }else{
            res.status(401).json({message: "User not Authorized"})
        }
        
        //   console.log(req.headers.authorization)
          
        
      });

      // Post orders

      app.post("/orders", async (req, res) => {
        const order = req.body;
        order.createdAt = new Date();
        console.log(order);
        const result = await ordersCollections.insertOne(order);
        res.json(result);
      });
    });
  } catch (err) {
    console.log("error 1------", err.message);
  }
};
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
