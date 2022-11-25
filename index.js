const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const port = process.env.PORT || 5000;
const app = express();

// middleware =============================
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9mm1y.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 })


function verifyJwt(req, res, next) {
    console.log('inside_token:', req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (error, decoded) {
        if (error) {
            return res.status(403).send({ message: 'forbidden Access' })
        }
        req.decoded = decoded
        next();
    })

}


async function run() {
    try {

        const categoryCollection = client.db('bikePicker').collection('categories');
        const usersCollection = client.db('bikePicker').collection('users');
        const productsCollection = client.db('bikePicker').collection('products');


        // jwt web token ========================================
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
                return res.send({ accessToken: token })
            }
            console.log(user);
            res.status(403).send({ accessToken: ' ' });
        })


        // create user api =====================================================
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get('/allUsers', verifyJwt, async (req, res) => {

            const allUsers = {};
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await usersCollection.findOne(query);

            if (user?.userType !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const users = await usersCollection.find(allUsers).toArray();
            res.send(users);
        });

        // for user type checking ==================================
        // users admin or not api =======================================================
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({
                isAdmin: user?.userType === 'admin',
                isBuyer: user?.userType === 'buyer',
                isSeller: user?.userType === 'seller'
            });
        })

        // delete data ====================================================================================
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result)
        });


        // category get Api ==========================
        app.get('/categories', async (req, res) => {
            const query = {};
            const category = await categoryCollection.find(query).toArray();
            res.send(category)
        })

        // add category api====================
        app.post('/addCategory', async (req, res) => {
            const category = req.body;
            const result = await categoryCollection.insertOne(category);
            res.send(result);
        });


        // add product api ===============================
        app.post('/addProduct', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        // get product api =============================
        app.get('/allProduct', verifyJwt, async (req, res) => {
            const email = req.query.email;

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });




    }
    finally {

    }
}
run().catch(console.log());

app.get('/', async (req, res) => {
    res.send('bike pickers server is running')
})
app.listen(port, () => console.log(`bike pickers running On: ${port}`))