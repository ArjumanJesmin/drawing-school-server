const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const nodemailer = require("nodemailer");



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


    const allDataCollection = client.db("Akibuki").collection('allData')


    const classCollection = client.db("Akibuki").collection('studentClass')
    const userCollection = client.db("Akibuki").collection('users')


    const manageClassCollection = client.db("Akibuki").collection('manageClass')
    const selectCollection = client.db("Akibuki").collection('myClass')

    const paymentCollection = client.db("Akibuki").collection('paymentHistory')


    //jwt collection------------------------
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    // verifyAdmin ----------------------------------
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      if (user?.roal !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }
    //allData collection------------------------
    app.get('/allData', async (req, res) => {
      const result = await allDataCollection.find().toArray()
      res.send(result)
    })

    //------------myClass-------------------------------

    app.post('/myClass', async (req, res) => {
      const newItem = req.body;
      const result = await selectCollection.insertOne(newItem);
      res.send(result)
    })


    app.get('/myClass', async (req, res) => {
      try {
        console.log(req.query.email);
        let query = {};

        if (req.query?.email) {
          query = { email: req.query.email };
        }

        const result = await selectCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send('Error retrieving data');
      }
    });

    app.delete('/myClass/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await classCollection.deleteOne(query)
      res.send(result)
    })

    //users collection------------------------
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    // admin /  instructor ----------------------------------
    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;

      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })

    app.get('/users/instructor/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'instructor' }
      res.send(result);
    })

    //------------ADMIN ------------------------------------
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

    ///shjkl==============================
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
    ///shjkl==============================

    app.delete('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query)
      res.send(result)
    })


    // ------------------instructor ---------------------------------

    // Update user role to instructor
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


    //classes collection------------------------
    app.post('/studentClass', async (req, res) => {
      const item = req.body;
      const result = await classCollection.insertOne(item)
      res.send(result)
    })

    app.get('/studentClass', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })



    //Create Payment Intent-------------------

    app.get('/paymentHistory', async (req, res) => {
      try {
        console.log(req.query.email);
        let query = {};

        if (req.query?.email) {
          query = { email: req.query.email };
        }

        const result = await paymentCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).send('Error retrieving data');
      }
    });
    // create payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })


    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment)

      const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
      const deleteResult = await selectCollection.deleteMany(query)

      res.send({ insertResult, deleteResult })
    })



    // ---------------%%%%% Admin Manage Class %%%%%%------------------

    app.post('/manageClass', async (req, res) => {
      const item = req.body;
      console.log(item)
      const result = await manageClassCollection.insertOne(item);
      res.send(result);
    })

    app.get('/manageClass', async (req, res) => {
      const result = await manageClassCollection.find().toArray();
      res.send(result)
    })

    app.get('/manageClass/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
      res.send(result);
    });

    app.delete('/manageClass/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await classCollection.deleteOne(query)
      res.send(result)
    })

    // -----------%%%%%%%%%%%%%%%%%%------------------------

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });
    

    // Define a route to handle email sending
    app.post("/send-email", async (req, res) => {
      try {
        const { email, subject, message } = req.body;

        // Define email data
        const mailOptions = {
          from: process.env.SMTP_MAIL,
          to: email,
          subject: subject,
          message: message,
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "Email sent successfully" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while sending the email" });
      }
    });




    //#################### END #############################
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('draw your special moment.')
})


app.listen(port, () => {
  console.log(`School is Running: ${port}`);
})