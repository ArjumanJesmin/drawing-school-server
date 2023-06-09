const express = require('express')
const cors = require('cors')
require('dotenv').config()



const app = express();
const port = process.env.PORT || 5000

//middle ware
app.use(cors())
app.use(express.json())

// jwt collection------------------------
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
      return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
          return res.status(401).send({ error: true, message: 'unauthorized access' })
      }
      req.decoded = decoded;
      next();
  })
}

// ---------------------------------------

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dkozdag.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();
    client.connect();

    const allDataCollection = client.db("Akibuki").collection('allData')
    const classCollection = client.db("Akibuki").collection('classes')
    const userCollection = client.db("Akibuki").collection('users')

 //jwt collection------------------------
 app.post('/jwt', (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
  res.send({ token })
})

    //allData collection------------------------
    app.get('/allData', async (req, res) => {
      const result = await allDataCollection.find().toArray()
      res.send(result)
    })



    //users collection------------------------
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    app.delete('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query)
      res.send(result)
    })


    //classes collection------------------------
    app.post('/classes', async (req, res) => {
      const item = req.body;
      console.log(item);
      const result = await classCollection.insertOne(item)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// ---------------------------------------


app.get('/', (req, res) => {
  res.send('draw your special moment.')
})


app.listen(port, () => {
  console.log(`School is Running: ${port}`);
})