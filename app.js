const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// MySQL connection
const mysqlConnection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'proj2023',
});

mysqlConnection.connect((err) => {
  if (err) {
    console.error('MySQL connection failed: ', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

// MongoDB connection
// mongoose.connect('mongodb://localhost:27017/proj2023MongoDB/managers', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// const mongoDb = mongoose.connection;

// mongoDb.on('error', console.error.bind(console, 'MongoDB connection error:'));
// mongoDb.once('open', async () => {
//   console.log('Connected to MongoDB database');

//   // Check if the 'managers' collection exists
//   const collectionExists = await mongoose.connection.db.listCollections({ name: 'managers' }).hasNext();

//   // If 'managers' collection does not exist, import initial data
//   if (!collectionExists) {
//     const managersData = [
//       { _id: 'M001', name: 'Mark Collins', salary: 50500.01 },
//       { _id: 'M002', name: "Barbara O'Toole", salary: 43512.14 },
//       { _id: 'M003', name: 'Paddy McDonagh', salary: 51412 },
//       { _id: 'M004', name: 'Josie Sullivan', salary: 49444 },
//       { _id: 'M005', name: 'Tommy Hyde', salary: 47234 },
//       { _id: 'M006', name: 'Anne Mulligan', salary: 36300 },
//     ];

//     await mongoose.connection.db.collection('managers').insertMany(managersData);
//     console.log('Initial data imported into MongoDB collection: managers');
//   }
// });

// Define routes and middleware
app.get('/', (req, res) => {
  res.send(`
    <h1>Welcome to the Home Page</h1>
    <ul>
      <li><a href="/stores">Stores Page</a></li>
      <li><a href="/products">Products Page</a></li>
      <li><a href="/managers">Managers (MongoDB) Page</a></li>
    </ul>
  `);
});

// Stores Page
app.get('/stores', (req, res) => {
  // Query MySQL database for store details
  const query = 'SELECT * FROM store';
  mysqlConnection.query(query, (err, results) => {
    if (err) {
      console.error('MySQL query error: ', err);
      res.status(500).send('Internal Server Error');
    } else {
      // Render the Stores Page with store details
      res.send(`
        <h1>Stores Page</h1>
        <ul>
          ${results.map(store => `
            <li>
              Store ID: ${store.sid}, Location: ${store.location}, Manager ID: ${store.mgrid}
              (<a href="/stores/edit/${store.sid}">Edit</a>)
            </li>`).join('')}
        </ul>
        <p><a href="/stores/add">Add Store</a></p>
      `);
    }
  });
});

// Edit Store Page - GET request
app.get('/stores/edit/:storeId', async (req, res) => {
  const storeId = req.params.storeId;

  // Query MySQL database to get store details by ID
  const query = `SELECT * FROM store WHERE sid = ${mysqlConnection.escape(storeId)}`;
  mysqlConnection.query(query, async (err, result) => {
    if (err) {
      console.error('MySQL query error: ', err);
      res.status(500).send('Internal Server Error');
    } else {
      if (result.length === 0) {
        res.status(404).send('Store not found');
      } else {
        // Fetch manager details from MongoDB for validation
        const managerId = result[0].mgrid;
        const managerDetails = await mongoose.connection.db.collection('managers').findOne({ _id: managerId });

        // Render the Edit Store Page with store details and manager details
        res.send(`
          <h1>Edit Store</h1>
          <form method="post" action="/stores/edit/${result[0].sid}">
            <label for="location">Location:</label>
            <input type="text" id="location" name="location" value="${result[0].location}" minlength="1" required>
            <label for="mgrid">Manager ID:</label>
            <input type="text" id="mgrid" name="mgrid" value="${result[0].mgrid}" minlength="4" required pattern="[A-Za-z0-9]+" title="Manager ID should be 4 alphanumeric characters">
            <button type="submit">Update Store</button>
          </form>
        `);
      }
    }
  });
});

// Edit Store Page - POST request
app.post('/stores/edit/:storeId', async (req, res) => {
  const storeId = req.params.storeId;
  const { location, mgrid } = req.body;

  // Fetch manager details from MongoDB for validation
  // const managerDetails = await mongoose.connection.db.collection('managers').findOne({ _id: mgrid });

  if (!managerDetails) {
    res.status(400).send('Invalid Manager ID');
    return;
  }

  // Update store details in the MySQL database
  const updateQuery = `
    UPDATE store
    SET location = ${mysqlConnection.escape(location)}, mgrid = ${mysqlConnection.escape(mgrid)}
    WHERE sid = ${mysqlConnection.escape(storeId)}
  `;

  mysqlConnection.query(updateQuery, (err, result) => {
    if (err) {
      console.error('MySQL update query error: ', err);
      res.status(500).send('Internal Server Error');
    } else {
      res.redirect('/stores');
    }
  });
});

// Add Store Page - GET request
app.get('/stores/add', (req, res) => {
  res.send(`
    <h1>Add Store</h1>
    <form method="post" action="/stores/add">
      <label for="location">Location:</label>
      <input type="text" id="location" name="location" minlength="1" required>
      <label for="mgrid">Manager ID:</label>
      <input type="text" id="mgrid" name="mgrid" minlength="4" required pattern="[A-Za-z0-9]+" title="Manager ID should be 4 alphanumeric characters">
      <button type="submit">Add Store</button>
    </form>
  `);
});

// Add Store Page - POST request
app.post('/stores/add', async (req, res) => {
  const { location, mgrid } = req.body;

  // Fetch manager details from MongoDB for validation
  // const managerDetails = await mongoose.connection.db.collection('managers').findOne({ _id: mgrid });

  // For simplicity, assuming the managerDetails validation is successful
  // You may uncomment the above line and modify the validation accordingly

  // Insert new store details into the MySQL database
  const insertQuery = `
    INSERT INTO store (location, mgrid)
    VALUES (${mysqlConnection.escape(location)}, ${mysqlConnection.escape(mgrid)})
  `;

  mysqlConnection.query(insertQuery, (err, result) => {
    if (err) {
      console.error('MySQL insert query error: ', err);
      res.status(500).send('Internal Server Error');
    } else {
      res.redirect('/stores');
    }
  });
});

// Products Page
app.get('/products', (req, res) => {
  // Query MySQL database for product details
  const query = 'SELECT * FROM product';
  mysqlConnection.query(query, (err, results) => {
    if (err) {
      console.error('MySQL query error: ', err);
      res.status(500).send('Internal Server Error');
    } else {
      // Render the Products Page with product details
      res.send(`
        <h1>Products Page</h1>
        <ul>
          ${results.map(product => `
            <li>
              Product ID: ${product.pid}, Description: ${product.productdesc}, Store ID: ${product.sid}, Location: ${product.location}, Price: ${product.price}
              (<a href="/products/delete/${product.pid}">Delete</a>)
            </li>`).join('')}
        </ul>
        <p><a href="/">Back to Home Page</a></p>
      `);
    }
  });
});

// Delete Product - GET request
app.get('/products/delete/:productId', (req, res) => {
  const productId = req.params.productId;

  // Render the confirmation page for deleting the product
  res.send(`
    <h1>Delete Product</h1>
    <p>Are you sure you want to delete the product with ID ${productId}?</p>
    <form method="post" action="/products/delete/${productId}">
      <button type="submit">Yes, Delete</button>
      <a href="/products">No, Cancel</a>
    </form>
    <p><a href="/">Back to Home Page</a></p>
  `);
});

// Delete Product - POST request
app.post('/products/delete/:productId', (req, res) => {
  const productId = req.params.productId;

  // Delete the product from the MySQL database
  const deleteQuery = `DELETE FROM product WHERE pid = ${mysqlConnection.escape(productId)}`;
  mysqlConnection.query(deleteQuery, (err, result) => {
    if (err) {
      console.error('MySQL delete query error: ', err);
      res.status(500).send('Internal Server Error');
    } else {
      res.redirect('/products');
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});