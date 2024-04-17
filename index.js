const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require("multer");
const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Inventory = require('./models/inventory.js');
const User = require('./models/user.js');
const jwt = require('jsonwebtoken');
// const crypto = require('crypto');

const jwt_secret = 'secret';

const app = express();
app.use(express.json())
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("./public"));
app.use('/public/images', express.static(__dirname + '/public/images/'));

// app.use(express.static(path.join(__dirname, 'uploads')));

const mongodb_url = "mongodb+srv://gopichand:gopi@cluster0.kjtrait.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongodb_url, { useNewUrlParser: true })
  .then((result) => console.log('connectd to db'))
  .catch((err) => console.log(err));


const rand_str = (length) => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}
let temp_str = "";

let item_storage = multer.diskStorage({
  destination: "./public/images",
  filename: (req, file, cb) => {
    cb(null, temp_str + "." + file.originalname.substring(file.originalname.indexOf('.') + 1))
  },
})

var storage = multer.diskStorage({

  destination: "./public/images",
  filename: function (req, file, cb) {
    cb(null, "Avartar.jpg")
  }
})

let upload = multer({ storage: storage }).array('file');
let item_upload = multer({ storage: item_storage }).array('file');

app.post('/api/upload', function (req, res) {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err)
    } else if (err) {
      return res.status(500).json(err)
    }
    return res.status(200).send(req.file)

  })

});
app.post('/api/add', (req, res) => {
  // console.log(req.body);
  var sum = req.body.number1 + req.body.number2;
  res.send(JSON.stringify({ result: sum }));

});

app.post('/api/addinfo', (req, res) => {
  // console.log(req.body);
  var text = req.body.name + "\n==========\n" + req.body.bio;
  // fs.writeFile('info.txt', text, (err) => {
  //     if (err) {
  //       return;
  //     }
  // })
  res.send(JSON.stringify({ result: "Ok" }));
});

function read(fileName = 'info.txt') {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, 'utf-8', (err, data) => {
      if (err) reject(err.message)
      resolve(data)
    })
  })
}

app.get('/api/getinfo', async (req, res) => {
  // console.log(req.body);

  let data = await read()
  console.log(data)

  const info_arr = data.split("\n==========\n");

  if (info_arr.length == 0) {
    res.send(JSON.stringify({ name: "", bio: "" }));
  }
  let name = info_arr[0];
  let bio = info_arr[1];
  res.send(JSON.stringify({ name: name, bio: bio }));
});

app.post('/', async function (req, res) {
  const type = req.body.type;
  if (type == "GET_INVENTORY_LIST") {
    try {
      const inventory = await Inventory.find();
      res.send(JSON.stringify({ result: inventory }));
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).send(JSON.stringify({ error: "An error occurred while fetching the inventory" }));
    }
  } else {
    // Handle other types of requests
    res.status(400).send(JSON.stringify({ error: "Unsupported request type" }));
  }
});


app.post('/delete', async function (req, res) {
  const inventory_id = req.body.id;
  if (!inventory_id) {
    res.status(400).json({ error: "No inventory ID provided" });
    return;
  }

  try {
    const deletedInventory = await Inventory.findByIdAndDelete({ _id: inventory_id });
    if (!deletedInventory) {
      res.status(404).json({ error: "Inventory not found" });
      return;
    }
    res.json({ result: inventory_id });
  } catch (error) {
    console.error('Error deleting inventory:', error);
    res.status(500).json({ error: "An error occurred while deleting the inventory" });
  }
});

app.post('/upload/image', function (req, res) {
  temp_str = rand_str(20);
  item_upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err)
    } else if (err) {
      return res.status(500).json(err)
    }
    res.send(JSON.stringify({ filename: temp_str + ".JPG" }))
  })
})

app.post('/save_inventory', async function (req, res) {
  const { id, name, quantity, filename } = req.body;
  const info = jwt.verify(id, jwt_secret);
  console.log(filename)
  try {
    if (id) {
      const newInventory = new Inventory({
        name: name,
        quantity: quantity,
        imageUrl: "images/" + filename
      });
      updatedInventory = await newInventory.save();
      User.findOne({ username: info.user.username })
        .then((user) => {
          if (!user.imageUrl) {
            User
              .findOneAndUpdate(
                { username: info.user.username },
                { $set: { imageUrl: 'images/' + filename } },
                { new: true }
              )
              .then((user) => {
                console.log('update', user);
              })
          }
        })

    } else {
      updatedInventory = await Inventory.findByIdAndUpdate(id, { name: name, quantity: quantity });
    }

    console.log('Inventory updated:', updatedInventory);
    res.json({ result: "OK" });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ error: "An error occurred while updating the inventory" });
  }
});



app.post('/get_inventory', async function (req, res) {
  const id = req.body.id;
  try {
    const inventory = await Inventory.findById(id);
    if (!inventory) {
      res.status(404).send(JSON.stringify({ error: "Inventory not found" }));
      return;
    }
    res.send(JSON.stringify({ result: inventory }));
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).send(JSON.stringify({ error: "An error occurred while fetching the inventory" }));
  }
});

app.post('/api/user/signup', async function (req, res) {
  const info = req.body;
  console.log(info)

  if (info.password.trim() == '' || info.password == undefined) {
    res.send(JSON.stringify({ isOk: false, error: 'Type your password correctly.' }))
    return;
  }

  if (info.username.trim() == '' || info.username == undefined) {
    res.send(JSON.stringify({ isOk: false, error: 'Type your username correctly.' }))
    return;
  }

  User
    .findOne({ username: info.username })
    .then((user) => {
      if (user) {
        res.send(JSON.stringify({ isOk: false, error: 'User already exists.' }))
        return;
      } else {


        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(info.password, salt, (err, password) => {
            if (password) {
              const user = {
                username: info.username,
                password: password,
                bio: 'Motivated UAlbany student with a passion for delivering to provide an experience that allows for the myself explore and experience life by giving the best projects and real work that is important for my success.',
                user: 'Gopichand'
              }

              const userInfo = new User(user);

              userInfo
                .save()
                .then(() => {
                  res.status(200).send(JSON.stringify({ isOk: true }));
                  return;
                })
                .catch((error) => {
                  console.error('Error User Signup:', error);
                  res.status(500).send(JSON.stringify({ error: "An error occurred while Sign Up user" }));
                })
            }
            else return;
          })
        })


      }
    })
    .catch((error) => {
      console.error('Error User Signup:', error);
      res.status(500).send(JSON.stringify({ error: "An error occurred while Sign Up user" }));
    })


})

app.post('/api/user/login', async function (req, res) {
  const info = req.body;

  if (info.password.trim() == '' || info.password == undefined) {
    res.send(JSON.stringify({ isOk: false, error: 'Type your password correctly.' }))
    return;
  }

  if (info.username.trim() == '' || info.username == undefined) {
    res.send(JSON.stringify({ isOk: false, error: 'Type your username correctly.' }))
    return;
  }

  User
    .findOne({ username: info.username })
    .then((user) => {
      if (!user) {
        res.send(JSON.stringify({ isOk: false, error: 'User not found.' }))
        return;
      } else {
        bcrypt.compare(info.password, user.password)
          .then((result) => {
            if (result) {
              const payload = { user: { username: info.username, password: info.password } };
              const token = jwt.sign(payload, jwt_secret, { expiresIn: 3600 });
              res.status(200).send(JSON.stringify({ isOk: true, token: token }));
              return;
            } else {
              res.send(JSON.stringify({ isOk: false, error: 'Password incorrect.' }))
              return;
            }
          })
          .catch((error) => {
            console.error('Error User Login:', error);
            res.status(500).send(JSON.stringify({ error: "An error occurred while Login user" }));
          })
      }

    })
})

app.post('/api/userinfo', (req, res) => {
  const token = req.body.token;

  if (!token) {
    res.send(JSON.stringify({ isOk: false, error: 'No token' }));
    return;
  } else {
    jwt.verify(token, jwt_secret, (err, decoded) => {
      if (err) console.log(err);
      User
        .findOne({ username: decoded.user.username })
        .then((user) => {
          if (user) {
            res.status(200).send(JSON.stringify({ isOk: true, username: user.username, password: decoded.user.password, bio: user.bio, user: user.user }));
            return;
          } else {
            res.send(JSON.stringify({ isOk: false, error: 'Invalid token.' }))
            return;
          }
        })
        .catch((error) => {
          console.error('Error User Info:', error);
          res.status(500).send(JSON.stringify({ error: "An error occurred while getting user data" }));
        })
    });
  }
})

app.post('/api/save_userinfo', (req, res) => {
  const info = req.body;

  const origin = jwt.verify(info.token, jwt_secret);

  console.log(origin)

  User
    .findOneAndUpdate(
      { username: origin.user.username },
      { $set: { bio: info.bio, user: info.username } },
      { new: true }
    )
    .then((user) => {
      const token = jwt.sign({ user: { username: user.username, password: origin.user.password } }, jwt_secret, { expiresIn: 3600 });

      console.log(jwt.verify(token, jwt_secret))

      res.send(JSON.stringify({ token: token, isOk: true }))
    })
})


app.listen(6001, () =>
  console.log('Express server is running on localhost:6001')
);

app.get('/', function (req, res) {
  res.send('Welcome to the backend server!');
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});