const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 3000

// middleware
app.use(cors())
app.use(express.json())

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'Unauthorized Access'});
  }

  //bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.VERIFY_TOKEN, (error, decoded) => {
    if(error){
      return res.status(401).send({error: true, message: 'Unauthorized Access'});
    }
    req.decoded = decoded;
    next();
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster1.some2ew.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db('actSchoolDb').collection('users');
    const classCollection = client.db('actSchoolDb').collection('classes');

    
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.VERIFY_TOKEN, {
        expiresIn: '1h'
      })
      res.send({token})
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = {email: email}
      const user = await userCollection.findOne(query);

      if(user?.role !== 'admin'){
        res.status(403).send({error: true, message: 'Forbidden Access'})
      }
      next();
    }
    /*****************************
     * Home Page Route - Instructors and Classes
    ******************************/
    app.get('/instructors', async (req, res) => {
      const query = {role: 'instructor'}
      const result = await userCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result)
    })

    /*****************************
     * Admin route
    ******************************/
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
        const email = req.params.email;
        
        if(req.decoded.email !== email){
          res.send({admin: false})
        }

        const query = {email: email}
        const user = await userCollection.findOne(query);
        const result = {admin: user?.role === 'admin'}
        res.send(result)
    })

    /*****************************
     * Course route
    ******************************/
   app.post('/classes', async (req, res) => {
      const newClass = req.body;
      const result = await classCollection.insertOne(newClass);
      res.send(result);
   })

   app.get('/classes', verifyJWT, async (req, res) => {
      const email = req.query.email;
      let query = {}

      if(email){
        query = {instructorEmail: email}
      }

      const result = await classCollection.find(query).toArray();
      res.send(result)

   })

    /*****************************
     * Users route
    ******************************/
    app.post('/users', async (req, res) => {
        const newUser = req.body;        
        const result = await userCollection.insertOne(newUser);
        res.send(result);
    })

    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('ACT School Server')
})

app.listen(port, () => {
    console.log('Server running on port - ', port);
})