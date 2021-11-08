const express = require('express');
const cors = require('cors')
const app = express()
const { MongoClient } = require('mongodb');
require('dotenv').config()
const admin = require("firebase-admin");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) ;
// require("./doctors-protal-adminsdk.json")
const { messaging } = require('firebase-admin');
const PORT = process.env.PORT || 4000


// doctors-protal-adminsdk.json
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//midleware 
app.use(cors());
app.use(express.json());


const verifyToken = async (req, res, next) => {
  if (req.headers?.authorization?.startsWith('Bearer')) {
    const token = req.headers?.authorization?.split(' ')[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email
    } catch (error) {
      
    }
  }
  next();
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uoagi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() { 
    try {
      await client.connect();
      const database = client.db('doctors_protal')
      const appointCollection = database.collection('appointments')
      const usersCollection = database.collection('users')

      //all get method
      app.get('/appointments', verifyToken, async (req, res) => {
        const email = req.query.email;
        const date = req.query.date;
        const query = {email:email,date:date}
        const cursor = appointCollection.find(query);
        const appointments = await cursor.toArray();
        res.json(appointments)
      });
      
      app.get('/users', async (req, res) => {
        const user = req.body
        const cursor = usersCollection.find(user);
        const users = await cursor.toArray();
        res.json(users)
      });

      app.get('/users/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email }
        const user = await usersCollection.findOne(query);
        let isAdmin = false;
        if (user?.role === 'admin') {
          isAdmin=true
        }
        res.json({ admin: isAdmin });
      })

      //all post method
      app.post('/appointments', async (req, res) => {
        const appointment = req.body;
        const result = await appointCollection.insertOne(appointment)
        res.json(result)
      });
      
      
      app.post('/users', async (req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user)
        res.json(result)
      });


      //all put method

      app.put('/users', async (req, res) => {
        
        const user = req.body;
        const filter = { email: user.email }
        const options = { upsert: true };
        const updateDoc = { $set: user };
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        res.json(result)

      })

      app.put('/users/admin', verifyToken, async (req, res) => {
        const user = req.body;
        const reqester = req.decodedEmail;
        if (reqester) {
          const reqesterAccount = await usersCollection.findOne({ email: reqester });
          if (reqesterAccount.role === 'admin') {    
            const filter = { email: user.email };
            const updateDoc = { $set: { role: 'admin' } };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.json(result)
          }
        }
        else {
          res.status(401).json({message:'you cannot access'})
        }
      })


    } finally {
      //   await client.close();
    }
  }
  run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(PORT, () => {
  console.log(`Example app listening at http://localhost:${PORT}`)
})
